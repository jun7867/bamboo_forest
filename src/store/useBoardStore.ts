import { create } from 'zustand'
import { cloneInitialBoardNotes } from '../constants/board'
import {
  createBoardNote,
  createBoardNoteComment,
  deleteBoardNote,
  fetchBoardNotes,
  moveBoardNote,
  toggleBoardNoteLike,
  updateBoardNote,
} from '../lib/boardNotes'
import { getBoardVisitorId } from '../lib/boardVisitor'
import { isSupabaseConfigured } from '../lib/supabase'
import type {
  BoardCategory,
  BoardNote,
  BoardPosition,
  CreateBoardNoteInput,
  CreateBoardNoteCommentInput,
  DeleteBoardNoteInput,
  PostItColor,
  ToggleBoardNoteLikeInput,
  UpdateBoardNoteInput,
} from '../types/board'

type DataSource = 'supabase' | 'demo'

interface BoardStatus {
  tone: 'info' | 'error'
  message: string
}

interface BoardStore {
  notes: BoardNote[]
  isComposerOpen: boolean
  composerCategory: BoardCategory
  composerColor: PostItColor
  isLoading: boolean
  hasLoaded: boolean
  dataSource: DataSource
  status: BoardStatus | null
  openComposer: (category?: BoardCategory, color?: PostItColor) => void
  closeComposer: () => void
  clearStatus: () => void
  loadNotes: (force?: boolean) => Promise<void>
  addNote: (input: CreateBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  addComment: (
    input: CreateBoardNoteCommentInput,
  ) => Promise<{ ok: boolean; message?: string }>
  toggleLike: (
    input: Pick<ToggleBoardNoteLikeInput, 'noteId'>,
  ) => Promise<{ ok: boolean; message?: string }>
  updateNote: (input: UpdateBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  deleteNote: (input: DeleteBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  moveNote: (id: string, position: BoardPosition) => Promise<void>
}

const FALLBACK_CATEGORY: BoardCategory = 'freeTalk'
const FALLBACK_COLOR: PostItColor = 'butter'
const ROTATIONS = [-2.8, 1.6, -1.2, 2.4, -0.9, 1.1]

function getSuggestedPosition(noteCount: number) {
  return {
    x: 22 + (noteCount % 2) * 152,
    y: 26 + Math.floor(noteCount / 2) * 156,
  }
}

function withNewNoteShape(notes: BoardNote[], input: CreateBoardNoteInput): BoardNote {
  const noteCountInCategory = notes.filter(
    (note) => note.category === input.category,
  ).length

  return {
    id: crypto.randomUUID(),
    ...input,
    position: getSuggestedPosition(noteCountInCategory),
    rotation: ROTATIONS[notes.length % ROTATIONS.length],
  }
}

function verifyLocalPassword(note: BoardNote | undefined, password: string) {
  const normalized = password.trim()

  if (!note) {
    return '이미 삭제되었거나 찾을 수 없는 포스트잇이에요.'
  }

  if (normalized === '0000') {
    return null
  }

  if (note.password && normalized === note.password) {
    return null
  }

  return '비밀번호가 일치하지 않아요.'
}

function getSuggestedCommentAuthor() {
  return `익명 ${Math.floor(100 + Math.random() * 900)}`
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  notes: [],
  isComposerOpen: false,
  composerCategory: FALLBACK_CATEGORY,
  composerColor: FALLBACK_COLOR,
  isLoading: false,
  hasLoaded: false,
  dataSource: 'demo',
  status: null,
  openComposer: (category, color) =>
    set({
      isComposerOpen: true,
      composerCategory: category ?? FALLBACK_CATEGORY,
      composerColor: color ?? FALLBACK_COLOR,
    }),
  closeComposer: () => set({ isComposerOpen: false }),
  clearStatus: () => set({ status: null }),
  loadNotes: async (force = false) => {
    if (get().hasLoaded && !force) {
      return
    }

    if (!isSupabaseConfigured) {
      set({
        notes: cloneInitialBoardNotes(),
        dataSource: 'demo',
        hasLoaded: true,
        status: {
          tone: 'info',
          message:
            'Supabase 환경변수가 아직 없어 데모 모드로 실행 중입니다. 연결 후에는 실제 DB 데이터가 보입니다.',
        },
      })
      return
    }

    set({ isLoading: true, status: null })

    try {
      const notes = await fetchBoardNotes(getBoardVisitorId())

      set({
        notes,
        dataSource: 'supabase',
        isLoading: false,
        hasLoaded: true,
        status: null,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Supabase 연결에 실패해 데모 데이터로 전환했어요.'

      set({
        notes: cloneInitialBoardNotes(),
        dataSource: 'demo',
        isLoading: false,
        hasLoaded: true,
        status: {
          tone: 'error',
          message: `${message} SQL 마이그레이션과 환경변수를 확인해 주세요.`,
        },
      })
    }
  },
  addNote: async (input) => {
    const state = get()

    if (state.dataSource === 'demo' || !isSupabaseConfigured) {
      const nextNote = withNewNoteShape(state.notes, input)

      set({
        notes: [...state.notes, nextNote],
        isComposerOpen: false,
        composerCategory: input.category,
      })

      return { ok: true }
    }

    try {
      const nextNote = withNewNoteShape(state.notes, input)
      const createdNote = await createBoardNote({
        ...input,
        position: nextNote.position,
        rotation: nextNote.rotation,
      })

      set((current) => ({
        notes: [...current.notes, createdNote],
        isComposerOpen: false,
        composerCategory: input.category,
        status: null,
      }))

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '포스트잇 저장에 실패했어요.'

      set({
        status: {
          tone: 'error',
          message,
        },
      })

      return { ok: false, message }
    }
  },
  addComment: async (input) => {
    const state = get()

    if (state.dataSource === 'demo' || !isSupabaseConfigured) {
      const nextComment = {
        id: crypto.randomUUID(),
        noteId: input.noteId,
        author: input.author.trim() || getSuggestedCommentAuthor(),
        content: input.content.trim(),
        createdAt: new Date().toISOString(),
      }

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === input.noteId
            ? { ...note, comments: [...(note.comments ?? []), nextComment] }
            : note,
        ),
        status: null,
      }))

      return { ok: true }
    }

    try {
      const createdComment = await createBoardNoteComment(input)

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === input.noteId
            ? { ...note, comments: [...(note.comments ?? []), createdComment] }
            : note,
        ),
        status: null,
      }))

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '댓글 저장에 실패했어요.'

      set({
        status: {
          tone: 'error',
          message,
        },
      })

      return { ok: false, message }
    }
  },
  toggleLike: async ({ noteId }) => {
    const state = get()
    const target = state.notes.find((note) => note.id === noteId)

    if (!target) {
      return { ok: false, message: '포스트잇을 찾을 수 없어요.' }
    }

    const nextLiked = !(target.isLiked ?? false)
    const previousLikesCount = target.likesCount ?? 0
    const nextLikesCount = Math.max(0, previousLikesCount + (nextLiked ? 1 : -1))

    set((current) => ({
      notes: current.notes.map((note) =>
        note.id === noteId
          ? { ...note, isLiked: nextLiked, likesCount: nextLikesCount }
          : note,
      ),
      status: null,
    }))

    if (state.dataSource === 'demo' || !isSupabaseConfigured) {
      return { ok: true }
    }

    try {
      const result = await toggleBoardNoteLike({
        noteId,
        clientId: getBoardVisitorId(),
        isLiked: target.isLiked ?? false,
      })

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                isLiked: result.isLiked,
                likesCount: Math.max(
                  0,
                  previousLikesCount + (result.isLiked ? 1 : -1),
                ),
              }
            : note,
        ),
      }))

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '좋아요 저장에 실패했어요.'

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === noteId
            ? { ...note, isLiked: target.isLiked ?? false, likesCount: previousLikesCount }
            : note,
        ),
        status: {
          tone: 'error',
          message,
        },
      }))

      return { ok: false, message }
    }
  },
  updateNote: async (input) => {
    const state = get()

    if (state.dataSource === 'demo' || !isSupabaseConfigured) {
      const target = state.notes.find((note) => note.id === input.id)
      const passwordError = verifyLocalPassword(target, input.password)

      if (passwordError) {
        return { ok: false, message: passwordError }
      }

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === input.id
            ? {
                ...note,
                category: input.category,
                author: input.author,
                color: input.color,
                content: input.content,
              }
            : note,
        ),
        status: null,
      }))

      return { ok: true }
    }

    try {
      const updatedNote = await updateBoardNote(input)

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === input.id
            ? { ...note, ...updatedNote, comments: note.comments ?? updatedNote.comments }
            : note,
        ),
        status: null,
      }))

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '포스트잇 수정에 실패했어요.'

      set({
        status: {
          tone: 'error',
          message,
        },
      })

      return { ok: false, message }
    }
  },
  deleteNote: async (input) => {
    const state = get()

    if (state.dataSource === 'demo' || !isSupabaseConfigured) {
      const target = state.notes.find((note) => note.id === input.id)
      const passwordError = verifyLocalPassword(target, input.password)

      if (passwordError) {
        return { ok: false, message: passwordError }
      }

      set((current) => ({
        notes: current.notes.filter((note) => note.id !== input.id),
        status: null,
      }))

      return { ok: true }
    }

    try {
      await deleteBoardNote(input)

      set((current) => ({
        notes: current.notes.filter((note) => note.id !== input.id),
        status: null,
      }))

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '포스트잇 삭제에 실패했어요.'

      set({
        status: {
          tone: 'error',
          message,
        },
      })

      return { ok: false, message }
    }
  },
  moveNote: async (id, position) => {
    const previousNotes = get().notes

    set({
      notes: previousNotes.map((note) =>
        note.id === id ? { ...note, position } : note,
      ),
    })

    if (get().dataSource === 'demo' || !isSupabaseConfigured) {
      return
    }

    try {
      const movedNote = await moveBoardNote(id, position)

      set((current) => ({
        notes: current.notes.map((note) =>
          note.id === id
            ? { ...note, ...movedNote, comments: note.comments ?? movedNote.comments }
            : note,
        ),
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '포스트잇 위치 저장에 실패했어요.'

      set({
        notes: previousNotes,
        status: {
          tone: 'error',
          message,
        },
      })
    }
  },
}))
