import styled from 'styled-components'
import { formatWon } from '../../lib/coffeeRanking'
import type { CoffeeRankingRow } from '../../types/coffee'
import { Card, CardHeader, CardMeta, CardTitle, EmptyText } from './coffee.style'

interface RankingListProps {
  rows: CoffeeRankingRow[]
  periodLabel: string
  myClientKey: string | null
}

const List = styled.ol`
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li<{ $mine: boolean }>`
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.2rem 0.7rem;
  padding: 0.65rem 0.85rem;
  border-radius: 0.95rem;
  border: 1px solid ${({ $mine, theme }) => ($mine ? 'rgba(78, 141, 84, 0.45)' : theme.colors.borderSoft)};
  background: rgba(255, 255, 255, 0.82);
`

const Rank = styled.span<{ $top: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: ${({ $top }) => ($top ? 'rgba(255, 180, 84, 0.28)' : 'rgba(80, 115, 61, 0.08)')};
  color: ${({ $top, theme }) => ($top ? '#8a5a12' : theme.colors.textMuted)};
  font-weight: 800;
  font-size: 0.9rem;
`

const Person = styled.div`
  display: grid;
  gap: 0.1rem;
  min-width: 0;

  strong {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 800;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    line-height: 1.45;
  }
`

const MineBadge = styled.em`
  flex-shrink: 0;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primaryDeep};
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 800;
`

const Amount = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.primaryDeep};
  white-space: nowrap;
`

export function RankingList({ rows, periodLabel, myClientKey }: RankingListProps) {
  return (
    <Card aria-labelledby="coffee-ranking-title">
      <CardHeader>
        <CardTitle id="coffee-ranking-title">누적 순위</CardTitle>
        <CardMeta>{periodLabel}</CardMeta>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyText>기록 없음</EmptyText>
      ) : (
        <List>
          {rows.map((row, index) => {
            const isMine = row.clientKey === myClientKey

            return (
              <Row key={row.clientKey} $mine={isMine}>
                <Rank $top={index < 3 && row.paidAmount > 0}>{index + 1}</Rank>
                <Person>
                  <strong>
                    <span title={row.nickname}>{row.nickname}</span>
                    {isMine ? <MineBadge>나</MineBadge> : null}
                  </strong>
                  <small>
                    쏜 {row.paidCount}회 · 가져온 {row.fetchCount}회 · 참가 {row.joinCount}회
                  </small>
                </Person>
                <Amount>{formatWon(row.paidAmount)}</Amount>
              </Row>
            )
          })}
        </List>
      )}
    </Card>
  )
}
