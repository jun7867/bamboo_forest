import { useState } from 'react'
import styled from 'styled-components'
import { CHART_DIMMED_OPACITY, CHART_NEUTRAL, formatPercent } from './chart.constants'

export interface DonutChartItem {
  key: string
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  items: DonutChartItem[]
  totalLabel: string
  unit: string
}

const VIEWBOX_SIZE = 200
const RADIUS = 76
const RING_WIDTH = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SEGMENT_GAP = 2

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.25rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Legend = styled.ul`
  display: grid;
  gap: 0.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const LegendRow = styled.li<{ $dimmed: boolean }>`
  display: grid;
  grid-template-columns: 0.6rem minmax(0, 1fr) auto 3.4rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.55rem;
  border-radius: 0.6rem;
  opacity: ${({ $dimmed }) => ($dimmed ? CHART_DIMMED_OPACITY : 1)};
  font-size: 0.9rem;
  cursor: default;
  transition: opacity 0.14s ease, background 0.14s ease;

  &:hover {
    background: ${CHART_NEUTRAL.hoverBackground};
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 700;
  }

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-variant-numeric: tabular-nums;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`

const Dot = styled.i<{ $color: string }>`
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const Figure = styled.div`
  position: relative;
  width: 11.5rem;
  aspect-ratio: 1;
  justify-self: center;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  circle {
    transition: opacity 0.14s ease;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    order: -1;
    width: 10rem;
  }
`

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 0.1rem;
  text-align: center;
  pointer-events: none;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.9rem;
    line-height: 1.1;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 700;
  }
`

export function DonutChart({ items, totalLabel, unit }: DonutChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const visibleItems = items.filter((item) => item.value > 0)
  const activeItem = items.find((item) => item.key === activeKey) ?? null
  const gap = visibleItems.length > 1 ? SEGMENT_GAP : 0

  const segments = visibleItems.reduce<Array<DonutChartItem & { offset: number; length: number }>>(
    (accumulator, item) => {
      const previous = accumulator[accumulator.length - 1]
      const offset = previous ? previous.offset + previous.length + gap : 0
      const length = Math.max((item.value / total) * CIRCUMFERENCE - gap, 0.5)

      return [...accumulator, { ...item, offset, length }]
    },
    [],
  )

  return (
    <Layout>
      <Legend>
        {items.map((item) => (
          <LegendRow
            key={item.key}
            $dimmed={activeKey !== null && activeKey !== item.key}
            onMouseEnter={() => setActiveKey(item.key)}
            onMouseLeave={() => setActiveKey(null)}
          >
            <Dot $color={item.color} aria-hidden="true" />
            <span>{item.label}</span>
            <strong>
              {item.value.toLocaleString()}
              {unit}
            </strong>
            <small>{total > 0 ? formatPercent(item.value / total) : '—'}</small>
          </LegendRow>
        ))}
      </Legend>

      <Figure>
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          role="img"
          aria-label={items
            .map((item) => `${item.label} ${item.value}${unit}`)
            .join(', ')}
        >
          <circle
            cx={VIEWBOX_SIZE / 2}
            cy={VIEWBOX_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={CHART_NEUTRAL.track}
            strokeWidth={RING_WIDTH}
          />
          {segments.map((segment) => (
            <circle
              key={segment.key}
              cx={VIEWBOX_SIZE / 2}
              cy={VIEWBOX_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={activeKey === segment.key ? RING_WIDTH + 6 : RING_WIDTH}
              strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
              strokeDashoffset={-segment.offset}
              opacity={activeKey !== null && activeKey !== segment.key ? CHART_DIMMED_OPACITY : 1}
              onMouseEnter={() => setActiveKey(segment.key)}
              onMouseLeave={() => setActiveKey(null)}
            />
          ))}
        </svg>
        <Center>
          {activeItem ? (
            <>
              <strong>{total > 0 ? formatPercent(activeItem.value / total) : '—'}</strong>
              <span>{activeItem.label}</span>
            </>
          ) : (
            <>
              <strong>{total.toLocaleString()}</strong>
              <span>{totalLabel}</span>
            </>
          )}
        </Center>
      </Figure>
    </Layout>
  )
}
