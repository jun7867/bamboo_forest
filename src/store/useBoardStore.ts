import { create } from 'zustand'
import { isInCurrentSeason } from '../config/boardVersion'
import { cloneInitialBoardNotes } from '../constants/board'
import {
  createBoardNote,
  createBoardNoteComment,
  deleteBoardNote,
  fetchBoardNotes,
  moveBoardNote,
  reorderBoardNotes,
  toggleBoardNoteLike,
  updateBoardNote,
} from '../lib/boardNotes'
import { getSuggestedNotePosition } from '../lib/boardLayout'
import {
  applyReorderItemsToNotes,
  completeReorderItems,
  getNextSortRank,
} from '../lib/boardOrdering'
import { getBoardVisitorId } from '../lib/boardVisitor'
import { createNoteSecret, forgetOwnedNote, rememberOwnedNote } from '../lib/noteOwnership'
import { isSupabaseConfigured } from '../lib/supabase'
import type {
  BoardCategory,
  BoardDensityMode,
  BoardNote,
  BoardPosition,
  CreateBoardNoteInput,
  CreateBoardNoteCommentInput,
  DeleteBoardNoteInput,
  ReorderBoardNoteItem,
  ToggleBoardNoteLikeInput,
  UpdateBoardNoteInput,
} from '../types/board'

type DataSource = 'supabase' | 'demo'

interface BoardStatus {
  tone: 'info' | 'success' | 'error'
  message: string
}

interface MutationResult {
  ok: boolean
  message?: string
}

interface BoardStore {
  notes: BoardNote[]
  viewMode: BoardDensityMode
  isComposerOpen: boolean
  // null이면 작성창이 초안이나 기본 카테고리를 쓴다
  composerCategory: BoardCategory | null
  isLoading: boolean
  hasLoaded: boolean
  loadError: string | null
  dataSource: DataSource
  status: BoardStatus | null
  openComposer: (category?: BoardCategory) => void
  closeComposer: () => void
  clearStatus: () => void
  setViewMode: (mode: BoardDensityMode) => void
  loadNotes: (force?: boolean) => Promise<void>
  addNote: (input: CreateBoardNoteInput) => Promise<MutationResult & { noteId?: string }>
  addComment: (input: CreateBoardNoteCommentInput) => Promise<MutationResult>
  toggleLike: (input: Pick<ToggleBoardNoteLikeInput, 'noteId'>) => Promise<MutationResult>
  updateNote: (input: UpdateBoardNoteInput) => Promise<MutationResult>
  deleteNote: (input: DeleteBoardNoteInput) => Promise<MutationResult>
  moveNote: (id: string, position: BoardPosition) => Promise<void>
  reorderNotes: (category: BoardCategory, items: ReorderBoardNoteItem[]) => Promise<void>
}

const ROTATIONS = [-2.8, 1.6, -1.2, 2.4, -0.9, 1.1]
const VIEW_MODE_STORAGE_KEY = 'bamboo-board-view-mode'
const MOBILE_MEDIA_QUERY = '(max-width: 640px)'

function readInitialViewMode(): BoardDensityMode {
  if (typeof window === 'undefined') {
    return 'spread'
  }

  try {
    const savedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)

    if (savedMode === 'spread' || savedMode === 'stack') {
      return savedMode
    }
  } catch {
    // 저장소를 못 읽으면 기기 기본값을 쓴다
  }

  // 모바일은 드래그 보드보다 목록이 읽고 스크롤하기 편하다
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 'stack' : 'spread'
}

function saveViewMode(mode: BoardDensityMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  } catch {
    // 보기 모드 저장은 편의 기능이라 실패해도 넘어간다
  }
}

function appendNote(notes: BoardNote[], nextNote: BoardNote) {
  // 실시간 새로고침이 먼저 도착했으면 같은 포스트잇이 두 번 들어가지 않게 한다
  return notes.filter((note) => note.id !== nextNote.id).concat(nextNote)
}

function updateNoteById(
  notes: BoardNote[],
  noteId: string,
  update: (note: BoardNote) => BoardNote,
) {
  return notes.map((note) => (note.id === noteId ? update(note) : note))
}

function createLocalNote(notes: BoardNote[], input: CreateBoardNoteInput): BoardNote {
  // 지난 회차 포스트잇은 화면에 없으니 빈 자리 계산에서 뺀다
  const occupiedPositions = notes
    .filter((note) => note.category === input.category && isInCurrentSeason(note.createdAt))
    .map((note) => note.position)
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    category: input.category,
    author: input.author,
    content: input.content,
    color: input.color,
    imageUrl: input.imageUrl ?? null,
    position: getSuggestedNotePosition(occupiedPositions),
    rotation: ROTATIONS[notes.length % ROTATIONS.length],
    isPinned: false,
    sortRank: getNextSortRank(notes, input.category),
    likesCount: 0,
    isLiked: false,
    comments: [],
    createdAt: now,
    updatedAt: now,
  }
}

// 마스터 비밀번호는 서버 함수에서만 확인한다. 클라이언트 번들에 넣으면 누구나 볼 수 있다
function verifyLocalPassword(note: BoardNote | undefined, password: string) {
  const normalized = password.trim()

  if (!note) {
    return '이미 삭제되었거나 찾을 수 없는 포스트잇이에요.'
  }

  if (note.password && normalized === note.password) {
    return null
  }

  return '비밀번호가 일치하지 않아요.'
}

function getSuggestedCommentAuthor() {
  return `익명 ${Math.floor(100 + Math.random() * 900)}`
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

let latestLoadRequestId = 0
const pendingLikeNoteIds = new Set<string>()
const latestReorderRequestIds: Partial<Record<BoardCategory, number>> = {}
let reorderRequestSequence = 0

// 새로고침 응답은 요청 시점의 스냅샷이라, 그 사이 끝난 변경을 덮어쓰지 않도록 변경 횟수를 센다
let mutationEpoch = 0
let inflightMutationCount = 0
let shouldReloadAfterMutations = false

export const useBoardStore = create<BoardStore>((set, get) => {
  async function trackMutation<T>(run: () => Promise<T>) {
    inflightMutationCount += 1
    mutationEpoch += 1

    try {
      return await run()
    } finally {
      inflightMutationCount -= 1
      mutationEpoch += 1

      if (inflightMutationCount === 0 && shouldReloadAfterMutations) {
        shouldReloadAfterMutations = false
        void get().loadNotes(true)
      }
    }
  }

  return {
    notes: [],
    viewMode: readInitialViewMode(),
    isComposerOpen: false,
    composerCategory: null,
    isLoading: false,
    hasLoaded: false,
    loadError: null,
    dataSource: isSupabaseConfigured ? 'supabase' : 'demo',
    status: null,
    openComposer: (category) =>
      set({
        isComposerOpen: true,
        composerCategory: category ?? null,
      }),
    closeComposer: () => set({ isComposerOpen: false }),
    clearStatus: () => set({ status: null }),
    setViewMode: (mode) => {
      saveViewMode(mode)
      set({ viewMode: mode })
    },
    loadNotes: async (force = false) => {
      const { hasLoaded } = get()

      if (hasLoaded && !force) {
        return
      }

      if (!isSupabaseConfigured) {
        // 데모 데이터는 메모리에만 있어서 다시 불러오면 작성한 내용이 사라진다
        if (hasLoaded) {
          return
        }

        set({
          notes: cloneInitialBoardNotes(),
          dataSource: 'demo',
          hasLoaded: true,
          status: {
            tone: 'info',
            message: 'Supabase 환경변수가 없어 데모 모드로 실행 중이에요. 새로고침하면 처음 상태로 돌아가요.',
          },
        })
        return
      }

      const requestId = ++latestLoadRequestId
      const epochAtRequest = mutationEpoch

      if (!hasLoaded) {
        set({ isLoading: true, loadError: null })
      }

      try {
        const notes = await fetchBoardNotes(getBoardVisitorId())

        if (requestId !== latestLoadRequestId) {
          return
        }

        if (inflightMutationCount > 0) {
          shouldReloadAfterMutations = true
          return
        }

        if (mutationEpoch !== epochAtRequest) {
          void get().loadNotes(true)
          return
        }

        set({
          notes,
          dataSource: 'supabase',
          isLoading: false,
          hasLoaded: true,
          loadError: null,
        })
      } catch (error) {
        if (requestId !== latestLoadRequestId) {
          return
        }

        // 이미 보드를 보여주는 중이면 화면을 유지하고 다음 동기화 때 다시 시도한다
        if (get().hasLoaded) {
          return
        }

        set({
          isLoading: false,
          loadError: getErrorMessage(error, '포스트잇을 불러오지 못했어요.'),
        })
      }
    },
    addNote: async (input) => {
      const state = get()
      const customPassword = input.password?.trim() ?? ''
      const password = customPassword || createNoteSecret()
      const localNote = createLocalNote(state.notes, input)
      const successStatus: BoardStatus = { tone: 'success', message: '포스트잇을 붙였어요 🎋' }

      if (state.dataSource === 'demo') {
        if (!customPassword) {
          rememberOwnedNote(localNote.id, password)
        }

        set({
          notes: appendNote(state.notes, { ...localNote, password }),
          isComposerOpen: false,
          status: successStatus,
        })

        return { ok: true, noteId: localNote.id }
      }

      try {
        const createdNote = await trackMutation(() =>
          createBoardNote({
            ...input,
            password,
            position: localNote.position,
            rotation: localNote.rotation,
          }),
        )

        if (!customPassword) {
          rememberOwnedNote(createdNote.id, password)
        }

        set((current) => ({
          notes: appendNote(current.notes, { ...createdNote, likesCount: 0, isLiked: false }),
          isComposerOpen: false,
          status: successStatus,
        }))

        return { ok: true, noteId: createdNote.id }
      } catch (error) {
        return { ok: false, message: getErrorMessage(error, '포스트잇 저장에 실패했어요.') }
      }
    },
    addComment: async (input) => {
      const state = get()

      if (state.dataSource === 'demo') {
        const nextComment = {
          id: crypto.randomUUID(),
          noteId: input.noteId,
          author: input.author.trim() || getSuggestedCommentAuthor(),
          content: input.content.trim(),
          createdAt: new Date().toISOString(),
        }

        set((current) => ({
          notes: updateNoteById(current.notes, input.noteId, (note) => ({
            ...note,
            comments: [...(note.comments ?? []), nextComment],
          })),
        }))

        return { ok: true }
      }

      try {
        const createdComment = await trackMutation(() => createBoardNoteComment(input))

        set((current) => ({
          notes: updateNoteById(current.notes, input.noteId, (note) => ({
            ...note,
            comments: [
              ...(note.comments ?? []).filter((comment) => comment.id !== createdComment.id),
              createdComment,
            ],
          })),
        }))

        return { ok: true }
      } catch (error) {
        return { ok: false, message: getErrorMessage(error, '댓글 저장에 실패했어요.') }
      }
    },
    toggleLike: async ({ noteId }) => {
      // 응답 전에 다시 누르면 서버 순서가 꼬여 화면과 저장 상태가 달라진다
      if (pendingLikeNoteIds.has(noteId)) {
        return { ok: true }
      }

      const state = get()
      const target = state.notes.find((note) => note.id === noteId)

      if (!target) {
        return { ok: false, message: '포스트잇을 찾을 수 없어요.' }
      }

      const wasLiked = target.isLiked ?? false

      set((current) => ({
        notes: updateNoteById(current.notes, noteId, (note) => ({
          ...note,
          isLiked: !wasLiked,
          likesCount: Math.max(0, (note.likesCount ?? 0) + (wasLiked ? -1 : 1)),
        })),
      }))

      if (state.dataSource === 'demo') {
        return { ok: true }
      }

      pendingLikeNoteIds.add(noteId)

      try {
        const result = await trackMutation(() =>
          toggleBoardNoteLike({
            noteId,
            clientId: getBoardVisitorId(),
            isLiked: wasLiked,
          }),
        )

        // 응답을 기다리는 동안 다른 사람 공감이 반영됐을 수 있어 현재 값 기준으로만 보정한다
        set((current) => ({
          notes: updateNoteById(current.notes, noteId, (note) => {
            if ((note.isLiked ?? false) === result.isLiked) {
              return note
            }

            return {
              ...note,
              isLiked: result.isLiked,
              likesCount: Math.max(0, (note.likesCount ?? 0) + (result.isLiked ? 1 : -1)),
            }
          }),
        }))

        return { ok: true }
      } catch (error) {
        const message = getErrorMessage(error, '공감을 저장하지 못했어요.')

        set((current) => ({
          notes: updateNoteById(current.notes, noteId, (note) => {
            if ((note.isLiked ?? false) === wasLiked) {
              return note
            }

            return {
              ...note,
              isLiked: wasLiked,
              likesCount: Math.max(0, (note.likesCount ?? 0) + (wasLiked ? 1 : -1)),
            }
          }),
          status: { tone: 'error', message },
        }))

        return { ok: false, message }
      } finally {
        pendingLikeNoteIds.delete(noteId)
      }
    },
    updateNote: async (input) => {
      const state = get()

      if (state.dataSource === 'demo') {
        const target = state.notes.find((note) => note.id === input.id)
        const passwordError = verifyLocalPassword(target, input.password)

        if (passwordError) {
          return { ok: false, message: passwordError }
        }

        set((current) => ({
          notes: updateNoteById(current.notes, input.id, (note) => ({
            ...note,
            category: input.category,
            author: input.author,
            color: input.color,
            content: input.content,
            imageUrl: input.imageUrl ?? null,
            updatedAt: new Date().toISOString(),
            sortRank:
              note.category === input.category
                ? note.sortRank
                : getNextSortRank(
                    current.notes.filter((currentNote) => currentNote.id !== input.id),
                    input.category,
                    note.isPinned,
                  ),
          })),
          status: { tone: 'success', message: '수정한 내용을 저장했어요.' },
        }))

        return { ok: true }
      }

      try {
        const updatedNote = await trackMutation(() => updateBoardNote(input))

        set((current) => ({
          notes: updateNoteById(current.notes, input.id, (note) => ({
            ...note,
            ...updatedNote,
            comments: note.comments ?? updatedNote.comments,
          })),
          status: { tone: 'success', message: '수정한 내용을 저장했어요.' },
        }))

        return { ok: true }
      } catch (error) {
        return { ok: false, message: getErrorMessage(error, '포스트잇 수정에 실패했어요.') }
      }
    },
    deleteNote: async (input) => {
      const state = get()

      if (state.dataSource === 'demo') {
        const target = state.notes.find((note) => note.id === input.id)
        const passwordError = verifyLocalPassword(target, input.password)

        if (passwordError) {
          return { ok: false, message: passwordError }
        }
      } else {
        try {
          await trackMutation(() => deleteBoardNote(input))
        } catch (error) {
          return { ok: false, message: getErrorMessage(error, '포스트잇 삭제에 실패했어요.') }
        }
      }

      forgetOwnedNote(input.id)
      set((current) => ({
        notes: current.notes.filter((note) => note.id !== input.id),
        status: { tone: 'success', message: '포스트잇을 떼어냈어요.' },
      }))

      return { ok: true }
    },
    moveNote: async (id, position) => {
      const previousPosition = get().notes.find((note) => note.id === id)?.position

      set((current) => ({
        notes: updateNoteById(current.notes, id, (note) => ({ ...note, position })),
      }))

      if (get().dataSource === 'demo' || !previousPosition) {
        return
      }

      try {
        const movedNote = await trackMutation(() => moveBoardNote(id, position))

        set((current) => ({
          notes: updateNoteById(current.notes, id, (note) => ({
            ...note,
            ...movedNote,
            comments: note.comments ?? movedNote.comments,
          })),
        }))
      } catch (error) {
        // 그사이 다른 포스트잇이 바뀌었을 수 있어 이 포스트잇 위치만 되돌린다
        set((current) => ({
          notes: updateNoteById(current.notes, id, (note) =>
            note.position === position ? { ...note, position: previousPosition } : note,
          ),
          status: {
            tone: 'error',
            message: getErrorMessage(error, '포스트잇 위치 저장에 실패했어요.'),
          },
        }))
      }
    },
    reorderNotes: async (category, items) => {
      const previousNotes = get().notes
      const previousOrderById = new Map<string, Pick<BoardNote, 'isPinned' | 'sortRank'>>(
        previousNotes.map((note) => [note.id, { isPinned: note.isPinned, sortRank: note.sortRank }]),
      )
      const requestId = ++reorderRequestSequence

      latestReorderRequestIds[category] = requestId
      set((current) => ({ notes: applyReorderItemsToNotes(current.notes, items) }))

      if (get().dataSource === 'demo') {
        return
      }

      try {
        const updatedCategoryNotes = await trackMutation(() =>
          reorderBoardNotes(category, completeReorderItems(previousNotes, category, items)),
        )

        // 같은 카테고리에서 더 최근 요청이 있으면 늦게 온 이 응답은 버린다
        if (latestReorderRequestIds[category] !== requestId) {
          return
        }

        const updatedById = new Map<string, BoardNote>(
          updatedCategoryNotes.map((note: BoardNote) => [note.id, note]),
        )

        set((current) => ({
          notes: current.notes.map((note) => {
            const updatedNote = updatedById.get(note.id)

            return updatedNote
              ? { ...note, isPinned: updatedNote.isPinned, sortRank: updatedNote.sortRank }
              : note
          }),
        }))
      } catch (error) {
        if (latestReorderRequestIds[category] === requestId) {
          set((current) => ({
            notes: current.notes.map((note) => {
              const previousOrder = previousOrderById.get(note.id)

              return previousOrder && items.some((item) => item.id === note.id)
                ? { ...note, ...previousOrder }
                : note
            }),
            status: {
              tone: 'error',
              message: getErrorMessage(error, '포스트잇 순서를 저장하지 못했어요.'),
            },
          }))
        }

        // 다른 사람이 방금 글을 추가해 개수가 달라졌을 수 있어 최신 상태로 맞춘다
        void get().loadNotes(true)
      }
    },
  }
})
