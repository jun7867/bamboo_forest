import { BOARD_SORT_OPTION } from '../constants/board'
import type { BoardSortOption } from '../constants/board'
import type { BoardCategory, BoardNote, ReorderBoardNoteItem } from '../types/board'

export type NotePriorityAction = 'togglePin' | 'moveTop' | 'moveUp' | 'moveDown' | 'moveBottom'

export const SORT_RANK_STEP = 1024

function getCreatedAtValue(createdAt?: string) {
  if (!createdAt) {
    return 0
  }

  const timestamp = Date.parse(createdAt)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function compareNotesBySharedOrder(
  left: Pick<BoardNote, 'id' | 'isPinned' | 'sortRank' | 'createdAt'>,
  right: Pick<BoardNote, 'id' | 'isPinned' | 'sortRank' | 'createdAt'>,
) {
  if (left.isPinned !== right.isPinned) {
    return left.isPinned ? -1 : 1
  }

  if (left.sortRank !== right.sortRank) {
    return left.sortRank - right.sortRank
  }

  const createdAtDiff = getCreatedAtValue(left.createdAt) - getCreatedAtValue(right.createdAt)

  if (createdAtDiff !== 0) {
    return createdAtDiff
  }

  return left.id.localeCompare(right.id)
}

export function sortNotesBySharedOrder<
  T extends Pick<BoardNote, 'id' | 'isPinned' | 'sortRank' | 'createdAt'>,
>(notes: T[]) {
  return [...notes].sort(compareNotesBySharedOrder)
}

export function getNextSortRank(
  notes: Pick<BoardNote, 'category' | 'isPinned' | 'sortRank'>[],
  category: BoardCategory,
  isPinned = false,
) {
  const maxSortRank = notes.reduce((currentMax, note) => {
    if (note.category !== category || note.isPinned !== isPinned) {
      return currentMax
    }

    return Math.max(currentMax, note.sortRank)
  }, 0)

  return maxSortRank + SORT_RANK_STEP
}

function toSequentialItems(
  notes: Pick<BoardNote, 'id' | 'isPinned'>[],
  isPinned: boolean,
): ReorderBoardNoteItem[] {
  return notes.map((note, index) => ({
    id: note.id,
    isPinned,
    sortRank: (index + 1) * SORT_RANK_STEP,
  }))
}

function moveWithinSection<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length) {
    return items
  }

  const boundedIndex = Math.min(Math.max(toIndex, 0), items.length - 1)
  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)

  nextItems.splice(boundedIndex, 0, movedItem)
  return nextItems
}

export function applyNotePriorityAction(
  notes: BoardNote[],
  noteId: string,
  action: NotePriorityAction,
) {
  const orderedNotes = sortNotesBySharedOrder(notes)
  const pinnedNotes = orderedNotes.filter((note) => note.isPinned)
  const regularNotes = orderedNotes.filter((note) => !note.isPinned)
  const targetNote = orderedNotes.find((note) => note.id === noteId)

  if (!targetNote) {
    return toSequentialItems(pinnedNotes, true).concat(toSequentialItems(regularNotes, false))
  }

  if (action === 'togglePin') {
    if (targetNote.isPinned) {
      const nextPinnedNotes = pinnedNotes.filter((note) => note.id !== noteId)
      const nextRegularNotes = [{ ...targetNote, isPinned: false }, ...regularNotes]

      return toSequentialItems(nextPinnedNotes, true).concat(
        toSequentialItems(nextRegularNotes, false),
      )
    }

    const nextPinnedNotes = [{ ...targetNote, isPinned: true }, ...pinnedNotes]
    const nextRegularNotes = regularNotes.filter((note) => note.id !== noteId)

    return toSequentialItems(nextPinnedNotes, true).concat(
      toSequentialItems(nextRegularNotes, false),
    )
  }

  const sourceNotes = targetNote.isPinned ? pinnedNotes : regularNotes
  const sourceIndex = sourceNotes.findIndex((note) => note.id === noteId)

  if (sourceIndex === -1) {
    return toSequentialItems(pinnedNotes, true).concat(toSequentialItems(regularNotes, false))
  }

  let nextSourceNotes = sourceNotes

  if (action === 'moveTop') {
    nextSourceNotes = moveWithinSection(sourceNotes, sourceIndex, 0)
  }

  if (action === 'moveUp') {
    nextSourceNotes = moveWithinSection(sourceNotes, sourceIndex, sourceIndex - 1)
  }

  if (action === 'moveDown') {
    nextSourceNotes = moveWithinSection(sourceNotes, sourceIndex, sourceIndex + 1)
  }

  if (action === 'moveBottom') {
    nextSourceNotes = moveWithinSection(sourceNotes, sourceIndex, sourceNotes.length - 1)
  }

  if (targetNote.isPinned) {
    return toSequentialItems(nextSourceNotes, true).concat(toSequentialItems(regularNotes, false))
  }

  return toSequentialItems(pinnedNotes, true).concat(toSequentialItems(nextSourceNotes, false))
}

export function getPriorityMoveAvailability(notes: BoardNote[], noteId: string) {
  const orderedNotes = sortNotesBySharedOrder(notes)
  const targetNote = orderedNotes.find((note) => note.id === noteId)

  if (!targetNote) {
    return { canMoveUp: false, canMoveDown: false }
  }

  const sectionNotes = orderedNotes.filter((note) => note.isPinned === targetNote.isPinned)
  const index = sectionNotes.findIndex((note) => note.id === noteId)

  return {
    canMoveUp: index > 0,
    canMoveDown: index < sectionNotes.length - 1,
  }
}

// 서버 reorder RPC는 카테고리의 모든 포스트잇을 한 번에 받는다.
// 화면에 없는 포스트잇(지난 회차 등)은 지금 순서를 그대로 실어 보내야 요청이 거절되지 않는다.
export function completeReorderItems(
  notes: BoardNote[],
  category: BoardCategory,
  items: ReorderBoardNoteItem[],
): ReorderBoardNoteItem[] {
  const includedIds = new Set(items.map((item) => item.id))
  const untouchedItems = notes
    .filter((note) => note.category === category && !includedIds.has(note.id))
    .map((note) => ({ id: note.id, isPinned: note.isPinned, sortRank: note.sortRank }))

  return items.concat(untouchedItems)
}

const LIST_COMPARATORS: Record<
  Exclude<BoardSortOption, typeof BOARD_SORT_OPTION.MANUAL>,
  (left: BoardNote, right: BoardNote) => number
> = {
  likes: (left, right) => (right.likesCount ?? 0) - (left.likesCount ?? 0),
  latest: (left, right) => getCreatedAtValue(right.createdAt) - getCreatedAtValue(left.createdAt),
  comments: (left, right) => (right.comments?.length ?? 0) - (left.comments?.length ?? 0),
}

// 고정한 포스트잇은 어떤 정렬에서도 위에 둔다
export function sortNotesForList(notes: BoardNote[], sortOption: BoardSortOption) {
  const orderedNotes = sortNotesBySharedOrder(notes)

  if (sortOption === BOARD_SORT_OPTION.MANUAL) {
    return orderedNotes
  }

  const comparator = LIST_COMPARATORS[sortOption]
  const pinnedNotes = orderedNotes.filter((note) => note.isPinned).sort(comparator)
  const regularNotes = orderedNotes.filter((note) => !note.isPinned).sort(comparator)

  return pinnedNotes.concat(regularNotes)
}

export function applyReorderItemsToNotes(notes: BoardNote[], items: ReorderBoardNoteItem[]) {
  const itemsById = items.reduce<Record<string, ReorderBoardNoteItem>>((accumulator, item) => {
    accumulator[item.id] = item
    return accumulator
  }, {})

  return notes.map((note) => {
    const nextItem = itemsById[note.id]

    if (!nextItem) {
      return note
    }

    return {
      ...note,
      isPinned: nextItem.isPinned,
      sortRank: nextItem.sortRank,
    }
  })
}
