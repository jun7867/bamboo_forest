import { useState } from 'react'
import type { FormEvent } from 'react'
import styled from 'styled-components'
import { COFFEE_TITLE_MAX_LENGTH } from '../../lib/coffeeOrders'
import { FieldLabel, TextField } from '../board/NoteFormFields.style'
import { ButtonRow, Card, CardHeader, CardTitle, PrimaryButton, StatusMessage } from './coffee.style'

interface OpenRoundCardProps {
  isOpening: boolean
  onOpen: (title: string) => Promise<{ ok: boolean; message?: string }>
}

const Form = styled.form`
  display: grid;
  gap: 0.75rem;
`

const Field = styled.label`
  display: grid;
  gap: 0.45rem;
`

export function OpenRoundCard({ isOpening, onOpen }: OpenRoundCardProps) {
  const [title, setTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const result = await onOpen(title)

    if (!result.ok) {
      setErrorMessage(result.message ?? '새 판을 열지 못했어요.')
    }
  }

  return (
    <Card aria-labelledby="coffee-open-round-title">
      <CardHeader>
        <CardTitle id="coffee-open-round-title">새 판 열기</CardTitle>
      </CardHeader>
      <Form onSubmit={(event) => void handleSubmit(event)}>
        <Field>
          <FieldLabel>판 이름</FieldLabel>
          <TextField
            value={title}
            maxLength={COFFEE_TITLE_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <ButtonRow>
          <PrimaryButton type="submit" disabled={isOpening}>
            {isOpening ? '여는 중...' : '열기'}
          </PrimaryButton>
        </ButtonRow>
        {errorMessage ? (
          <StatusMessage $tone="error" role="alert">
            {errorMessage}
          </StatusMessage>
        ) : null}
      </Form>
    </Card>
  )
}
