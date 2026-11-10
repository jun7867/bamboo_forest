import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { CURRENT_SEASON, isInSeason } from '../../config/boardVersion'
import type { BoardSeason } from '../../config/boardVersion'
import { BOARD_CATEGORY_ORDER, BOARD_SORT_OPTION } from '../../constants/board'
import type { BoardSortOption } from '../../constants/board'
import { getBoardInsights, getWritingTrend } from '../../lib/boardInsights'
import {
  applyNotePriorityAction,
  getPriorityMoveAvailability,
} from '../../lib/boardOrdering'
import type { NotePriorityAction } from '../../lib/boardOrdering'
import { useBoardStore } from '../../store/useBoardStore'
import type { BoardCategory, BoardNote, CreateBoardNoteInput } from '../../types/board'
import { useBoardHotkeys } from './useBoardHotkeys'
import { useBoardSync } from './useBoardSync'

interface NoteMenuState {
  noteId: string
  x: number
  y: number
}

const MENU_SIZE = { width: 220, height: 300 }
const MENU_VIEWPORT_MARGIN = 12
const HIGHLIGHT_DURATION_MS = 3600
const LAST_VISIT_KEY_PREFIX = 'bamboo-last-visit:'

function clampMenuPosition(position: { x: number; y: number }) {
  return {
    x: Math.max(
      MENU_VIEWPORT_MARGIN,
      Math.min(position.x, window.innerWidth - MENU_SIZE.width - MENU_VIEWPORT_MARGIN),
    ),
    y: Math.max(
      MENU_VIEWPORT_MARGIN,
      Math.min(position.y, window.innerHeight - MENU_SIZE.height - MENU_VIEWPORT_MARGIN),
    ),
  }
}

function groupNotesByCategory(notes: BoardNote[]) {
  return BOARD_CATEGORY_ORDER.reduce<Record<BoardCategory, BoardNote[]>>(
    (accumulator, category) => {
      accumulator[category] = notes.filter((note) => note.category === category)
      return accumulator
    },
    { praise: [], suggestion: [], freeTalk: [], question: [] },
  )
}

function filterNotesByQuery(notes: BoardNote[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return notes
  }

  return notes.filter(
    (note) =>
      note.content.toLowerCase().includes(normalizedQuery) ||
      (note.author ?? '').toLowerCase().includes(normalizedQuery) ||
      (note.comments ?? []).some((comment) =>
        comment.content.toLowerCase().includes(normalizedQuery),
      ),
  )
}

function readLastVisit(storageKey: string) {
  try {
    const value = Number(window.localStorage.getItem(storageKey))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

// 지난 방문 이후 올라온 포스트잇에 NEW 표시를 하려고 방문 시각을 남긴다
function useLastVisit(seasonId: string) {
  const storageKey = `${LAST_VISIT_KEY_PREFIX}${seasonId}`
  const [previousVisitAt] = useState(() => readLastVisit(storageKey))

  useEffect(() => {
    function saveVisit() {
      try {
        window.localStorage.setItem(storageKey, String(Date.now()))
      } catch {
        // NEW 표시는 편의 기능이라 저장 실패는 무시한다
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        saveVisit()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', saveVisit)

    return () => {
      saveVisit()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', saveVisit)
    }
  }, [storageKey])

  return previousVisitAt
}

interface BoardControllerRefs {
  searchInputRef: RefObject<HTMLInputElement | null>
  boardTopRef: RefObject<HTMLDivElement | null>
}

export function useBoardController(
  season: BoardSeason,
  { searchInputRef, boardTopRef }: BoardControllerRefs,
) {
  const isArchive = season.id !== CURRENT_SEASON.id
  const notes = useBoardStore((state) => state.notes)
  const viewMode = useBoardStore((state) => state.viewMode)
  const isComposerOpen = useBoardStore((state) => state.isComposerOpen)
  const composerCategory = useBoardStore((state) => state.composerCategory)
  const isLoading = useBoardStore((state) => state.isLoading)
  const hasLoaded = useBoardStore((state) => state.hasLoaded)
  const loadError = useBoardStore((state) => state.loadError)
  const dataSource = useBoardStore((state) => state.dataSource)
  const setViewMode = useBoardStore((state) => state.setViewMode)
  const openComposer = useBoardStore((state) => state.openComposer)
  const closeComposer = useBoardStore((state) => state.closeComposer)
  const loadNotes = useBoardStore((state) => state.loadNotes)
  const addNote = useBoardStore((state) => state.addNote)
  const addComment = useBoardStore((state) => state.addComment)
  const toggleLike = useBoardStore((state) => state.toggleLike)
  const updateNote = useBoardStore((state) => state.updateNote)
  const deleteNote = useBoardStore((state) => state.deleteNote)
  const moveNote = useBoardStore((state) => state.moveNote)
  const reorderNotes = useBoardStore((state) => state.reorderNotes)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [focusedCategory, setFocusedCategory] = useState<BoardCategory | null>(null)
  const [menuState, setMenuState] = useState<NoteMenuState | null>(null)
  const [sortOption, setSortOption] = useState<BoardSortOption>(BOARD_SORT_OPTION.MANUAL)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null)
  const [isTownHallOpen, setIsTownHallOpen] = useState(false)
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false)
  const previousVisitAt = useLastVisit(season.id)

  useBoardSync(!isArchive)

  const seasonNotes = useMemo(
    () => notes.filter((note) => isInSeason(note.createdAt, season)),
    [notes, season],
  )
  const searchedNotes = useMemo(
    () => filterNotesByQuery(seasonNotes, searchQuery),
    [seasonNotes, searchQuery],
  )
  const notesByCategory = useMemo(() => groupNotesByCategory(searchedNotes), [searchedNotes])
  const insights = useMemo(() => getBoardInsights(seasonNotes), [seasonNotes])
  const writingTrend = useMemo(() => getWritingTrend(seasonNotes, season), [seasonNotes, season])

  const selectedNote = seasonNotes.find((note) => note.id === selectedNoteId) ?? null
  const menuNote = seasonNotes.find((note) => note.id === menuState?.noteId) ?? null
  // 순서 변경은 검색 결과가 아니라 회차 전체 순서를 기준으로 계산해야 다른 포스트잇 순서가 꼬이지 않는다
  const menuCategoryNotes = menuNote
    ? seasonNotes.filter((note) => note.category === menuNote.category)
    : []
  const menuAvailability = menuNote
    ? getPriorityMoveAvailability(menuCategoryNotes, menuNote.id)
    : { canMoveUp: false, canMoveDown: false }
  const categoryCounts = BOARD_CATEGORY_ORDER.reduce<Record<BoardCategory, number>>(
    (accumulator, category) => {
      accumulator[category] = notesByCategory[category].length
      return accumulator
    },
    { praise: 0, suggestion: 0, freeTalk: 0, question: 0 },
  )
  const visibleCategories = focusedCategory ? [focusedCategory] : BOARD_CATEGORY_ORDER
  const isModalOpen = isComposerOpen || selectedNote !== null || isTownHallOpen || isBirthdayOpen
  // 메뉴 대상 글이 동기화로 사라지면 메뉴도 닫힌 것으로 본다
  const isAnyOverlayOpen = isModalOpen || menuNote !== null

  // 작성창 열림 상태는 전역 스토어에 있어서, 보드를 떠날 때 닫아야 다시 들어왔을 때 저절로 열리지 않는다
  useEffect(() => closeComposer, [closeComposer])

  useEffect(() => {
    if (!highlightedNoteId) {
      return
    }

    const timer = window.setTimeout(() => setHighlightedNoteId(null), HIGHLIGHT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [highlightedNoteId])

  function handleCompose(category?: BoardCategory) {
    if (isArchive) {
      return
    }

    openComposer(category ?? focusedCategory ?? undefined)
  }

  // 불러오기 전에 열면 발표 순서 스냅샷이 비어서 공감순 정렬이 깨진다
  function handleOpenTownHall() {
    if (hasLoaded) {
      setIsTownHallOpen(true)
    }
  }

  async function handleSubmitNote(input: CreateBoardNoteInput) {
    const result = await addNote(input)

    if (result.ok && result.noteId) {
      setHighlightedNoteId(result.noteId)
      setSearchQuery('')
      setFocusedCategory((current) => (current && current !== input.category ? input.category : current))
    }

    return result
  }

  function handleOpenNote(note: BoardNote) {
    setSelectedNoteId(note.id)
    setMenuState(null)
  }

  function handleOpenMenu(note: BoardNote, position: { x: number; y: number }) {
    setMenuState({ noteId: note.id, ...clampMenuPosition(position) })
  }

  function handleSelectPriorityAction(action: NotePriorityAction) {
    if (!menuNote) {
      return
    }

    setMenuState(null)
    void reorderNotes(
      menuNote.category,
      applyNotePriorityAction(menuCategoryNotes, menuNote.id, action),
    )
  }

  function handleToggleFocus(category: BoardCategory) {
    setFocusedCategory((current) => (current === category ? null : category))
  }

  function handleSearchKeyword(keyword: string) {
    setSearchQuery(keyword)
    setFocusedCategory(null)
    boardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function isNewNote(note: BoardNote) {
    return (
      previousVisitAt !== null &&
      Boolean(note.createdAt) &&
      Date.parse(note.createdAt ?? '') > previousVisitAt
    )
  }

  useBoardHotkeys(
    {
      onCompose: isArchive ? undefined : () => handleCompose(),
      onFocusSearch: () => searchInputRef.current?.focus(),
      onOpenTownHall: handleOpenTownHall,
    },
    !isAnyOverlayOpen,
  )

  return {
    isArchive,
    isDemo: dataSource === 'demo',
    viewMode,
    setViewMode,
    isComposerOpen,
    composerCategory,
    closeComposer,
    isInitialLoading: isLoading && !hasLoaded,
    loadError,
    retryLoad: () => void loadNotes(true),
    seasonNotes,
    notesByCategory,
    categoryCounts,
    visibleCategories,
    insights,
    writingTrend,
    searchQuery,
    setSearchQuery,
    searchResultCount: searchedNotes.length,
    sortOption,
    setSortOption,
    focusedCategory,
    setFocusedCategory,
    highlightedNoteId,
    isNewNote,
    selectedNote,
    closeNote: () => setSelectedNoteId(null),
    openNoteById: setSelectedNoteId,
    menuState,
    menuNote,
    menuAvailability,
    closeMenu: () => setMenuState(null),
    isModalOpen,
    isTownHallReady: hasLoaded,
    isTownHallOpen,
    openTownHall: handleOpenTownHall,
    closeTownHall: () => setIsTownHallOpen(false),
    isBirthdayOpen,
    openBirthday: () => setIsBirthdayOpen(true),
    closeBirthday: () => setIsBirthdayOpen(false),
    handleCompose,
    handleSubmitNote,
    handleOpenNote,
    handleOpenMenu,
    handleSelectPriorityAction,
    handleToggleFocus,
    handleSearchKeyword,
    handleToggleLike: (noteId: string) => void toggleLike({ noteId }),
    toggleLike: (noteId: string) => toggleLike({ noteId }),
    addComment,
    updateNote,
    deleteNote,
    moveNote,
  }
}
