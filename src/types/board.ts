export type BoardCategory = 'praise' | 'suggestion' | 'freeTalk' | 'question'

export type PostItColor =
  | 'butter'
  | 'sky'
  | 'mint'
  | 'lavender'
  | 'blush'
  | 'peach'

export interface BoardPosition {
  x: number
  y: number
}

export interface BoardNote {
  id: string
  category: BoardCategory
  content: string
  color: PostItColor
  position: BoardPosition
  rotation: number
  comments?: BoardNoteComment[]
  password?: string
  createdAt?: string
  updatedAt?: string
}

export interface BoardNoteComment {
  id: string
  noteId: string
  author: string
  content: string
  createdAt: string
}

export interface CreateBoardNoteInput {
  category: BoardCategory
  content: string
  color: PostItColor
  password: string
}

export interface UpdateBoardNoteInput {
  id: string
  category: BoardCategory
  content: string
  color: PostItColor
  password: string
}

export interface DeleteBoardNoteInput {
  id: string
  password: string
}

export interface CreateBoardNoteCommentInput {
  noteId: string
  author: string
  content: string
}
