export type BoardCategory = 'praise' | 'suggestion' | 'freeTalk' | 'question'

export type BoardDensityMode = 'spread' | 'stack'

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
  author: string
  content: string
  color: PostItColor
  position: BoardPosition
  rotation: number
<<<<<<< HEAD
  likesCount?: number
  isLiked?: boolean
=======
  isPinned: boolean
  sortRank: number
>>>>>>> 8b7714e (feat: add shared board ordering and density toggle)
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
  author: string
  content: string
  color: PostItColor
  password: string
}

export interface UpdateBoardNoteInput {
  id: string
  category: BoardCategory
  author: string
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

<<<<<<< HEAD
export interface ToggleBoardNoteLikeInput {
  noteId: string
  clientId: string
  isLiked: boolean
=======
export interface ReorderBoardNoteItem {
  id: string
  isPinned: boolean
  sortRank: number
>>>>>>> 8b7714e (feat: add shared board ordering and density toggle)
}
