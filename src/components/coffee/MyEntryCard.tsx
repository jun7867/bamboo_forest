import { useState } from 'react'
import type { FormEvent } from 'react'
import styled from 'styled-components'
import { readCoffeeNickname } from '../../lib/coffeeIdentity'
import {
  COFFEE_MENU_MAX_LENGTH,
  COFFEE_NICKNAME_MAX_LENGTH,
  normalizeCoffeeMenu,
} from '../../lib/coffeeOrders'
import type { CoffeeEntryStatus, SubmitCoffeeEntryInput } from '../../store/useCoffeeStore'
import type { CoffeeEntry, CoffeeRound } from '../../types/coffee'
import { FieldLabel, TextField } from '../board/NoteFormFields.style'
import { ButtonRow, Card, CardHeader, CardTitle, PrimaryButton, SecondaryButton, StatusMessage } from './coffee.style'

const MENU_PRESETS = ['아이스 아메리카노', '아메리카노', '카페라떼', '바닐라라떼', '디카페인', '아이스티']

interface MyEntryCardProps {
  round: CoffeeRound
  myEntry: CoffeeEntry | null
  isSubmitting: boolean
  isWithdrawing: boolean
  status: Pick<CoffeeEntryStatus, 'tone' | 'message'> | null
  onSubmit: (input: SubmitCoffeeEntryInput) => void
  onWithdraw: () => void
}

const Form = styled.form`
  display: grid;
  gap: 0.9rem;
`

const Field = styled.label`
  display: grid;
  gap: 0.45rem;
`

const MenuField = styled.div`
  display: grid;
  gap: 0.5rem;
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 0.38rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${({ $active, theme }) => ($active ? 'rgba(78, 141, 84, 0.55)' : theme.colors.borderStrong)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : 'rgba(255, 255, 255, 0.86)')};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.84rem;
  font-weight: 700;
`

export function MyEntryCard({
  round,
  myEntry,
  isSubmitting,
  isWithdrawing,
  status,
  onSubmit,
  onWithdraw,
}: MyEntryCardProps) {
  // 부모가 내 응답이 바뀔 때마다 key로 다시 만들어 서버 값으로 채운다
  const [nickname, setNickname] = useState(() => myEntry?.nickname ?? readCoffeeNickname())
  const [menu, setMenu] = useState(myEntry?.menu ?? '')

  // 마감된 판에는 응답 칸을 두지 않는다. 내 참가 내용은 참가자 목록에서 보인다
  if (round.status !== 'open') {
    return null
  }

  const normalizedMenu = normalizeCoffeeMenu(menu)
  const isUnchanged = myEntry !== null && myEntry.nickname === nickname.trim() && myEntry.menu === normalizedMenu
  // 빈 칸 안내는 스토어 검증 메시지로 보여주려고 버튼은 막지 않는다
  const canSubmit = !isSubmitting && !isWithdrawing && !isUnchanged

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    onSubmit({ roundId: round.id, nickname, menu })
  }

  return (
    <Card aria-labelledby="coffee-my-entry-title">
      <CardHeader>
        <CardTitle id="coffee-my-entry-title">참가</CardTitle>
      </CardHeader>

      <Form onSubmit={handleSubmit}>
        <Field>
          <FieldLabel>닉네임</FieldLabel>
          <TextField
            value={nickname}
            maxLength={COFFEE_NICKNAME_MAX_LENGTH}
            autoComplete="nickname"
            onChange={(event) => setNickname(event.target.value)}
          />
        </Field>

        {/* label이 칩 버튼까지 감싸면 칩을 누를 때 입력칸 포커스·접근성 이름이 섞여서 label은 입력칸만 감싼다 */}
        <MenuField>
          <Field>
            <FieldLabel>메뉴</FieldLabel>
            <TextField
              value={menu}
              maxLength={COFFEE_MENU_MAX_LENGTH}
                onChange={(event) => setMenu(event.target.value)}
            />
          </Field>
          <ChipRow role="group" aria-label="자주 쓰는 메뉴">
            {MENU_PRESETS.map((preset) => (
              <Chip
                key={preset}
                type="button"
                $active={normalizedMenu === preset}
                aria-pressed={normalizedMenu === preset}
                onClick={() => setMenu(preset)}
              >
                {preset}
              </Chip>
            ))}
          </ChipRow>
        </MenuField>

        <ButtonRow>
          <PrimaryButton type="submit" disabled={!canSubmit}>
            {myEntry ? '수정' : '참가'}
          </PrimaryButton>
          {myEntry ? (
            <SecondaryButton type="button" disabled={isSubmitting || isWithdrawing} onClick={onWithdraw}>
              참가 취소
            </SecondaryButton>
          ) : null}
        </ButtonRow>

        {status ? (
          <StatusMessage $tone={status.tone} role={status.tone === 'error' ? 'alert' : 'status'}>
            {status.message}
          </StatusMessage>
        ) : null}
      </Form>
    </Card>
  )
}
