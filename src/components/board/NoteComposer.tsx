import { useState } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
} from '../../constants/board'
import type { BoardCategory, CreateBoardNoteInput, PostItColor } from '../../types/board'

interface NoteComposerProps {
  initialCategory: BoardCategory
  initialColor: PostItColor
  onClose: () => void
  onSubmit: (input: CreateBoardNoteInput) => Promise<{
    ok: boolean
    message?: string
  }>
}

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 80;
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

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
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

const Actions = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-left: auto;

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

const PrimaryButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1.15rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 14px 24px rgba(77, 122, 84, 0.2);
`

const MAX_NOTE_LENGTH = 120

export function NoteComposer({
  initialCategory,
  initialColor,
  onClose,
  onSubmit,
}: NoteComposerProps) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<BoardCategory>(initialCategory)
  const [color, setColor] = useState<PostItColor>(initialColor)
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedContent = content.trim()
    const trimmedPassword = password.trim()

    if (!trimmedContent || !trimmedPassword) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await onSubmit({
      category,
      color,
      content: trimmedContent,
      password: trimmedPassword,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      setErrorMessage(result.message ?? '포스트잇 저장에 실패했어요.')
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
            <h2>포스트잇 추가</h2>
            <p>내용, 카테고리, 색상을 정하고 보드에 붙여보세요.</p>
          </TitleWrap>

          <CloseButton type="button" onClick={onClose} aria-label="닫기">
            ×
          </CloseButton>
        </Header>

        <Form onSubmit={handleSubmit}>
          <LabelBlock>
            메모 내용
            <Textarea
              placeholder="팀에 남기고 싶은 한마디를 적어주세요."
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
            포스트잇 비밀번호
            <PasswordInput
              type="password"
              placeholder="수정/삭제 때 사용할 비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </LabelBlock>

          <Footer>
            <div>
              <HelperText>
                저장 후에는 같은 비밀번호로 수정/삭제할 수 있어요.
              </HelperText>
              {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
            </div>

            <Actions>
              <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
                취소
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : '보드에 붙이기'}
              </PrimaryButton>
            </Actions>
          </Footer>
        </Form>
      </Dialog>
    </Backdrop>
  )
}
