import { getSupabaseClient } from './supabase'
import type {
  BoardNote,
  BoardNoteComment,
  BoardPosition,
  CreateBoardNoteInput,
  CreateBoardNoteCommentInput,
  DeleteBoardNoteInput,
  ToggleBoardNoteLikeInput,
  UpdateBoardNoteInput,
} from '../types/board'

interface BoardNoteRow {
  id: string
  category: BoardNote['category']
  author: string
  content: string
  color: BoardNote['color']
  position_x: number
  position_y: number
  rotation: number
  created_at: string
  updated_at: string
}

interface BoardNoteCommentRow {
  id: string
  note_id: string
  author: string
  content: string
  created_at: string
}

interface BoardNoteLikeRow {
  note_id: string
  client_id: string
}

function mapBoardNoteComment(row: BoardNoteCommentRow): BoardNoteComment {
  return {
    id: row.id,
    noteId: row.note_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
  }
}

function mapBoardNote(
  row: BoardNoteRow,
  comments: BoardNoteComment[] = [],
): BoardNote {
  return {
    id: row.id,
    category: row.category,
    author: row.author,
    content: row.content,
    color: row.color,
    position: {
      x: row.position_x,
      y: row.position_y,
    },
    rotation: row.rotation,
    comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getSingleRow(data: BoardNoteRow[] | null, fallbackMessage: string) {
  const row = data?.[0]

  if (!row) {
    throw new Error(fallbackMessage)
  }

  return row
}

function mapBoardError(error: { message?: string } | null, fallbackMessage: string) {
  if (!error?.message) {
    return fallbackMessage
  }

  if (error.message.includes('INVALID_PASSWORD')) {
    return '비밀번호가 일치하지 않아요.'
  }

  if (error.message.includes('NOTE_NOT_FOUND')) {
    return '이미 삭제되었거나 찾을 수 없는 포스트잇이에요.'
  }

  return fallbackMessage
}

function isMissingCommentsTableError(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes('board_note_comments') === true ||
    error.message?.includes('schema cache') === true
  )
}

function isMissingLikesTableError(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes('board_note_likes') === true ||
    error.message?.includes('schema cache') === true
  )
}

export async function fetchBoardNotes(clientId: string) {
  const client = getSupabaseClient()
  const [{ data, error }, commentsResult, likesResult] = await Promise.all([
    client.rpc('list_board_notes'),
    client
      .from('board_note_comments')
      .select('id, note_id, author, content, created_at')
      .order('created_at', { ascending: true }),
    client.from('board_note_likes').select('note_id, client_id'),
  ])

  if (error) {
    throw new Error(mapBoardError(error, '포스트잇을 불러오지 못했어요.'))
  }

  if (commentsResult.error && !isMissingCommentsTableError(commentsResult.error)) {
    throw new Error('포스트잇 댓글을 불러오지 못했어요.')
  }

  if (likesResult.error && !isMissingLikesTableError(likesResult.error)) {
    throw new Error('포스트잇 좋아요 정보를 불러오지 못했어요.')
  }

  const commentsByNoteId = ((commentsResult.error && isMissingCommentsTableError(commentsResult.error))
    ? []
    : commentsResult.data ?? [])
    .map(mapBoardNoteComment)
    .reduce<Record<string, BoardNoteComment[]>>((accumulator, comment) => {
      accumulator[comment.noteId] = [...(accumulator[comment.noteId] ?? []), comment]
      return accumulator
    }, {})

  const likesByNoteId = ((likesResult.error && isMissingLikesTableError(likesResult.error))
    ? []
    : (likesResult.data as BoardNoteLikeRow[] | null) ?? []
  ).reduce<Record<string, { count: number; liked: boolean }>>((accumulator, row) => {
    const current = accumulator[row.note_id] ?? { count: 0, liked: false }

    accumulator[row.note_id] = {
      count: current.count + 1,
      liked: current.liked || row.client_id === clientId,
    }

    return accumulator
  }, {})

  return (data ?? []).map((row: BoardNoteRow) =>
    ({
      ...mapBoardNote(row, commentsByNoteId[row.id] ?? []),
      likesCount: likesByNoteId[row.id]?.count ?? 0,
      isLiked: likesByNoteId[row.id]?.liked ?? false,
    }),
  )
}

export async function createBoardNote(
  input: CreateBoardNoteInput & {
    position: BoardPosition
    rotation: number
  },
) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('create_board_note', {
    p_category: input.category,
    p_color: input.color,
    p_content: input.content,
    p_author: input.author,
    p_password: input.password,
    p_position_x: input.position.x,
    p_position_y: input.position.y,
    p_rotation: input.rotation,
  })

  if (error) {
    throw new Error(mapBoardError(error, '포스트잇을 저장하지 못했어요.'))
  }

  return mapBoardNote(getSingleRow(data, '저장된 포스트잇을 확인하지 못했어요.'))
}

export async function moveBoardNote(id: string, position: BoardPosition) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('move_board_note', {
    p_note_id: id,
    p_position_x: position.x,
    p_position_y: position.y,
  })

  if (error) {
    throw new Error(mapBoardError(error, '포스트잇 위치를 저장하지 못했어요.'))
  }

  return mapBoardNote(
    getSingleRow(data, '이동한 포스트잇의 최신 상태를 확인하지 못했어요.'),
  )
}

export async function updateBoardNote(input: UpdateBoardNoteInput) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('update_board_note_with_password', {
    p_note_id: input.id,
    p_password: input.password,
    p_category: input.category,
    p_author: input.author,
    p_color: input.color,
    p_content: input.content,
  })

  if (error) {
    throw new Error(mapBoardError(error, '포스트잇을 수정하지 못했어요.'))
  }

  return mapBoardNote(
    getSingleRow(data, '수정된 포스트잇의 최신 상태를 확인하지 못했어요.'),
  )
}

export async function deleteBoardNote(input: DeleteBoardNoteInput) {
  const client = getSupabaseClient()
  const { error } = await client.rpc('delete_board_note_with_password', {
    p_note_id: input.id,
    p_password: input.password,
  })

  if (error) {
    throw new Error(mapBoardError(error, '포스트잇을 삭제하지 못했어요.'))
  }
}

export async function createBoardNoteComment(input: CreateBoardNoteCommentInput) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('board_note_comments')
    .insert({
      note_id: input.noteId,
      author: input.author.trim(),
      content: input.content.trim(),
    })
    .select('id, note_id, author, content, created_at')
    .single()

  if (error) {
    if (isMissingCommentsTableError(error)) {
      throw new Error('댓글 기능을 쓰려면 Supabase 댓글 SQL을 한 번 실행해야 해요.')
    }

    throw new Error('댓글을 저장하지 못했어요.')
  }

  return mapBoardNoteComment(data)
}

export async function toggleBoardNoteLike(input: ToggleBoardNoteLikeInput) {
  const client = getSupabaseClient()

  if (input.isLiked) {
    const { error } = await client
      .from('board_note_likes')
      .delete()
      .eq('note_id', input.noteId)
      .eq('client_id', input.clientId)

    if (error) {
      if (isMissingLikesTableError(error)) {
        throw new Error('좋아요 기능을 쓰려면 Supabase 좋아요 SQL을 한 번 실행해야 해요.')
      }

      throw new Error('좋아요를 취소하지 못했어요.')
    }

    return { isLiked: false }
  }

  const { error } = await client.from('board_note_likes').insert({
    note_id: input.noteId,
    client_id: input.clientId,
  })

  if (error) {
    if (isMissingLikesTableError(error)) {
      throw new Error('좋아요 기능을 쓰려면 Supabase 좋아요 SQL을 한 번 실행해야 해요.')
    }

    throw new Error('좋아요를 저장하지 못했어요.')
  }

  return { isLiked: true }
}
