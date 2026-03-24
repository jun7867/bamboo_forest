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
