import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  MAX_AUTHOR_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PASSWORD_LENGTH,
  POST_IT_COLOR_ORDER,
} from '../../constants/board'
import { useBoardStore } from '../../store/useBoardStore'
import type { BoardCategory, CreateBoardNoteInput, PostItColor } from '../../types/board'
import { IconClose } from '../common/Icons'
import { Modal } from '../common/Modal'
import { ModalCloseButton, ModalHeader, ModalTitle } from '../common/Modal.style'
import { CategoryPicker, CharacterCounter, ColorPicker, ImagePicker } from './NoteFormFields'
import { FieldError, FieldHint, FieldLabel, TextAreaField, TextField } from './NoteFormFields.style'
import { useImageAttachment } from './useImageAttachment'
import { useNoteComposerTracking } from './useNoteComposerTracking'

interface NoteComposerProps {
  // 구역의 붙이기 버튼처럼 카테고리를 골라서 열었으면 초안보다 우선한다
  initialCategory: BoardCategory | null
  onClose: () => void
  onSubmit: (input: CreateBoardNoteInput) => Promise<{
    ok: boolean
    message?: string
  }>
}

interface ComposerDraft {
  category: BoardCategory
  color: PostItColor
  content: string
  author: string
}

const DRAFT_STORAGE_KEY = 'bamboo-note-draft'
const DEFAULT_COLOR: PostItColor = 'butter'
const DEFAULT_CATEGORY: BoardCategory = 'freeTalk'
// Safari는 한글 조합을 확정하는 Enter를 isComposing 없이 keyCode 229로 보낸다
const IME_PROCESS_KEY_CODE = 229
const SUBMIT_SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

const Form = styled.form`
  display: grid;
  gap: 1.1rem;
`

const Section = styled.div`
  display: grid;
  gap: 0.5rem;
`

const ContentLabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
`

const DraftNotice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.85rem;
  background: rgba(121, 175, 99, 0.12);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.84rem;

  button {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primaryDeep};
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }
`

const DecorRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`

const OptionalBox = styled.div`
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(255, 255, 255, 0.55);
`

const OptionalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }

  label {
    display: grid;
    gap: 0.4rem;
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.7rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
`

const ShortcutHint = styled.span`
  margin-right: auto;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`

const SecondaryButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1.1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.85);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const PrimaryButton = styled.button`
  min-height: 3rem;
  padding: 0.8rem 1.3rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 14px 24px rgba(77, 122, 84, 0.22);

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`

function readDraft(): ComposerDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: Partial<Record<keyof ComposerDraft, unknown>> = JSON.parse(raw)
    const category = BOARD_CATEGORY_ORDER.find((item) => item === parsed.category)
    const color = POST_IT_COLOR_ORDER.find((item) => item === parsed.color)

    if (!category || !color || typeof parsed.content !== 'string' || !parsed.content.trim()) {
      return null
    }

    return {
      category,
      color,
      content: parsed.content,
      author: typeof parsed.author === 'string' ? parsed.author : '',
    }
  } catch {
    return null
  }
}

function writeDraft(draft: ComposerDraft) {
  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // 임시 저장은 편의 기능이라 실패해도 작성은 계속할 수 있다
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // 저장소 접근이 막힌 환경이면 지울 것도 없다
  }
}

export function NoteComposer({ initialCategory, onClose, onSubmit }: NoteComposerProps) {
  const dataSource = useBoardStore((state) => state.dataSource)
  const [restoredDraft] = useState(readDraft)
  const [category, setCategory] = useState<BoardCategory>(
    initialCategory ?? restoredDraft?.category ?? DEFAULT_CATEGORY,
  )
  const [color, setColor] = useState<PostItColor>(restoredDraft?.color ?? DEFAULT_COLOR)
  const [content, setContent] = useState(restoredDraft?.content ?? '')
  const [author, setAuthor] = useState(restoredDraft?.author ?? '')
  const [password, setPassword] = useState('')
  const [isDraftNoticeVisible, setIsDraftNoticeVisible] = useState(restoredDraft !== null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const image = useImageAttachment({ shouldUpload: dataSource === 'supabase' })
  const tracking = useNoteComposerTracking({
    category,
    color,
    contentLength: content.trim().length,
    hasAuthor: author.trim().length > 0,
    hasPassword: password.trim().length > 0,
    hasImage: Boolean(image.file),
  })

  // 실수로 닫아도 다시 열면 이어서 쓸 수 있게 탭이 살아 있는 동안 초안을 남겨둔다
  useEffect(() => {
    if (!content.trim()) {
      clearDraft()
      return
    }

    writeDraft({ category, color, content, author })
  }, [category, color, content, author])

  function handleDiscardDraft() {
    clearDraft()
    setCategory(initialCategory ?? DEFAULT_CATEGORY)
    setColor(DEFAULT_COLOR)
    setContent('')
    setAuthor('')
    setIsDraftNoticeVisible(false)
    textareaRef.current?.focus()
  }

  function handleCategoryChange(nextCategory: BoardCategory) {
    setCategory(nextCategory)
    tracking.trackCategorySelected(nextCategory)
  }

  async function handleImageSelect(file: File) {
    const attachedFile = await image.select(file)

    if (attachedFile) {
      tracking.trackImageAttached(attachedFile.size, attachedFile.type)
    }
  }

  // 저장 중에 닫으면 결과를 볼 수 없고, 초안이 남아 같은 글을 두 번 올리게 된다
  function handleClose() {
    if (!isSubmitting) {
      onClose()
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting || image.isPreparing) {
      return
    }

    const trimmedContent = content.trim()

    tracking.trackSubmitAttempted()

    if (!trimmedContent) {
      tracking.trackSubmitBlocked('empty_content')
      setErrorMessage('남기고 싶은 내용을 적어주세요.')
      textareaRef.current?.focus()
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    let imageUrl: string | null = null

    try {
      imageUrl = await image.resolveImageUrl()
    } catch (error) {
      const message = error instanceof Error ? error.message : '사진 업로드에 실패했어요.'
      setIsSubmitting(false)
      setErrorMessage(message)
      tracking.trackFailed('image_upload', message)
      return
    }

    const result = await onSubmit({
      category,
      author: author.trim() || '익명',
      color,
      content: trimmedContent,
      imageUrl,
      password: password.trim() || undefined,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      const message = result.message ?? '포스트잇 저장에 실패했어요.'
      setErrorMessage(message)
      tracking.trackFailed('submit', message)
      return
    }

    clearDraft()
    tracking.trackCreated()
  }

  function handleContentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      (event.metaKey || event.ctrlKey) &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== IME_PROCESS_KEY_CODE
    ) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  const categoryMeta = BOARD_CATEGORY_META[category]

  return (
    <Modal ariaLabel="의견 남기기" onClose={handleClose}>
      <ModalHeader>
        <ModalTitle>
          <h2>의견 남기기</h2>
          <p>누가 썼는지는 아무도 몰라요. 편하게 남겨주세요.</p>
        </ModalTitle>
        <ModalCloseButton type="button" onClick={handleClose} aria-label="닫기" disabled={isSubmitting}>
          <IconClose />
        </ModalCloseButton>
      </ModalHeader>

      <Form ref={formRef} onSubmit={handleSubmit} noValidate>
        {isDraftNoticeVisible ? (
          <DraftNotice>
            <span>작성하던 내용을 불러왔어요.</span>
            <button type="button" onClick={handleDiscardDraft}>
              지우고 새로 쓰기
            </button>
          </DraftNotice>
        ) : null}

        <Section>
          <FieldLabel>어떤 이야기인가요?</FieldLabel>
          <CategoryPicker value={category} onChange={handleCategoryChange} />
        </Section>

        <Section>
          <ContentLabelRow>
            <FieldLabel as="label" htmlFor="note-composer-content">
              {categoryMeta.emoji} 내용
            </FieldLabel>
            <CharacterCounter length={content.length} max={MAX_NOTE_LENGTH} />
          </ContentLabelRow>
          <TextAreaField
            id="note-composer-content"
            ref={textareaRef}
            placeholder={categoryMeta.prompt}
            value={content}
            maxLength={MAX_NOTE_LENGTH}
            autoFocus
            onChange={(event) => {
              setContent(event.target.value)
              setErrorMessage(null)
            }}
            onKeyDown={handleContentKeyDown}
          />
        </Section>

        <DecorRow>
          <Section>
            <FieldLabel>포스트잇 색</FieldLabel>
            <ColorPicker value={color} onChange={setColor} />
          </Section>
          <ImagePicker
            previewUrl={image.previewUrl}
            isVideo={image.isVideo}
            isPreparing={image.isPreparing}
            disabled={isSubmitting}
            onSelect={(file) => void handleImageSelect(file)}
            onRemove={image.remove}
          />
        </DecorRow>
        {image.error ? <FieldError>{image.error}</FieldError> : null}

        <OptionalBox>
          <OptionalGrid>
            <label>
              <FieldLabel>닉네임 (선택)</FieldLabel>
              <TextField
                type="text"
                placeholder="비워두면 익명"
                value={author}
                maxLength={MAX_AUTHOR_LENGTH}
                onChange={(event) => setAuthor(event.target.value)}
              />
            </label>
            <label>
              <FieldLabel>비밀번호 (선택)</FieldLabel>
              <TextField
                type="password"
                placeholder="다른 기기에서 고칠 때 사용"
                autoComplete="new-password"
                value={password}
                maxLength={MAX_PASSWORD_LENGTH}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </OptionalGrid>
          <FieldHint>
            비밀번호를 비워두면 이 기기에서만 바로 수정·삭제할 수 있어요.
          </FieldHint>
        </OptionalBox>

        {errorMessage ? <FieldError role="alert">{errorMessage}</FieldError> : null}

        <Footer>
          <ShortcutHint>{SUBMIT_SHORTCUT_LABEL} + Enter로 바로 붙이기</ShortcutHint>
          <SecondaryButton type="button" onClick={handleClose} disabled={isSubmitting}>
            닫기
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting || image.isPreparing}>
            {isSubmitting ? '붙이는 중...' : '보드에 붙이기'}
          </PrimaryButton>
        </Footer>
      </Form>
    </Modal>
  )
}
