import styled from 'styled-components'
import { CHART_NEUTRAL, CHART_PALETTE, formatPercent } from './chart.constants'

export interface FunnelStep {
  key: string
  label: string
  value: number
}

interface FunnelChartProps {
  steps: FunnelStep[]
  unit: string
}

const STEP_COLOR = CHART_PALETTE[0]
const MIN_BAR_RATIO = 0.01

const Summary = styled.p`
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.4rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  font-weight: 700;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.05rem;
  }
`

const Rows = styled.ol`
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr) 3.5rem 3.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;

  &:hover {
    background: ${CHART_NEUTRAL.hoverBackground};
  }

  > span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 700;
  }

  > strong {
    color: ${({ theme }) => theme.colors.textStrong};
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`

const Track = styled.div`
  position: relative;
  height: 1.4rem;
  border-radius: 0.35rem;
  background: ${CHART_NEUTRAL.track};
  overflow: hidden;
`

const Bar = styled.div<{ $ratio: number; $color: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $ratio }) => `${$ratio * 100}%`};
  border-radius: 0.35rem;
  background: ${({ $color }) => $color};
`

const Conversion = styled.small<{ $isWorst: boolean }>`
  color: ${({ $isWorst, theme }) => ($isWorst ? CHART_NEUTRAL.dropStrong : theme.colors.textMuted)};
  font-size: 0.78rem;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
`

export function FunnelChart({ steps, unit }: FunnelChartProps) {
  const firstValue = steps[0]?.value ?? 0
  const lastValue = steps[steps.length - 1]?.value ?? 0
  const conversions = steps.map((step, index) => {
    const previous = steps[index - 1]?.value

    return previous ? step.value / previous : null
  })
  const worstIndex = conversions.reduce<number>((worst, rate, index) => {
    const worstRate = conversions[worst]

    return rate !== null && (worstRate === null || rate < worstRate) ? index : worst
  }, 0)

  function toRatio(value: number) {
    return firstValue > 0 ? Math.max(value / firstValue, value > 0 ? MIN_BAR_RATIO : 0) : 0
  }

  return (
    <>
      <Summary>
        전체 전환율 <strong>{firstValue > 0 ? formatPercent(lastValue / firstValue) : '—'}</strong>
      </Summary>
      <Rows>
        {steps.map((step, index) => {
          const rate = conversions[index]
          const previousValue = steps[index - 1]?.value

          return (
            <Row key={step.key}>
              <span>{step.label}</span>
              <Track
                role="img"
                aria-label={`${step.label} ${step.value}${unit}${rate !== null ? `, 이전 단계 대비 ${formatPercent(rate)}` : ''}`}
              >
                {previousValue !== undefined ? (
                  <Bar $ratio={toRatio(previousValue)} $color={CHART_NEUTRAL.drop} />
                ) : null}
                <Bar $ratio={toRatio(step.value)} $color={STEP_COLOR} />
              </Track>
              <strong>
                {step.value.toLocaleString()}
                {unit}
              </strong>
              <Conversion $isWorst={index === worstIndex && rate !== null && rate < 1}>
                {rate === null ? '—' : formatPercent(rate)}
              </Conversion>
            </Row>
          )
        })}
      </Rows>
    </>
  )
}
