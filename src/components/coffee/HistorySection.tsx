import styled from 'styled-components'
import {
  formatHistoryPeriod,
  getCurrentKstMonth,
  getHistoryPeriodKey,
  shiftKstMonth,
} from '../../lib/coffeeRanking'
import type { CoffeeHistory, CoffeeHistoryPeriod } from '../../types/coffee'
import { Card, EmptyText, Hint, PrimaryButton } from './coffee.style'
import { RankingList } from './RankingList'

interface HistorySectionProps {
  period: CoffeeHistoryPeriod
  history: CoffeeHistory | null
  historyPeriodKey: string | null
  isLoading: boolean
  error: string | null
  // 추첨 연출 중이면 결과가 미리 드러나지 않게 순위를 연출 뒤에 갱신한다
  isRevealing: boolean
  myClientKey: string | null
  onChangePeriod: (period: CoffeeHistoryPeriod) => void
  onRetry: () => void
}

const Section = styled.section`
  display: grid;
  gap: 1rem;
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.74);
`

const Segment = styled.div`
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(80, 115, 61, 0.08);
`

const SegmentButton = styled.button<{ $active: boolean }>`
  min-height: 2.4rem;
  padding: 0 1rem;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.textStrong : theme.colors.textMuted)};
  box-shadow: ${({ $active }) => ($active ? '0 6px 14px rgba(74, 96, 57, 0.14)' : 'none')};
  font-weight: 800;
  white-space: nowrap;
`

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  strong {
    min-width: 7.5rem;
    text-align: center;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.15rem;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

const NavButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 800;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const CenterCard = styled(Card)`
  justify-items: center;
  text-align: center;
`

export function HistorySection({
  period,
  history,
  historyPeriodKey,
  isLoading,
  error,
  isRevealing,
  myClientKey,
  onChangePeriod,
  onRetry,
}: HistorySectionProps) {
  const currentMonth = getCurrentKstMonth()
  const isCurrentPeriodLoaded = history !== null && historyPeriodKey === getHistoryPeriodKey(period)
  const periodLabel = period.kind === 'all' ? '전체 누적' : formatHistoryPeriod(period)
  const isLatestMonth =
    period.kind === 'month' && getHistoryPeriodKey(period) === getHistoryPeriodKey(currentMonth)

  function renderBody() {
    if (isCurrentPeriodLoaded && history) {
      return (
        <RankingList rows={history.ranking} periodLabel={periodLabel} myClientKey={myClientKey} />
      )
    }

    if (error && !isLoading) {
      return (
        <CenterCard role="alert">
          <Hint>{error}</Hint>
          <PrimaryButton type="button" onClick={onRetry}>
            다시 불러오기
          </PrimaryButton>
        </CenterCard>
      )
    }

    return (
      <CenterCard>
        <EmptyText>{isRevealing ? '' : '불러오는 중...'}</EmptyText>
      </CenterCard>
    )
  }

  return (
    <Section aria-label="누적 순위">
      <Toolbar>
        <Segment role="group" aria-label="집계 기간">
          <SegmentButton
            type="button"
            $active={period.kind === 'month'}
            aria-pressed={period.kind === 'month'}
            onClick={() => onChangePeriod(currentMonth)}
          >
            월별
          </SegmentButton>
          <SegmentButton
            type="button"
            $active={period.kind === 'all'}
            aria-pressed={period.kind === 'all'}
            onClick={() => onChangePeriod({ kind: 'all' })}
          >
            전체 누적
          </SegmentButton>
        </Segment>

        {period.kind === 'month' ? (
          <MonthNav>
            <NavButton
              type="button"
              aria-label="이전 달"
              onClick={() => onChangePeriod(shiftKstMonth(period, -1))}
            >
              ‹
            </NavButton>
            <strong aria-live="polite">{formatHistoryPeriod(period)}</strong>
            <NavButton
              type="button"
              aria-label="다음 달"
              disabled={isLatestMonth}
              onClick={() => onChangePeriod(shiftKstMonth(period, 1))}
            >
              ›
            </NavButton>
          </MonthNav>
        ) : null}
      </Toolbar>

      {renderBody()}
    </Section>
  )
}
