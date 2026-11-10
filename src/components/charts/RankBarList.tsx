import styled, { css } from 'styled-components'
import { CHART_NEUTRAL } from './chart.constants'

export interface RankBarItem {
  key: string
  label: string
  value: number
  caption?: string
  isMuted?: boolean
}

interface RankBarListProps {
  items: RankBarItem[]
  color: string
  unit: string
  onSelect?: (key: string) => void
  getSelectTitle?: (item: RankBarItem) => string
}

const MIN_BAR_RATIO = 0.02

// 라벨 칸은 가장 긴 라벨 기준(최대 40%)으로 잡고, 행은 subgrid로 같은 칸을 공유해 막대 시작점을 맞춘다
const List = styled.ol`
  display: grid;
  grid-template-columns: fit-content(40%) minmax(0, 1fr) auto;
  column-gap: 0.85rem;
  row-gap: 0.15rem;
  margin: 0;
  padding: 0;
  list-style: none;

  > li {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }
`

const rowLayout = css`
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
  padding: 0.5rem 0.55rem;
  border-radius: 0.6rem;
  font-size: 0.88rem;
  text-align: left;
`

const Row = styled.div`
  ${rowLayout}
`

const RowButton = styled.button`
  ${rowLayout}
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover,
  &:focus-visible {
    background: ${CHART_NEUTRAL.hoverBackground};
  }
`

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const Track = styled.span`
  position: relative;
  height: 0.5rem;
  border-radius: 999px;
  background: ${CHART_NEUTRAL.track};
`

const Fill = styled.span<{ $ratio: number; $color: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $ratio }) => `${Math.max(MIN_BAR_RATIO, $ratio) * 100}%`};
  border-radius: inherit;
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}99 0%, ${$color} 100%)`};
  transform-origin: left center;
  animation: rank-bar-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes rank-bar-grow {
    from {
      transform: scaleX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Value = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.35rem;
  min-width: 4.2rem;
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.76rem;
    font-weight: 700;
  }
`

export function RankBarList({ items, color, unit, onSelect, getSelectTitle }: RankBarListProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <List>
      {items.map((item) => {
        const content = (
          <>
            <Label title={item.label}>{item.label}</Label>
            <Track aria-hidden="true">
              <Fill
                $ratio={item.value / maxValue}
                $color={item.isMuted ? CHART_NEUTRAL.baseline : color}
              />
            </Track>
            <Value>
              {item.value.toLocaleString()}
              {unit}
              {item.caption ? <small>{item.caption}</small> : null}
            </Value>
          </>
        )

        return (
          <li key={item.key}>
            {onSelect ? (
              <RowButton
                type="button"
                onClick={() => onSelect(item.key)}
                title={getSelectTitle?.(item)}
              >
                {content}
              </RowButton>
            ) : (
              <Row>{content}</Row>
            )}
          </li>
        )
      })}
    </List>
  )
}
