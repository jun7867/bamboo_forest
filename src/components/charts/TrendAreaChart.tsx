import { useId, useState } from 'react'
import type { PointerEvent } from 'react'
import styled, { useTheme } from 'styled-components'
import { CHART_NEUTRAL, getNiceTicks } from './chart.constants'
import { useElementWidth } from './useElementWidth'

export interface TrendPoint {
  key: string
  axisLabel: string
  tooltipLabel: string
}

export interface TrendSeries {
  key: string
  label: string
  color: string
  values: number[]
}

interface TrendAreaChartProps {
  points: TrendPoint[]
  series: TrendSeries[]
  unit: string
  height?: number
}

const PADDING = { top: 30, right: 16, bottom: 26, left: 34 }
const Y_INTERVALS = 3
const AXIS_LABEL_MIN_GAP = 46
const MARKER_POINT_LIMIT = 12
const TOOLTIP_WIDTH = 150

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  touch-action: pan-y;

  svg {
    display: block;
    overflow: visible;
  }

  text {
    font-family: inherit;
  }
`

const Tooltip = styled.div`
  position: absolute;
  top: 0.25rem;
  width: ${TOOLTIP_WIDTH}px;
  padding: 0.6rem 0.7rem;
  border-radius: 0.7rem;
  border: 1px solid ${CHART_NEUTRAL.grid};
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(36, 54, 37, 0.12);
  pointer-events: none;
  font-size: 0.78rem;

  b {
    display: block;
    margin-bottom: 0.35rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 700;
  }
`

const TooltipRow = styled.div`
  display: grid;
  grid-template-columns: 0.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.4rem;
  color: ${({ theme }) => theme.colors.textStrong};

  i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  strong {
    font-variant-numeric: tabular-nums;
  }

  small {
    grid-column: 2 / -1;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.72rem;
  }
`

function formatDelta(current: number, previous: number | undefined, unit: string) {
  if (previous === undefined) {
    return null
  }

  const delta = current - previous

  return delta === 0
    ? '이전과 같음'
    : `이전 대비 ${delta > 0 ? '+' : '−'}${Math.abs(delta)}${unit}`
}

export function TrendAreaChart({ points, series, unit, height = 220 }: TrendAreaChartProps) {
  const theme = useTheme()
  const gradientId = useId()
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [rawHoverIndex, setHoverIndex] = useState<number | null>(null)
  // 호버 중 데이터가 줄어들어도 범위를 벗어나지 않도록 렌더 시점에 보정한다
  const hoverIndex =
    rawHoverIndex !== null && rawHoverIndex < points.length ? rawHoverIndex : null

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0)
  const plotHeight = height - PADDING.top - PADDING.bottom
  const maxValue = Math.max(...series.flatMap((item) => item.values), 0)
  const ticks = getNiceTicks(maxValue, Y_INTERVALS)
  const yMax = ticks[ticks.length - 1]
  const isSingleSeries = series.length === 1
  const showMarkers = points.length <= MARKER_POINT_LIMIT
  const visibleLabelCount = Math.max(1, Math.floor(plotWidth / AXIS_LABEL_MIN_GAP))
  const labelStep = Math.max(1, Math.ceil(points.length / visibleLabelCount))
  const lastIndex = points.length - 1

  function getX(index: number) {
    if (points.length <= 1) {
      return PADDING.left + plotWidth / 2
    }

    return PADDING.left + (index / lastIndex) * plotWidth
  }

  function getY(value: number) {
    return PADDING.top + plotHeight - (value / yMax) * plotHeight
  }

  function toLinePath(values: number[]) {
    return values
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${getX(index)},${getY(value)}`)
      .join(' ')
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left) / Math.max(bounds.width, 1)
    const index = Math.round(ratio * lastIndex)

    setHoverIndex(Math.min(Math.max(index, 0), lastIndex))
  }

  const primary = series[0]
  const tooltipLeft =
    hoverIndex === null
      ? 0
      : getX(hoverIndex) + 12 + TOOLTIP_WIDTH > width
        ? getX(hoverIndex) - 12 - TOOLTIP_WIDTH
        : getX(hoverIndex) + 12

  return (
    <Wrapper ref={ref} style={{ height }}>
      {width > 0 && points.length > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={series
            .map(
              (item) =>
                `${item.label}: ${points
                  .map((point, index) => `${point.tooltipLabel} ${item.values[index]}${unit}`)
                  .join(', ')}`,
            )
            .join(' / ')}
        >
          <defs>
            {primary ? (
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primary.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={primary.color} stopOpacity={0} />
              </linearGradient>
            ) : null}
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + plotWidth}
                y1={getY(tick)}
                y2={getY(tick)}
                stroke={tick === 0 ? CHART_NEUTRAL.baseline : CHART_NEUTRAL.grid}
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 10}
                y={getY(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={CHART_NEUTRAL.axisLabel}
              >
                {tick.toLocaleString()}
              </text>
            </g>
          ))}

          {points.map((point, index) =>
            index % labelStep === 0 ? (
              <text
                key={point.key}
                x={getX(index)}
                y={height - 6}
                textAnchor="middle"
                fontSize={11}
                fill={CHART_NEUTRAL.axisLabel}
              >
                {point.axisLabel}
              </text>
            ) : null,
          )}

          {hoverIndex !== null ? (
            <line
              x1={getX(hoverIndex)}
              x2={getX(hoverIndex)}
              y1={PADDING.top}
              y2={PADDING.top + plotHeight}
              stroke={CHART_NEUTRAL.hoverGuide}
              strokeWidth={1}
            />
          ) : null}

          {isSingleSeries && primary ? (
            <path
              d={`${toLinePath(primary.values)} L${getX(lastIndex)},${getY(0)} L${getX(0)},${getY(0)} Z`}
              fill={`url(#${gradientId})`}
            />
          ) : null}

          {series.map((item) => (
            <path
              key={item.key}
              d={toLinePath(item.values)}
              fill="none"
              stroke={item.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {showMarkers
            ? series.map((item) =>
                item.values.map((value, index) =>
                  index === lastIndex && isSingleSeries ? null : (
                    <circle
                      key={`${item.key}-${points[index].key}`}
                      cx={getX(index)}
                      cy={getY(value)}
                      r={3}
                      fill="#ffffff"
                      stroke={item.color}
                      strokeWidth={2}
                    />
                  ),
                ),
              )
            : null}

          {isSingleSeries && primary ? (
            <g>
              <circle
                cx={getX(lastIndex)}
                cy={getY(primary.values[lastIndex])}
                r={5}
                fill={primary.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={getX(lastIndex)}
                y={getY(primary.values[lastIndex]) - 12}
                textAnchor="end"
                fontSize={12}
                fontWeight={800}
                fill={theme.colors.textStrong}
              >
                {primary.values[lastIndex]}
                {unit}
              </text>
            </g>
          ) : null}

          {hoverIndex !== null
            ? series.map((item) => (
                <circle
                  key={`hover-${item.key}`}
                  cx={getX(hoverIndex)}
                  cy={getY(item.values[hoverIndex])}
                  r={5}
                  fill={item.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))
            : null}

          <rect
            x={PADDING.left}
            y={0}
            width={plotWidth}
            height={height}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>
      ) : null}

      {hoverIndex !== null ? (
        <Tooltip style={{ left: tooltipLeft }}>
          <b>{points[hoverIndex].tooltipLabel}</b>
          {series.map((item) => {
            const delta = formatDelta(item.values[hoverIndex], item.values[hoverIndex - 1], unit)

            return (
              <TooltipRow key={item.key}>
                <i style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>
                  {item.values[hoverIndex]}
                  {unit}
                </strong>
                {delta ? <small>{delta}</small> : null}
              </TooltipRow>
            )
          })}
        </Tooltip>
      ) : null}
    </Wrapper>
  )
}
