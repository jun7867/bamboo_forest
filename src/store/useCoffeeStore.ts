import { create } from 'zustand'
import { coffeeDrawSource } from '../lib/coffeeDraw'
import {
  createCoffeeSecret,
  getCoffeeDeviceSecret,
  getCoffeeHostRoundIds,
  getCoffeeHostSecret,
  hashCoffeeSecret,
  rememberCoffeeHostSecret,
  saveCoffeeNickname,
} from '../lib/coffeeIdentity'
import {
  COFFEE_MENU_MAX_LENGTH,
  COFFEE_NICKNAME_MAX_LENGTH,
  COFFEE_TITLE_MAX_LENGTH,
  normalizeCoffeeMenu,
} from '../lib/coffeeOrders'
import { getCurrentKstMonth, getHistoryPeriodKey, getHistoryRange } from '../lib/coffeeRanking'
import { formatShortDate } from '../lib/format'
import { isSupabaseConfigured } from '../lib/supabase'
import type { CoffeeEntry, CoffeeHistory, CoffeeHistoryPeriod, CoffeeRound } from '../types/coffee'

// 마감 직후에 들어온 사람에게도 추첨 연출을 보여주는 기준 시간
const REVEAL_WINDOW_MS = 60_000

export interface CoffeeEntryStatus {
  // 다른 사람이 새 판을 열었을 때 이전 판의 안내가 새 판 카드에 남지 않도록 어느 판의 결과인지 함께 둔다
  roundId: string
  tone: 'success' | 'error'
  message: string
}

interface MutationResult {
  ok: boolean
  message?: string
}

export interface SubmitCoffeeEntryInput {
  roundId: string
  nickname: string
  menu: string
}

interface CoffeeStore {
  rounds: CoffeeRound[]
  entries: CoffeeEntry[]
  myClientKey: string | null
  hostRoundIds: string[]
  isLoading: boolean
  hasLoaded: boolean
  loadError: string | null
  isSubmitting: boolean
  isWithdrawing: boolean
  isClosing: boolean
  isOpening: boolean
  entryStatus: CoffeeEntryStatus | null
  revealRoundId: string | null
  historyPeriod: CoffeeHistoryPeriod
  history: CoffeeHistory | null
  // history가 어느 기간의 결과인지. 기간을 바꾼 직후 이전 기간 결과를 새 기간처럼 보여주지 않게 비교한다
  historyPeriodKey: string | null
  isHistoryLoading: boolean
  historyError: string | null
  loadSnapshot: () => Promise<void>
  loadHistory: () => Promise<void>
  setHistoryPeriod: (period: CoffeeHistoryPeriod) => void
  openRound: (title: string) => Promise<MutationResult>
  submitEntry: (input: SubmitCoffeeEntryInput) => Promise<MutationResult>
  withdrawEntry: (roundId: string) => Promise<MutationResult>
  closeRound: (roundId: string, adminPassword?: string) => Promise<MutationResult>
  finishReveal: (roundId: string) => void
}

let latestLoadRequestId = 0
let latestHistoryRequestId = 0
// 순위는 판이 닫히거나 새로 열릴 때만 바뀌어서, 가장 최근 판의 id·상태가 바뀔 때만 다시 받는다
let lastHistorySignature: string | null = null
// 추첨 연출 중에 순위가 먼저 바뀌면 결과가 미리 드러나서, 연출이 끝날 때까지 미뤄 둔다
let isHistoryDeferred = false
// 이 화면에서 열린 상태로 본 판은 마감 시각과 관계없이 결과 연출을 보여준다
const seenOpenRoundIds = new Set<string>()
const revealCheckedRoundIds = new Set<string>()

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

function sortRoundsByLatest(rounds: CoffeeRound[]) {
  return [...rounds].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  return items.some((item) => item.id === nextItem.id)
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem]
}

// 최신 판이 막 닫혔으면 연출할 판 id를 돌려준다. 같은 판은 한 번만 연출한다
function detectReveal(rounds: CoffeeRound[], currentRevealId: string | null) {
  const latest = rounds[0]

  if (!latest) {
    return currentRevealId
  }

  if (latest.status === 'open') {
    seenOpenRoundIds.add(latest.id)
    return currentRevealId
  }

  if (revealCheckedRoundIds.has(latest.id)) {
    return currentRevealId
  }

  revealCheckedRoundIds.add(latest.id)

  // 참가자 없이 닫힌 판은 뽑은 사람이 없어 연출하지 않는다
  if (!latest.firstPickEntryId) {
    return currentRevealId
  }

  const elapsed = latest.closedAt ? Date.now() - Date.parse(latest.closedAt) : Number.NaN
  // 기기 시계가 서버와 조금 어긋나도 막 닫힌 판으로 보도록 절댓값으로 비교한다
  const isFresh = seenOpenRoundIds.has(latest.id) || Math.abs(elapsed) < REVEAL_WINDOW_MS

  return isFresh ? latest.id : currentRevealId
}

function validateEntryInput(input: SubmitCoffeeEntryInput) {
  const nickname = input.nickname.trim()
  const menu = normalizeCoffeeMenu(input.menu)

  if (nickname.length < 1 || nickname.length > COFFEE_NICKNAME_MAX_LENGTH) {
    return `닉네임은 1~${COFFEE_NICKNAME_MAX_LENGTH}자로 적어 주세요.`
  }

  if (menu.length < 1 || menu.length > COFFEE_MENU_MAX_LENGTH) {
    return menu ? `메뉴는 ${COFFEE_MENU_MAX_LENGTH}자까지 적을 수 있어요.` : '메뉴를 적어 주세요.'
  }

  return null
}

export const useCoffeeStore = create<CoffeeStore>((set, get) => ({
  rounds: [],
  entries: [],
  myClientKey: null,
  hostRoundIds: getCoffeeHostRoundIds(),
  isLoading: false,
  hasLoaded: false,
  loadError: null,
  isSubmitting: false,
  isWithdrawing: false,
  isClosing: false,
  isOpening: false,
  entryStatus: null,
  revealRoundId: null,
  historyPeriod: getCurrentKstMonth(),
  history: null,
  historyPeriodKey: null,
  isHistoryLoading: false,
  historyError: null,
  loadSnapshot: async () => {
    const requestId = ++latestLoadRequestId

    if (!isSupabaseConfigured) {
      set({ isLoading: false, loadError: 'Supabase 연결 전이라 커피 내기를 쓸 수 없어요.' })
      return
    }

    if (!get().hasLoaded) {
      set({ isLoading: true, loadError: null })
    }

    try {
      const [snapshot, myClientKey] = await Promise.all([
        coffeeDrawSource.fetchSnapshot(),
        get().myClientKey ?? hashCoffeeSecret(getCoffeeDeviceSecret()),
      ])

      if (requestId !== latestLoadRequestId) {
        return
      }

      const rounds = sortRoundsByLatest(snapshot.rounds)

      set((state) => ({
        rounds,
        entries: snapshot.entries,
        myClientKey: state.myClientKey ?? myClientKey,
        hostRoundIds: getCoffeeHostRoundIds(),
        revealRoundId: detectReveal(rounds, state.revealRoundId),
        isLoading: false,
        hasLoaded: true,
        loadError: null,
      }))

      const latest = rounds[0]
      const historySignature = latest ? `${latest.id}:${latest.status}` : 'none'

      if (historySignature !== lastHistorySignature) {
        lastHistorySignature = historySignature
        void get().loadHistory()
      }
    } catch (error) {
      if (requestId !== latestLoadRequestId) {
        return
      }

      // 이미 화면을 보여주는 중이면 유지하고 다음 동기화 때 다시 시도한다
      if (get().hasLoaded) {
        return
      }

      set({
        isLoading: false,
        loadError: getErrorMessage(error, '커피 내기 정보를 불러오지 못했어요.'),
      })
    }
  },
  openRound: async (title) => {
    // 이름을 비워 두면 날짜로 판 이름을 대신 붙인다
    const nextTitle = title.trim() || `${formatShortDate(new Date().toISOString())} 커피 내기`

    if (nextTitle.length > COFFEE_TITLE_MAX_LENGTH) {
      return { ok: false, message: `판 이름은 ${COFFEE_TITLE_MAX_LENGTH}자까지 적을 수 있어요.` }
    }

    const hostSecret = createCoffeeSecret()

    set({ isOpening: true })

    try {
      const round = await coffeeDrawSource.createRound({ title: nextTitle, hostSecret })

      rememberCoffeeHostSecret(round.id, hostSecret)
      set((state) => {
        const rounds = sortRoundsByLatest(upsertById(state.rounds, round))

        return {
          rounds,
          // 저장에 실패했으면 방장 버튼 대신 관리자 비밀번호 마감이 보이도록 저장소 기준으로 다시 읽는다
          hostRoundIds: getCoffeeHostRoundIds(),
          revealRoundId: detectReveal(rounds, state.revealRoundId),
          entryStatus: null,
          isOpening: false,
        }
      })
      // 요청 전에 출발한 재조회 응답이 방금 연 판을 덮지 않게 새 재조회로 앞선 응답을 무효로 만든다
      void get().loadSnapshot()

      return { ok: true }
    } catch (error) {
      set({ isOpening: false })
      // 다른 사람이 먼저 판을 열었을 수 있어 최신 상태로 맞춘다
      void get().loadSnapshot()

      return { ok: false, message: getErrorMessage(error, '새 판을 열지 못했어요.') }
    }
  },
  submitEntry: async (input) => {
    const validationError = validateEntryInput(input)

    if (validationError) {
      set({ entryStatus: { roundId: input.roundId, tone: 'error', message: validationError } })
      return { ok: false, message: validationError }
    }

    const nickname = input.nickname.trim()

    saveCoffeeNickname(nickname)
    set({ isSubmitting: true, entryStatus: null })

    try {
      const entry = await coffeeDrawSource.upsertEntry({
        roundId: input.roundId,
        clientSecret: getCoffeeDeviceSecret(),
        nickname,
        menu: normalizeCoffeeMenu(input.menu),
      })

      set((state) => ({
        entries: upsertById(state.entries, entry),
        // crypto.subtle이 없어 해시를 못 구한 기기도 서버가 돌려준 키로 내 응답을 찾는다
        myClientKey: entry.clientKey,
        isSubmitting: false,
      }))
      void get().loadSnapshot()

      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, '참가하지 못했어요.')

      set({ isSubmitting: false, entryStatus: { roundId: input.roundId, tone: 'error', message } })
      void get().loadSnapshot()

      return { ok: false, message }
    }
  },
  withdrawEntry: async (roundId) => {
    set({ isWithdrawing: true, entryStatus: null })

    try {
      await coffeeDrawSource.withdrawEntry({ roundId, clientSecret: getCoffeeDeviceSecret() })

      set((state) => ({
        entries: state.entries.filter(
          (entry) => !(entry.roundId === roundId && entry.clientKey === state.myClientKey),
        ),
        isWithdrawing: false,
      }))
      void get().loadSnapshot()

      return { ok: true }
    } catch (error) {
      const message = getErrorMessage(error, '참가를 취소하지 못했어요.')

      set({ isWithdrawing: false, entryStatus: { roundId, tone: 'error', message } })
      void get().loadSnapshot()

      return { ok: false, message }
    }
  },
  closeRound: async (roundId, adminPassword) => {
    const secret = adminPassword ?? getCoffeeHostSecret(roundId)

    if (!secret?.trim()) {
      return { ok: false, message: '관리자 비밀번호를 입력해 주세요.' }
    }

    set({ isClosing: true })

    try {
      const closedRound = await coffeeDrawSource.closeRound({ roundId, secret })

      set((state) => {
        const rounds = sortRoundsByLatest(upsertById(state.rounds, closedRound))

        return {
          rounds,
          revealRoundId: detectReveal(rounds, state.revealRoundId),
          isClosing: false,
        }
      })
      void get().loadSnapshot()

      return { ok: true }
    } catch (error) {
      set({ isClosing: false })
      void get().loadSnapshot()

      return { ok: false, message: getErrorMessage(error, '마감하지 못했어요.') }
    }
  },
  loadHistory: async () => {
    if (get().revealRoundId) {
      isHistoryDeferred = true
      return
    }

    isHistoryDeferred = false

    const requestId = ++latestHistoryRequestId
    const period = get().historyPeriod

    set({ isHistoryLoading: true })

    try {
      const history = await coffeeDrawSource.fetchHistory(getHistoryRange(period))

      // 기간을 연달아 바꾸면 마지막으로 고른 기간의 응답만 반영한다
      if (requestId !== latestHistoryRequestId) {
        return
      }

      set({
        history,
        historyPeriodKey: getHistoryPeriodKey(period),
        isHistoryLoading: false,
        historyError: null,
      })
    } catch (error) {
      if (requestId !== latestHistoryRequestId) {
        return
      }

      set({
        isHistoryLoading: false,
        historyError: getErrorMessage(error, '누적 순위를 불러오지 못했어요.'),
      })
    }
  },
  setHistoryPeriod: (period) => {
    if (getHistoryPeriodKey(period) === getHistoryPeriodKey(get().historyPeriod)) {
      return
    }

    set({ historyPeriod: period })
    void get().loadHistory()
  },
  finishReveal: (roundId) => {
    if (get().revealRoundId !== roundId) {
      return
    }

    set({ revealRoundId: null })

    if (isHistoryDeferred) {
      void get().loadHistory()
    }
  },
}))
