import { useState } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
} from '../../constants/board'
import type {
  BoardCategory,
  BoardNote,
  CreateBoardNoteCommentInput,
  DeleteBoardNoteInput,
  PostItColor,
  UpdateBoardNoteInput,
} from '../../types/board'

interface NoteEditorDialogProps {
  note: BoardNote
  onClose: () => void
  onToggleLike: (noteId: string) => Promise<{ ok: boolean; message?: string }>
  onSave: (input: UpdateBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  onDelete: (input: DeleteBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  onAddComment: (
    input: CreateBoardNoteCommentInput,
  ) => Promise<{ ok: boolean; message?: string }>
}

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(41, 54, 39, 0.3);
  backdrop-filter: blur(12px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    align-items: flex-start;
    padding: 0.7rem;
  }
`

const Dialog = styled(motion.div)`
  width: min(34rem, 100%);
  padding: 1.4rem;
  max-height: calc(100dvh - 3rem);
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(251, 247, 239, 0.96));
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    max-height: calc(100dvh - 1.4rem);
    padding: 1rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;
`

const TitleWrap = styled.div`
  display: grid;
  gap: 0.35rem;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.8rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.6;
  }
`

const CloseButton = styled.button`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.8);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.2rem;
`

const Form = styled.form`
  display: grid;
  gap: 1rem;
  min-height: 0;
`

const LabelBlock = styled.label`
  display: grid;
  gap: 0.55rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textStrong};
`

const Textarea = styled.textarea`
  min-height: 8.5rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};
  resize: vertical;
  line-height: 1.7;

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.28);
    outline-offset: 2px;
  }
`

const CategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`

const CategoryChip = styled.button<{ $active: boolean; $accent: string }>`
  min-height: 2.8rem;
  padding: 0.7rem 0.95rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, $accent, theme }) =>
      $active ? $accent : theme.colors.borderStrong};
  background: ${({ $active, $accent }) =>
    $active ? `${$accent}22` : 'rgba(255, 255, 255, 0.85)'};
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ColorButton = styled.button<{
  $active: boolean
  $background: string
  $border: string
}>`
  display: grid;
  grid-template-columns: 1.2rem minmax(0, 1fr);
  align-items: center;
  gap: 0.7rem;
  min-height: 3rem;
  padding: 0.75rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid
    ${({ $active, $border, theme }) => ($active ? $border : theme.colors.borderStrong)};
  background: ${({ $active }) =>
    $active ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.8)'};
  text-align: left;
  color: ${({ theme }) => theme.colors.textStrong};
`

const Swatch = styled.span<{ $background: string; $border: string }>`
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.35rem;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
`

const PasswordInput = styled.input`
  min-height: 3rem;
  padding: 0 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.28);
    outline-offset: 2px;
  }
`

const TextInput = styled.input`
  min-height: 3rem;
  padding: 0 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.28);
    outline-offset: 2px;
  }
`

const HelperText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.92rem;
  line-height: 1.6;
`

const ErrorText = styled.p`
  margin: 0;
  color: #b64d4d;
  font-size: 0.92rem;
  line-height: 1.6;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`

const Actions = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-left: auto;
  flex-wrap: wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    margin-left: 0;
    display: grid;
    grid-template-columns: 1fr;
  }
`

const SecondaryButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.82);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const DeleteButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: rgba(219, 93, 93, 0.14);
  color: #9b3a3a;
  font-weight: 700;
`

const PrimaryButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1.15rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 14px 24px rgba(77, 122, 84, 0.2);
`

const Divider = styled.div`
  height: 1px;
  margin: 1.2rem 0;
  background: ${({ theme }) => theme.colors.borderSoft};
`

const CommentSection = styled.section`
  display: grid;
  gap: 0.9rem;
`

const ReactionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
`

const LikeActionButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.55rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? 'rgba(255, 106, 129, 0.18)' : 'rgba(255, 255, 255, 0.85)'};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  h3 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.35rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.86rem;
  }
`

const CommentList = styled.div`
  display: grid;
  gap: 0.75rem;
`

const CommentCard = styled.article`
  padding: 0.85rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(255, 255, 255, 0.78);
`

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.4rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.82rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

const CommentBody = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textStrong};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`

const CommentEmpty = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.68);
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`

const CommentForm = styled.form`
  display: grid;
  gap: 0.75rem;
`

const CommentRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.7rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`

const CommentTextarea = styled.textarea`
  min-height: 4.1rem;
  padding: 0.9rem 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};
  resize: vertical;
  line-height: 1.6;

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.28);
    outline-offset: 2px;
  }
`

const CommentSubmitButton = styled.button`
  min-width: 6.2rem;
  min-height: 4.1rem;
  padding: 0.8rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
`

const MAX_NOTE_LENGTH = 1000
const MAX_COMMENT_LENGTH = 240

function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function NoteEditorDialog({
  note,
  onClose,
  onToggleLike,
  onSave,
  onDelete,
  onAddComment,
}: NoteEditorDialogProps) {
  const [author, setAuthor] = useState(note.author)
  const [content, setContent] = useState(note.content)
  const [category, setCategory] = useState<BoardCategory>(note.category)
  const [color, setColor] = useState<PostItColor>(note.color)
  const [password, setPassword] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commentErrorMessage, setCommentErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSaving(true)
    setErrorMessage(null)

    const result = await onSave({
      id: note.id,
      category,
      author: author.trim() || '익명',
      color,
      content: content.trim(),
      password: password.trim(),
    })

    setIsSaving(false)

    if (!result.ok) {
      setErrorMessage(result.message ?? '포스트잇 수정에 실패했어요.')
      return
    }

    onClose()
  }

  async function handleDelete() {
    const confirmed = window.confirm('이 포스트잇을 삭제할까요?')

    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const result = await onDelete({
      id: note.id,
      password: password.trim(),
    })

    setIsSaving(false)

    if (!result.ok) {
      setErrorMessage(result.message ?? '포스트잇 삭제에 실패했어요.')
      return
    }

    onClose()
  }

  async function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedComment = commentDraft.trim()

    if (!trimmedComment) {
      return
    }

    setIsCommentSubmitting(true)
    setCommentErrorMessage(null)

    const result = await onAddComment({
      noteId: note.id,
      author: '익명',
      content: trimmedComment,
    })

    setIsCommentSubmitting(false)

    if (!result.ok) {
      setCommentErrorMessage(result.message ?? '댓글 저장에 실패했어요.')
      return
    }

    setCommentDraft('')
  }

  async function handleLikeToggle() {
    setIsLikeSubmitting(true)
    const result = await onToggleLike(note.id)
    setIsLikeSubmitting(false)

    if (!result.ok) {
      setCommentErrorMessage(result.message ?? '좋아요 처리에 실패했어요.')
    }
  }

  return (
    <Backdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Dialog
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        onClick={(event) => event.stopPropagation()}
      >
        <Header>
          <TitleWrap>
            <h2>포스트잇 수정</h2>
            <p>작성할 때 설정한 비밀번호를 입력하면 수정하거나 삭제할 수 있어요.</p>
          </TitleWrap>

          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            ×
          </CloseButton>
        </Header>

        <Form onSubmit={handleSubmit}>
          <LabelBlock>
            이름
            <TextInput
              type="text"
              placeholder="익명"
              value={author}
              maxLength={40}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </LabelBlock>

          <LabelBlock>
            메모 내용
            <Textarea
              value={content}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setContent(event.target.value)}
              required
            />
            <HelperText>{content.length} / {MAX_NOTE_LENGTH}</HelperText>
          </LabelBlock>

          <LabelBlock>
            카테고리
            <CategoryRow>
              {BOARD_CATEGORY_ORDER.map((item) => {
                const meta = BOARD_CATEGORY_META[item]

                return (
                  <CategoryChip
                    key={item}
                    type="button"
                    $active={category === item}
                    $accent={meta.accent}
                    onClick={() => setCategory(item)}
                  >
                    {meta.label}
                  </CategoryChip>
                )
              })}
            </CategoryRow>
          </LabelBlock>

          <LabelBlock>
            포스트잇 색상
            <ColorGrid>
              {Object.entries(POST_IT_COLOR_META).map(([key, meta]) => (
                <ColorButton
                  key={key}
                  type="button"
                  $active={color === key}
                  $background={meta.background}
                  $border={meta.border}
                  onClick={() => setColor(key as PostItColor)}
                >
                  <Swatch $background={meta.background} $border={meta.border} />
                  <span>{meta.label}</span>
                </ColorButton>
              ))}
            </ColorGrid>
          </LabelBlock>

          <LabelBlock>
            비밀번호 확인
            <PasswordInput
              type="password"
              placeholder="작성 비밀번호 입력"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </LabelBlock>

          {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}

          <Footer>
            <HelperText>드래그 위치는 비밀번호 없이도 그대로 저장됩니다.</HelperText>

            <Actions>
              <SecondaryButton type="button" onClick={onClose} disabled={isSaving}>
                닫기
              </SecondaryButton>
              <DeleteButton type="button" onClick={handleDelete} disabled={isSaving}>
                삭제하기
              </DeleteButton>
              <PrimaryButton type="submit" disabled={isSaving}>
                {isSaving ? '저장 중...' : '변경 저장'}
              </PrimaryButton>
            </Actions>
          </Footer>
        </Form>

        <Divider />

        <CommentSection>
          <ReactionRow>
            <LikeActionButton
              type="button"
              $active={note.isLiked ?? false}
              disabled={isLikeSubmitting}
              onClick={handleLikeToggle}
            >
              <span>{note.isLiked ? '♥' : '♡'}</span>
              <span>좋아요 {note.likesCount ?? 0}</span>
            </LikeActionButton>
            <HelperText>댓글 {note.comments?.length ?? 0}개</HelperText>
          </ReactionRow>

          <CommentHeader>
            <h3>댓글</h3>
            <span>{note.comments?.length ?? 0}개</span>
          </CommentHeader>

          {note.comments && note.comments.length > 0 ? (
            <CommentList>
              {note.comments.map((comment) => (
                <CommentCard key={comment.id}>
                  <CommentMeta>
                    <strong>{comment.author}</strong>
                    <span>{formatCommentTime(comment.createdAt)}</span>
                  </CommentMeta>
                  <CommentBody>{comment.content}</CommentBody>
                </CommentCard>
              ))}
            </CommentList>
          ) : (
            <CommentEmpty>아직 댓글이 없어요. 첫 댓글을 남겨보세요.</CommentEmpty>
          )}

          <CommentForm onSubmit={handleCommentSubmit}>
            <HelperText>{commentDraft.length} / {MAX_COMMENT_LENGTH}</HelperText>
            <CommentRow>
              <CommentTextarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="익명으로 댓글 남기기"
                maxLength={MAX_COMMENT_LENGTH}
                rows={3}
              />
              <CommentSubmitButton type="submit" disabled={isCommentSubmitting}>
                {isCommentSubmitting ? '등록 중' : '댓글 등록'}
              </CommentSubmitButton>
            </CommentRow>
            {commentErrorMessage ? <ErrorText>{commentErrorMessage}</ErrorText> : null}
          </CommentForm>
        </CommentSection>
      </Dialog>
    </Backdrop>
  )
}
