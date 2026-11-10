import { useState } from 'react'
import styled from 'styled-components'
import {
  MAX_AUTHOR_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../../constants/board'
import { useBoardStore } from '../../store/useBoardStore'
import type { BoardCategory, BoardNote, PostItColor, UpdateBoardNoteInput } from '../../types/board'
import { CategoryPicker, CharacterCounter, ColorPicker, ImagePicker } from './NoteFormFields'
import { FieldError, FieldHint, FieldLabel, TextAreaField, TextField } from './NoteFormFields.style'
import { useImageAttachment } from './useImageAttachment'

interface NoteEditFormProps {
  note: BoardNote
  ownedSecret: string | null
  onCancel: () => void
  onSave: (input: UpdateBoardNoteInput) => Promise<{ ok: boolean; message?: string }>
  onSaved: () => void
}

const Form = styled.form`
  display: grid;
  gap: 1rem;
`

const Section = styled.div`
  display: grid;
  gap: 0.5rem;
`

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
`

const DecorRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`

const FieldGrid = styled.div`
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

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.7rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
`

const SecondaryButton = styled.button`
  min-height: 2.9rem;
  padding: 0.75rem 1.1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.85);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const PrimaryButton = styled.button`
  min-height: 2.9rem;
  padding: 0.75rem 1.3rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 800;

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`

export function NoteEditForm({ note, ownedSecret, onCancel, onSave, onSaved }: NoteEditFormProps) {
  const dataSource = useBoardStore((state) => state.dataSource)
  // 수정 중에는 다른 사람의 실시간 변경이 입력을 덮지 않도록 열 때의 값으로 편집한다
  const [category, setCategory] = useState<BoardCategory>(note.category)
  const [color, setColor] = useState<PostItColor>(note.color)
  const [content, setContent] = useState(note.content)
  const [author, setAuthor] = useState(note.author === '익명' ? '' : note.author)
  const [password, setPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const image = useImageAttachment({
    initialUrl: note.imageUrl ?? null,
    shouldUpload: dataSource === 'supabase',
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedContent = content.trim()
    const resolvedPassword = ownedSecret ?? password.trim()

    if (!trimmedContent) {
      setErrorMessage('내용을 비워둘 수는 없어요.')
      return
    }

    if (!resolvedPassword) {
      setErrorMessage('작성할 때 정한 비밀번호를 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    let imageUrl: string | null = null

    try {
      imageUrl = await image.resolveImageUrl()
    } catch (error) {
      setIsSaving(false)
      setErrorMessage(error instanceof Error ? error.message : '사진 업로드에 실패했어요.')
      return
    }

    const result = await onSave({
      id: note.id,
      category,
      author: author.trim() || '익명',
      color,
      content: trimmedContent,
      imageUrl,
      password: resolvedPassword,
    })

    setIsSaving(false)

    if (!result.ok) {
      setErrorMessage(result.message ?? '포스트잇 수정에 실패했어요.')
      return
    }

    onSaved()
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Section>
        <FieldLabel>카테고리</FieldLabel>
        <CategoryPicker value={category} onChange={setCategory} compact />
      </Section>

      <Section>
        <LabelRow>
          <FieldLabel as="label" htmlFor="note-edit-content">
            내용
          </FieldLabel>
          <CharacterCounter length={content.length} max={MAX_NOTE_LENGTH} />
        </LabelRow>
        <TextAreaField
          id="note-edit-content"
          value={content}
          maxLength={MAX_NOTE_LENGTH}
          autoFocus
          onChange={(event) => setContent(event.target.value)}
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
          disabled={isSaving}
          onSelect={(file) => void image.select(file)}
          onRemove={image.remove}
        />
      </DecorRow>
      {image.error ? <FieldError>{image.error}</FieldError> : null}

      <FieldGrid>
        <label>
          <FieldLabel>닉네임</FieldLabel>
          <TextField
            type="text"
            placeholder="비워두면 익명"
            value={author}
            maxLength={MAX_AUTHOR_LENGTH}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>
        {ownedSecret ? null : (
          <label>
            <FieldLabel>비밀번호 확인</FieldLabel>
            <TextField
              type="password"
              placeholder="작성할 때 정한 비밀번호"
              autoComplete="current-password"
              value={password}
              maxLength={MAX_PASSWORD_LENGTH}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}
      </FieldGrid>
      {ownedSecret ? <FieldHint>이 기기에서 쓴 포스트잇이라 비밀번호 없이 저장돼요.</FieldHint> : null}

      {errorMessage ? <FieldError role="alert">{errorMessage}</FieldError> : null}

      <Actions>
        <SecondaryButton type="button" onClick={onCancel} disabled={isSaving}>
          취소
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSaving || image.isPreparing}>
          {isSaving ? '저장 중...' : '변경 저장'}
        </PrimaryButton>
      </Actions>
    </Form>
  )
}
