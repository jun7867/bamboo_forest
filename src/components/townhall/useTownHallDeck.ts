import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BOARD_CATEGORY_ORDER } from '../../constants/board'
import { lockBodyScroll } from '../../lib/scrollLock'
import type { BoardCategory, BoardNote } from '../../types/board'

export const TOWNHALL_ORDER = {
  LIKES: 'likes',
  CATEGORY: 'category',
  RANDOM: 'random',
} as const

export type TownHallOrder = (typeof TOWNHALL_ORDER)[keyof typeof TOWNHALL_ORDER]

export const TOWNHALL_ORDER_LABEL: Record<TownHallOrder, string> = {
  likes: '공감 많은 순',
  category: '카테고리 순',
  random: '무작위 순',
}

export const SLIDE_KIND = {
  INTRO: 'intro',
  NOTE: 'note',
  OUTRO: 'outro',
} as const

export type TownHallFilter = BoardCategory | 'all'

export type TownHallSlide =
  | { key: string; kind: typeof SLIDE_KIND.INTRO }
  | { key: string; kind: typeof SLIDE_KIND.NOTE; note: BoardNote }
  | { key: string; kind: typeof SLIDE_KIND.OUTRO }

interface TownHallDeckOptions {
  notes: BoardNote[]
  seasonId: string
  onClose: () => void
}

const INTRO_SLIDE: TownHallSlide = { key: 'intro', kind: SLIDE_KIND.INTRO }
const OUTRO_SLIDE: TownHallSlide = { key: 'outro', kind: SLIDE_KIND.OUTRO }
const DISCUSSED_KEY_PREFIX = 'bamboo-townhall-discussed:'
const INITIAL_SHUFFLE_SEED = 'bamboo'
const DRAW_STEP_COUNT = 16
const DRAW_LANDING_DELAY_MS = 450
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const TOGGLE_CODES = new Set(['KeyR', 'KeyD', 'KeyF', 'KeyC'])

function isActivatableTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest('button, a, [role="tab"]') !== null
}

function hashString(value: string) {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

function getCreatedAtValue(note: BoardNote) {
  return note.createdAt ? Date.parse(note.createdAt) : 0
}

function compareByReaction(left: BoardNote, right: BoardNote) {
  return (
    (right.likesCount ?? 0) - (left.likesCount ?? 0) ||
    (right.comments?.length ?? 0) - (left.comments?.length ?? 0) ||
    getCreatedAtValue(left) - getCreatedAtValue(right)
  )
}

// 무작위 순서도 시드와 id 해시로 정해서, 발표 도중 새 글이 와도 기존 순서가 흔들리지 않는다
function computeOrderedIds(
  notes: BoardNote[],
  order: TownHallOrder,
  filter: TownHallFilter,
  seed: string,
) {
  const filteredNotes = filter === 'all' ? notes : notes.filter((note) => note.category === filter)
  const sortedNotes = [...filteredNotes]

  if (order === TOWNHALL_ORDER.LIKES) {
    sortedNotes.sort(compareByReaction)
  }

  if (order === TOWNHALL_ORDER.CATEGORY) {
    sortedNotes.sort(
      (left, right) =>
        BOARD_CATEGORY_ORDER.indexOf(left.category) - BOARD_CATEGORY_ORDER.indexOf(right.category) ||
        compareByReaction(left, right),
    )
  }

  if (order === TOWNHALL_ORDER.RANDOM) {
    sortedNotes.sort(
      (left, right) => hashString(`${seed}:${left.id}`) - hashString(`${seed}:${right.id}`),
    )
  }

  return sortedNotes.map((note) => note.id)
}

function readDiscussedIds(seasonId: string) {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(`${DISCUSSED_KEY_PREFIX}${seasonId}`) ?? '[]',
    )
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function writeDiscussedIds(seasonId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(`${DISCUSSED_KEY_PREFIX}${seasonId}`, JSON.stringify([...ids]))
  } catch {
    // 진행 기록은 이 기기 편의 기능이라 저장 실패는 넘어간다
  }
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function useTownHallDeck({ notes, seasonId, onClose }: TownHallDeckOptions) {
  const [filter, setFilter] = useState<TownHallFilter>('all')
  const [order, setOrder] = useState<TownHallOrder>(TOWNHALL_ORDER.LIKES)
  const [shuffleSeed, setShuffleSeed] = useState(INITIAL_SHUFFLE_SEED)
  // 발표 중 공감 수가 바뀌어도 순서가 요동치지 않도록 정렬 결과를 고정해 둔다
  const [orderedIds, setOrderedIds] = useState(() =>
    computeOrderedIds(notes, TOWNHALL_ORDER.LIKES, 'all', INITIAL_SHUFFLE_SEED),
  )
  const [currentKey, setCurrentKey] = useState(INTRO_SLIDE.key)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [discussedIds, setDiscussedIds] = useState(() => readDiscussedIds(seasonId))
  const [drawPreviewId, setDrawPreviewId] = useState<string | null>(null)
  const [celebrateKey, setCelebrateKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const [isCommentsVisible, setIsCommentsVisible] = useState(true)
  const drawTimersRef = useRef<number[]>([])

  const deckNotes = useMemo(() => {
    const notesById = new Map(notes.map((note) => [note.id, note]))
    const orderedIdSet = new Set(orderedIds)
    const orderedNotes = orderedIds.flatMap((id) => {
      const note = notesById.get(id)
      return note ? [note] : []
    })
    // 발표 중에 새로 올라온 포스트잇은 맨 뒤에 이어 붙인다
    const arrivedNotes = notes.filter(
      (note) => !orderedIdSet.has(note.id) && (filter === 'all' || note.category === filter),
    )

    return orderedNotes.concat(arrivedNotes)
  }, [notes, orderedIds, filter])

  const slides = useMemo<TownHallSlide[]>(
    () => [
      INTRO_SLIDE,
      ...deckNotes.map((note) => ({ key: note.id, kind: SLIDE_KIND.NOTE, note })),
      OUTRO_SLIDE,
    ],
    [deckNotes],
  )

  const foundIndex = slides.findIndex((slide) => slide.key === currentKey)
  const currentIndex = foundIndex === -1 ? 0 : foundIndex
  const currentSlide = slides[currentIndex]
  const drawPreviewNote = deckNotes.find((note) => note.id === drawPreviewId) ?? null
  const isDrawing = drawPreviewId !== null
  const discussedCount = deckNotes.filter((note) => discussedIds.has(note.id)).length

  function clearDrawTimers() {
    drawTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    drawTimersRef.current.length = 0
  }

  function goTo(index: number, nextDirection: 1 | -1) {
    if (isDrawing) {
      return
    }

    const boundedIndex = Math.min(Math.max(index, 0), slides.length - 1)
    setDirection(nextDirection)
    setCurrentKey(slides[boundedIndex].key)
  }

  function changeFilter(nextFilter: TownHallFilter) {
    const nextIds = computeOrderedIds(notes, order, nextFilter, shuffleSeed)

    clearDrawTimers()
    setDrawPreviewId(null)
    setFilter(nextFilter)
    setOrderedIds(nextIds)
    setDirection(1)
    setCurrentKey(nextIds[0] ?? INTRO_SLIDE.key)
  }

  function changeOrder(nextOrder: TownHallOrder) {
    const nextSeed = nextOrder === TOWNHALL_ORDER.RANDOM ? String(Math.random()) : shuffleSeed

    setShuffleSeed(nextSeed)
    setOrder(nextOrder)
    setOrderedIds(computeOrderedIds(notes, nextOrder, filter, nextSeed))
  }

  function toggleDiscussed(noteId: string) {
    const nextIds = new Set(discussedIds)

    if (nextIds.has(noteId)) {
      nextIds.delete(noteId)
    } else {
      nextIds.add(noteId)
    }

    writeDiscussedIds(seasonId, nextIds)
    setDiscussedIds(nextIds)
  }

  function resetDiscussed() {
    const emptyIds = new Set<string>()

    writeDiscussedIds(seasonId, emptyIds)
    setDiscussedIds(emptyIds)
  }

  // 아직 다루지 않은 포스트잇 중에서 슬롯머신처럼 굴리다가 하나를 뽑는다
  function drawRandom() {
    if (isDrawing) {
      return
    }

    const undiscussedNotes = deckNotes.filter(
      (note) => !discussedIds.has(note.id) && note.id !== currentKey,
    )
    const pool =
      undiscussedNotes.length > 0
        ? undiscussedNotes
        : deckNotes.filter((note) => note.id !== currentKey)

    if (pool.length === 0) {
      return
    }

    const pickedNote = pickRandom(pool)
    let elapsed = 0

    clearDrawTimers()
    setDrawPreviewId(pickRandom(pool).id)

    for (let step = 0; step < DRAW_STEP_COUNT; step += 1) {
      const progress = step / (DRAW_STEP_COUNT - 1)
      const previewId = step === DRAW_STEP_COUNT - 1 ? pickedNote.id : pickRandom(pool).id

      elapsed += 55 + progress * progress * 300
      drawTimersRef.current.push(window.setTimeout(() => setDrawPreviewId(previewId), elapsed))
    }

    drawTimersRef.current.push(
      window.setTimeout(() => {
        setDrawPreviewId(null)
        setDirection(1)
        setCurrentKey(pickedNote.id)
        setCelebrateKey((current) => current + 1)
      }, elapsed + DRAW_LANDING_DELAY_MS),
    )
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
      return
    }

    void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const actions = {
    next: () => goTo(currentIndex + 1, 1),
    prev: () => goTo(currentIndex - 1, -1),
    goToStart: () => goTo(0, -1),
    goToEnd: () => goTo(slides.length - 1, 1),
    changeFilter,
    changeOrder,
    reshuffle: () => changeOrder(TOWNHALL_ORDER.RANDOM),
    toggleDiscussed,
    resetDiscussed,
    drawRandom,
    toggleFullscreen,
    toggleComments: () => setIsCommentsVisible((current) => !current),
    close: onClose,
  }
  const actionsRef = useRef(actions)
  const currentSlideRef = useRef(currentSlide)

  useLayoutEffect(() => {
    actionsRef.current = actions
    currentSlideRef.current = currentSlide
  })

  useEffect(() => {
    const timers = drawTimersRef.current

    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    // 한글 입력 상태에서도 단축키가 먹도록 물리 키(event.code)로 판단한다
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        (target instanceof HTMLElement && EDITABLE_TAGS.has(target.tagName))
      ) {
        return
      }

      // 키를 누르고 있으면 토글이 연타돼 상태가 매번 달라지므로 첫 입력만 받는다
      if (event.repeat && TOGGLE_CODES.has(event.code)) {
        return
      }

      // Tab으로 버튼에 포커스를 둔 경우 Space는 그 버튼을 누르는 키다
      if (event.code === 'Space' && isActivatableTarget(target)) {
        return
      }

      const latestActions = actionsRef.current
      const slide = currentSlideRef.current
      const handledCodes: Record<string, () => void> = {
        ArrowRight: latestActions.next,
        PageDown: latestActions.next,
        Space: latestActions.next,
        ArrowLeft: latestActions.prev,
        PageUp: latestActions.prev,
        Home: latestActions.goToStart,
        End: latestActions.goToEnd,
        KeyR: latestActions.drawRandom,
        KeyF: latestActions.toggleFullscreen,
        KeyC: latestActions.toggleComments,
        Escape: latestActions.close,
      }

      if (event.code === 'KeyD' && slide.kind === SLIDE_KIND.NOTE) {
        event.preventDefault()
        latestActions.toggleDiscussed(slide.note.id)
        return
      }

      const handler = handledCodes[event.code]

      if (handler) {
        event.preventDefault()
        handler()
      }
    }

    const unlockBodyScroll = lockBodyScroll()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.length = 0
      unlockBodyScroll()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)

      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [])

  return {
    filter,
    order,
    slides,
    deckNotes,
    currentIndex,
    currentSlide,
    direction,
    discussedIds,
    discussedCount,
    drawPreviewNote,
    isDrawing,
    celebrateKey,
    isFullscreen,
    isCommentsVisible,
    actions,
  }
}
