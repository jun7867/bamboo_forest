import { getSupabaseClient } from './supabase'
import type {
  CloseCoffeeRoundInput,
  CoffeeEntry,
  CoffeeHistory,
  CoffeeHistoryRange,
  CoffeeRankingRow,
  CoffeeRound,
  CoffeeSnapshot,
  CreateCoffeeRoundInput,
  UpsertCoffeeEntryInput,
  WithdrawCoffeeEntryInput,
} from '../types/coffee'

// 열린 판은 하나뿐이라 가장 최근 판(열린 판이거나 막 닫힌 판)만 받는다
const ROUND_FETCH_LIMIT = 1
const CHECK_VIOLATION_CODE = '23514'
const UNIQUE_VIOLATION_CODE = '23505'

export interface CoffeeDrawSource {
  fetchSnapshot: () => Promise<CoffeeSnapshot>
  createRound: (input: CreateCoffeeRoundInput) => Promise<CoffeeRound>
  upsertEntry: (input: UpsertCoffeeEntryInput) => Promise<CoffeeEntry>
  withdrawEntry: (input: WithdrawCoffeeEntryInput) => Promise<void>
  closeRound: (input: CloseCoffeeRoundInput) => Promise<CoffeeRound>
  // 기간 안에 마감된 판들의 사람별 누적 순위
  fetchHistory: (range: CoffeeHistoryRange) => Promise<CoffeeHistory>
  // 다른 사람의 변경을 알린다. 반환값은 구독 해제 함수
  subscribe: (onChange: () => void) => () => void
}

interface CoffeeRoundRow {
  id: string
  title: string
  status: CoffeeRound['status']
  first_pick_entry_id: string | null
  second_pick_entry_id: string | null
  unit_amount: number
  participant_count: number | null
  pay_amount: number | null
  created_at: string
  closed_at: string | null
}

interface CoffeeRankingRpcRow {
  client_key: string
  nickname: string
  // bigint라 문자열로 올 수도 있어 숫자로 바꿔 쓴다
  paid_amount: number | string
  paid_count: number
  fetch_count: number
  join_count: number
}

interface CoffeeEntryRow {
  id: string
  round_id: string
  client_key: string
  nickname: string
  menu: string
  created_at: string
  updated_at: string
}

const ROUND_COLUMNS =
  'id, title, status, first_pick_entry_id, second_pick_entry_id, unit_amount, participant_count, pay_amount, created_at, closed_at'
const ENTRY_COLUMNS = 'id, round_id, client_key, nickname, menu, created_at, updated_at'

function mapCoffeeRound(row: CoffeeRoundRow): CoffeeRound {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    firstPickEntryId: row.first_pick_entry_id,
    secondPickEntryId: row.second_pick_entry_id,
    unitAmount: row.unit_amount,
    participantCount: row.participant_count,
    payAmount: row.pay_amount,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  }
}

function mapCoffeeRankingRow(row: CoffeeRankingRpcRow): CoffeeRankingRow {
  return {
    clientKey: row.client_key,
    nickname: row.nickname,
    paidAmount: Number(row.paid_amount),
    paidCount: row.paid_count,
    fetchCount: row.fetch_count,
    joinCount: row.join_count,
  }
}

function mapCoffeeEntry(row: CoffeeEntryRow): CoffeeEntry {
  return {
    id: row.id,
    roundId: row.round_id,
    clientKey: row.client_key,
    nickname: row.nickname,
    menu: row.menu,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  ROUND_NOT_FOUND: '판을 찾을 수 없어요.',
  ROUND_CLOSED: '이미 마감된 판이에요.',
  ROUND_ALREADY_OPEN: '이미 열린 판이 있어요.',
  INVALID_PASSWORD: '비밀번호가 맞지 않아요.',
  INVALID_SECRET: '다시 시도해 주세요.',
}

export function mapCoffeeError(error: { message?: string; code?: string } | null, fallbackMessage: string) {
  if (!error?.message) {
    return fallbackMessage
  }

  const code = Object.keys(ERROR_MESSAGES).find((key) => error.message?.includes(key))

  if (code) {
    return ERROR_MESSAGES[code]
  }

  if (error.code === UNIQUE_VIOLATION_CODE && error.message.includes('coffee_rounds')) {
    return ERROR_MESSAGES.ROUND_ALREADY_OPEN
  }

  if (error.code === CHECK_VIOLATION_CODE) {
    if (error.message.includes('nickname')) {
      return '닉네임은 1~20자로 적어 주세요.'
    }

    if (error.message.includes('menu')) {
      return '메뉴는 1~40자로 적어 주세요.'
    }

    if (error.message.includes('title')) {
      return '판 이름은 1~40자로 적어 주세요.'
    }

    return '입력한 값이 허용 범위를 벗어났어요.'
  }

  return fallbackMessage
}

function getSingleRow<T>(data: T[] | null, fallbackMessage: string) {
  const row = data?.[0]

  if (!row) {
    throw new Error(fallbackMessage)
  }

  return row
}

export const coffeeDrawSource: CoffeeDrawSource = {
  fetchSnapshot: async () => {
    const client = getSupabaseClient()
    const { data: roundRows, error: roundsError } = await client
      .from('coffee_rounds')
      .select(ROUND_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(ROUND_FETCH_LIMIT)

    if (roundsError) {
      throw new Error(mapCoffeeError(roundsError, '커피 내기 판을 불러오지 못했어요.'))
    }

    const rounds = ((roundRows as CoffeeRoundRow[] | null) ?? []).map(mapCoffeeRound)

    if (rounds.length === 0) {
      return { rounds, entries: [] }
    }

    const { data: entryRows, error: entriesError } = await client
      .from('coffee_entries')
      .select(ENTRY_COLUMNS)
      .in(
        'round_id',
        rounds.map((round) => round.id),
      )

    if (entriesError) {
      throw new Error(mapCoffeeError(entriesError, '응답 현황을 불러오지 못했어요.'))
    }

    return {
      rounds,
      entries: ((entryRows as CoffeeEntryRow[] | null) ?? []).map(mapCoffeeEntry),
    }
  },
  createRound: async (input) => {
    const { data, error } = await getSupabaseClient().rpc('create_coffee_round', {
      p_title: input.title,
      p_host_secret: input.hostSecret,
    })

    if (error) {
      throw new Error(mapCoffeeError(error, '새 판을 열지 못했어요.'))
    }

    return mapCoffeeRound(getSingleRow(data as CoffeeRoundRow[] | null, '새 판을 열지 못했어요.'))
  },
  upsertEntry: async (input) => {
    const { data, error } = await getSupabaseClient().rpc('upsert_coffee_entry', {
      p_round_id: input.roundId,
      p_client_secret: input.clientSecret,
      p_nickname: input.nickname,
      p_menu: input.menu,
    })

    if (error) {
      throw new Error(mapCoffeeError(error, '참가하지 못했어요.'))
    }

    return mapCoffeeEntry(getSingleRow(data as CoffeeEntryRow[] | null, '참가하지 못했어요.'))
  },
  withdrawEntry: async (input) => {
    const { error } = await getSupabaseClient().rpc('withdraw_coffee_entry', {
      p_round_id: input.roundId,
      p_client_secret: input.clientSecret,
    })

    if (error) {
      throw new Error(mapCoffeeError(error, '참가를 취소하지 못했어요.'))
    }
  },
  closeRound: async (input) => {
    const { data, error } = await getSupabaseClient().rpc('close_coffee_round', {
      p_round_id: input.roundId,
      p_secret: input.secret,
    })

    if (error) {
      throw new Error(mapCoffeeError(error, '마감하지 못했어요.'))
    }

    return mapCoffeeRound(getSingleRow(data as CoffeeRoundRow[] | null, '마감하지 못했어요.'))
  },
  fetchHistory: async (range) => {
    const { data, error } = await getSupabaseClient().rpc('get_coffee_ranking', {
      p_from: range.from,
      p_to: range.to,
    })

    if (error) {
      throw new Error(mapCoffeeError(error, '누적 순위를 불러오지 못했어요.'))
    }

    return { ranking: ((data as CoffeeRankingRpcRow[] | null) ?? []).map(mapCoffeeRankingRow) }
  },
  subscribe: (onChange) => {
    const client = getSupabaseClient()
    const channel = client
      .channel('coffee-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_rounds' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_entries' }, onChange)
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  },
}
