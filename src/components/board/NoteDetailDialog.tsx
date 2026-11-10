import { useRef, useState } from 'react'
import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  MAX_COMMENT_LENGTH,
  MAX_PASSWORD_LENGTH,
  POST_IT_COLOR_META,
} from '../../constants/board'
import { formatFullDateTime, formatRelativeTime } from '../../lib/format'
import { getOwnedNoteSecret } from '../../lib/noteOwnership'
import type {
  BoardNote,
  CreateBoardNoteCommentInput,
  DeleteBoardNoteInput,
  UpdateBoardNoteInput,
} from '../../types/board'
import { IconClose, IconComment, IconHeart } from '../common/Icons'
import { Modal } from '../common/Modal'
import { ModalCloseButton, ModalHeader } from '../common/Modal.style'
import { FieldError, FieldHint, TextField } from './NoteFormFields.style'
import { NoteEditForm } from './NoteEditForm'
import { NoteMedia } from './NoteMedia'

type MutationResult = Promise<{ ok: boolean; message?: string }>

interface NoteDetailDialogProps {
  note: BoardNote
  isReadOnly: boolean
  onClose: () => void
  onToggleLike: (noteId: string) => MutationResult
  onAddComment: (input: CreateBoardNoteCommentInput) => MutationResult
  onSave: (input: UpdateBoardNoteInput) => MutationResult
  onDelete: (input: DeleteBoardNoteInput) => MutationResult
}

const DETAIL_MODE = {
  VIEW: 'view',
  EDIT: 'edit',
  DELETE: 'delete',
} as const

type DetailMode = (typeof DETAIL_MODE)[keyof typeof DETAIL_MODE]

// Safari는 한글 조합을 확정하는 Enter를 isComposing 없이 keyCode 229로 보낸다
const IME_PROCESS_KEY_CODE = 229

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.86rem;
`

const CategoryChip = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}26`};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.86rem;
  font-weight: 800;
`

const NoteSheet = styled.article<{ $background: string; $border: string; $text: string }>`
  position: relative;
  display: grid;
  gap: 0.9rem;
  padding: 1.6rem 1.4rem 1.2rem;
  border-radius: 0.4rem;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  color: ${({ $text }) => $text};
  box-shadow: 0 18px 30px rgba(74, 96, 57, 0.14);

  &::before {
    content: '';
    position: absolute;
    top: -0.55rem;
    left: 50%;
    width: 4.2rem;
    height: 1.1rem;
    border-radius: 0.2rem;
    background: rgba(255, 255, 255, 0.72);
    transform: translateX(-50%) rotate(-2deg);
  }
`

const NoteContent = styled.p`
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const NoteImageLink = styled.a`
  display: block;
  border-radius: 0.6rem;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);

  img,
  video {
    display: block;
    width: 100%;
    max-height: 22rem;
    object-fit: cover;
  }
`

const NoteAuthor = styled.span`
  justify-self: end;
  font-size: 0.9rem;
  font-weight: 700;
  opacity: 0.85;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`

const ReactionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const LikeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.6rem;
  padding: 0.5rem 0.95rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? 'rgba(232, 89, 112, 0.45)' : theme.colors.borderStrong)};
  background: ${({ $active }) => ($active ? 'rgba(255, 106, 129, 0.16)' : 'rgba(255, 255, 255, 0.9)')};
  color: ${({ $active, theme }) => ($active ? '#C2415A' : theme.colors.textStrong)};
  font-weight: 800;
  transition: transform 0.14s ease;

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: default;
  }

  svg {
    font-size: 1.1rem;
    fill: ${({ $active }) => ($active ? 'currentColor' : 'none')};
  }
`

const CountPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.92rem;
  font-weight: 700;

  svg {
    font-size: 1.05rem;
  }
`

const OwnerActions = styled.div`
  display: flex;
  gap: 0.35rem;
`

const TextButton = styled.button<{ $tone?: 'danger' }>`
  min-height: 2.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 0.75rem;
  color: ${({ $tone, theme }) => ($tone === 'danger' ? theme.colors.danger : theme.colors.textMuted)};
  font-size: 0.9rem;
  font-weight: 700;

  &:hover {
    background: ${({ $tone }) =>
      $tone === 'danger' ? 'rgba(219, 93, 93, 0.1)' : 'rgba(80, 115, 61, 0.08)'};
  }
`

const ConfirmPanel = styled.form`
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid rgba(219, 93, 93, 0.28);
  background: rgba(255, 241, 241, 0.88);

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`

const ConfirmCancelButton = styled.button`
  min-height: 2.6rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const DangerButton = styled.button`
  min-height: 2.6rem;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  background: #c95454;
  color: #ffffff;
  font-weight: 800;

  &:disabled {
    opacity: 0.7;
  }
`

const CommentSection = styled.section`
  display: grid;
  gap: 0.8rem;
  margin-top: 1.4rem;
  padding-top: 1.2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderSoft};

  h3 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

const CommentList = styled.ol`
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const CommentItem = styled.li`
  display: grid;
  gap: 0.3rem;
  padding: 0.75rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(255, 255, 255, 0.82);

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textStrong};
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
`

const CommentMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

const EmptyComments = styled.p`
  margin: 0;
  padding: 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.6);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  text-align: center;
`

const CommentForm = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.6rem;
`

const CommentInput = styled.textarea`
  width: 100%;
  min-height: 2.9rem;
  max-height: 9rem;
  padding: 0.75rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.94);
  color: ${({ theme }) => theme.colors.textStrong};
  line-height: 1.5;
  resize: vertical;

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.32);
    outline-offset: 2px;
  }
`

const CommentSubmitButton = styled.button`
  min-height: 2.9rem;
  padding: 0.6rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 800;

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

export function NoteDetailDialog({
  note,
  isReadOnly,
  onClose,
  onToggleLike,
  onAddComment,
  onSave,
  onDelete,
}: NoteDetailDialogProps) {
  const [mode, setMode] = useState<DetailMode>(DETAIL_MODE.VIEW)
  // 수정·삭제에서 돌아왔을 때 포커스가 사라지지 않도록 동작 버튼으로 되돌린다
  const [hasLeftViewMode, setHasLeftViewMode] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const commentListEndRef = useRef<HTMLDivElement | null>(null)

  const categoryMeta = BOARD_CATEGORY_META[note.category]
  const colorMeta = POST_IT_COLOR_META[note.color]
  const comments = note.comments ?? []
  const ownedSecret = isReadOnly ? null : getOwnedNoteSecret(note.id)

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const password = ownedSecret ?? deletePassword.trim()

    if (!password) {
      setDeleteError('작성할 때 정한 비밀번호를 입력해 주세요.')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    const result = await onDelete({ id: note.id, password })

    setIsDeleting(false)

    if (!result.ok) {
      setDeleteError(result.message ?? '포스트잇 삭제에 실패했어요.')
      return
    }

    onClose()
  }

  async function submitComment() {
    const content = commentDraft.trim()

    if (!content || isCommentSubmitting) {
      return
    }

    setIsCommentSubmitting(true)
    setCommentError(null)

    const result = await onAddComment({ noteId: note.id, author: '익명', content })

    setIsCommentSubmitting(false)

    if (!result.ok) {
      setCommentError(result.message ?? '댓글 저장에 실패했어요.')
      return
    }

    setCommentDraft('')
    window.requestAnimationFrame(() => {
      commentListEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  function changeMode(nextMode: DetailMode) {
    setMode(nextMode)

    if (nextMode !== DETAIL_MODE.VIEW) {
      setHasLeftViewMode(true)
    }
  }

  function handleCommentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 조합 중 Enter는 글자 확정이라 전송하지 않는다
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== IME_PROCESS_KEY_CODE
    ) {
      event.preventDefault()
      void submitComment()
    }
  }

  if (mode === DETAIL_MODE.EDIT) {
    return (
      <Modal ariaLabel="포스트잇 수정" onClose={() => changeMode(DETAIL_MODE.VIEW)}>
        <ModalHeader>
          <HeaderMeta>
            <CategoryChip $accent={categoryMeta.accent}>포스트잇 수정</CategoryChip>
          </HeaderMeta>
          <ModalCloseButton
            type="button"
            onClick={() => changeMode(DETAIL_MODE.VIEW)}
            aria-label="수정 취소"
          >
            <IconClose />
          </ModalCloseButton>
        </ModalHeader>
        <NoteEditForm
          note={note}
          ownedSecret={ownedSecret}
          onCancel={() => changeMode(DETAIL_MODE.VIEW)}
          onSave={onSave}
          onSaved={() => changeMode(DETAIL_MODE.VIEW)}
        />
      </Modal>
    )
  }

  return (
    <Modal ariaLabel={`${categoryMeta.label} 포스트잇`} onClose={onClose}>
      <ModalHeader>
        <HeaderMeta>
          <CategoryChip $accent={categoryMeta.accent}>
            <span aria-hidden="true">{categoryMeta.emoji}</span>
            {categoryMeta.label}
          </CategoryChip>
          <time dateTime={note.createdAt} title={formatFullDateTime(note.createdAt)}>
            {formatRelativeTime(note.createdAt)}
          </time>
          {note.isPinned ? <span>· 상단 고정</span> : null}
        </HeaderMeta>
        <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
          <IconClose />
        </ModalCloseButton>
      </ModalHeader>

      <NoteSheet
        $background={colorMeta.background}
        $border={colorMeta.border}
        $text={colorMeta.text}
      >
        <NoteContent>{note.content}</NoteContent>
        {note.imageUrl ? (
          <NoteImageLink href={note.imageUrl} target="_blank" rel="noreferrer" title="원본 사진 보기">
            <NoteMedia src={note.imageUrl} alt="첨부 사진" />
          </NoteImageLink>
        ) : null}
        <NoteAuthor>— {note.author || '익명'}</NoteAuthor>
      </NoteSheet>

      {mode === DETAIL_MODE.DELETE ? (
        <ConfirmPanel onSubmit={handleDelete}>
          <strong>이 포스트잇을 떼어낼까요?</strong>
          <FieldHint>달린 댓글과 공감도 함께 사라지고 되돌릴 수 없어요.</FieldHint>
          {ownedSecret ? null : (
            <TextField
              type="password"
              placeholder="작성할 때 정한 비밀번호"
              autoComplete="current-password"
              autoFocus
              value={deletePassword}
              maxLength={MAX_PASSWORD_LENGTH}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          )}
          {deleteError ? <FieldError role="alert">{deleteError}</FieldError> : null}
          <ConfirmActions>
            <ConfirmCancelButton
              type="button"
              autoFocus={Boolean(ownedSecret)}
              onClick={() => {
                changeMode(DETAIL_MODE.VIEW)
                setDeleteError(null)
              }}
              disabled={isDeleting}
            >
              취소
            </ConfirmCancelButton>
            <DangerButton type="submit" disabled={isDeleting}>
              {isDeleting ? '떼어내는 중...' : '떼어내기'}
            </DangerButton>
          </ConfirmActions>
        </ConfirmPanel>
      ) : (
        <ActionRow>
          <ReactionGroup>
            <LikeButton
              type="button"
              $active={note.isLiked ?? false}
              aria-pressed={note.isLiked ?? false}
              disabled={isReadOnly}
              onClick={() => void onToggleLike(note.id)}
            >
              <IconHeart />
              공감 {note.likesCount ?? 0}
            </LikeButton>
            <CountPill>
              <IconComment />
              댓글 {comments.length}
            </CountPill>
          </ReactionGroup>

          {isReadOnly ? null : (
            <OwnerActions>
              <TextButton
                type="button"
                autoFocus={hasLeftViewMode}
                onClick={() => changeMode(DETAIL_MODE.EDIT)}
              >
                수정
              </TextButton>
              <TextButton type="button" $tone="danger" onClick={() => changeMode(DETAIL_MODE.DELETE)}>
                삭제
              </TextButton>
            </OwnerActions>
          )}
        </ActionRow>
      )}

      <CommentSection aria-label="댓글">
        <h3>댓글 {comments.length > 0 ? comments.length : ''}</h3>

        {comments.length > 0 ? (
          <CommentList>
            {comments.map((comment) => (
              <CommentItem key={comment.id}>
                <CommentMeta>
                  <strong>{comment.author}</strong>
                  <time dateTime={comment.createdAt} title={formatFullDateTime(comment.createdAt)}>
                    {formatRelativeTime(comment.createdAt)}
                  </time>
                </CommentMeta>
                <p>{comment.content}</p>
              </CommentItem>
            ))}
          </CommentList>
        ) : (
          <EmptyComments>
            {isReadOnly ? '댓글이 없었어요.' : '아직 댓글이 없어요. 첫 마디를 건네보세요.'}
          </EmptyComments>
        )}
        <div ref={commentListEndRef} />

        {isReadOnly ? null : (
          <>
            <CommentForm
              onSubmit={(event) => {
                event.preventDefault()
                void submitComment()
              }}
            >
              <CommentInput
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                onKeyDown={handleCommentKeyDown}
                placeholder="익명으로 댓글 달기 (Enter로 등록)"
                maxLength={MAX_COMMENT_LENGTH}
                rows={1}
                aria-label="댓글 입력"
              />
              <CommentSubmitButton
                type="submit"
                disabled={isCommentSubmitting || !commentDraft.trim()}
              >
                {isCommentSubmitting ? '등록 중' : '등록'}
              </CommentSubmitButton>
            </CommentForm>
            {commentError ? <FieldError role="alert">{commentError}</FieldError> : null}
          </>
        )}
      </CommentSection>
    </Modal>
  )
}
