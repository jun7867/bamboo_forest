import styled from 'styled-components'
import type { CoffeeOrderLine } from '../../types/coffee'
import { Card, CardHeader, CardMeta, CardTitle } from './coffee.style'

interface OrderSummaryProps {
  lines: CoffeeOrderLine[]
}

const List = styled.ol`
  display: grid;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Line = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.5rem 0.2rem;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.borderStrong};

  &:last-child {
    border-bottom: 0;
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 700;
  }

  strong {
    flex-shrink: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.15rem;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.primaryDeep};
  }
`

export function OrderSummary({ lines }: OrderSummaryProps) {
  const total = lines.reduce((sum, line) => sum + line.count, 0)

  if (lines.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby="coffee-order-summary-title">
      <CardHeader>
        <CardTitle id="coffee-order-summary-title">주문 요약</CardTitle>
        <CardMeta>
          총 <strong>{total}</strong>잔
        </CardMeta>
      </CardHeader>

      <List>
          {lines.map((line) => (
            <Line key={line.menu}>
              <span>{line.menu}</span>
              <strong>× {line.count}</strong>
            </Line>
          ))}
      </List>
    </Card>
  )
}
