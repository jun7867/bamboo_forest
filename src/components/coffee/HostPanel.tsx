import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import styled from 'styled-components'
import { TextField } from '../board/NoteFormFields.style'
import { ButtonRow, Card, CardHeader, CardTitle, DarkButton, SecondaryButton, StatusMessage } from './coffee.style'

const CONFIRM_RESET_MS = 5000
// 더블클릭 한 번이 "누르고 한 번 더 누르기"로 처리되어 바로 마감되지 않게, 첫 클릭 직후 짧게 두 번째 클릭을 무시한다
const CONFIRM_GUARD_MS = 600

interface HostPanelProps {
  isHost: boolean
  participantCount: number
  isClosing: boolean
  onClose: (adminPassword?: string) => Promise<{ ok: boolean; message?: string }>
}

const AdminDetails = styled.details`
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  padding: 0.7rem 0.9rem;

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.88rem;
    font-weight: 700;
  }

  form {
    display: grid;
    gap: 0.6rem;
    margin-top: 0.7rem;
  }
`

export function HostPanel({ isHost, participantCount, isClosing, onClose }: HostPanelProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const resetTimerRef = useRef<number | undefined>(undefined)
  const armedAtRef = useRef(0)

  useEffect(() => () => window.clearTimeout(resetTimerRef.current), [])

  // 실수로 한 번 눌러 마감되지 않도록 confirm() 대신 두 번 눌러야 확정한다
  async function handleHostClose() {
    if (!isConfirming) {
      armedAtRef.current = Date.now()
      setIsConfirming(true)
      setErrorMessage(null)
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => setIsConfirming(false), CONFIRM_RESET_MS)
      return
    }

    if (Date.now() - armedAtRef.current < CONFIRM_GUARD_MS) {
      return
    }

    window.clearTimeout(resetTimerRef.current)
    setIsConfirming(false)

    const result = await onClose()

    if (!result.ok) {
      setErrorMessage(result.message ?? '마감하지 못했어요.')
    }
  }

  async function handleAdminClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const result = await onClose(adminPassword)

    if (result.ok) {
      setAdminPassword('')
      return
    }

    setErrorMessage(result.message ?? '마감하지 못했어요.')
  }

  const hasParticipants = participantCount > 0
  // 참가자 없이 열어 둔 판도 끝낼 수 있어야 새 판을 열 수 있다. 이때는 뽑지 않고 닫기만 한다
  const closeLabel = hasParticipants ? '마감하고 뽑기' : '판 닫기'
  const closingLabel = hasParticipants ? '뽑는 중...' : '닫는 중...'

  return (
    <Card aria-labelledby="coffee-host-panel-title">
      <CardHeader>
        <CardTitle id="coffee-host-panel-title">마감하기</CardTitle>
      </CardHeader>

      {isHost ? (
        <ButtonRow>
          <DarkButton
            type="button"
            onClick={() => void handleHostClose()}
            disabled={isClosing}
          >
            {isClosing ? closingLabel : isConfirming ? '한 번 더 눌러 마감' : closeLabel}
          </DarkButton>
          {isConfirming ? (
            <SecondaryButton
              type="button"
              onClick={() => {
                window.clearTimeout(resetTimerRef.current)
                setIsConfirming(false)
              }}
            >
              취소
            </SecondaryButton>
          ) : null}
        </ButtonRow>
      ) : (
        <AdminDetails>
          <summary>관리자 비밀번호로 마감</summary>
          <form onSubmit={(event) => void handleAdminClose(event)}>
            <TextField
              type="password"
              value={adminPassword}
              placeholder="관리자 비밀번호"
              autoComplete="off"
              aria-label="관리자 비밀번호"
              onChange={(event) => setAdminPassword(event.target.value)}
            />
            <ButtonRow>
              <DarkButton type="submit" disabled={isClosing || !adminPassword.trim()}>
                {isClosing ? closingLabel : closeLabel}
              </DarkButton>
            </ButtonRow>
          </form>
        </AdminDetails>
      )}

      {errorMessage ? (
        <StatusMessage $tone="error" role="alert">
          {errorMessage}
        </StatusMessage>
      ) : null}
    </Card>
  )
}
