import styled from 'styled-components'
import type { CoffeeEntry } from '../../types/coffee'
import { Card, CardHeader, CardMeta, CardTitle, EmptyText } from './coffee.style'

interface EntryListProps {
  entries: CoffeeEntry[]
  myEntryId: string | null
}

const List = styled.ul`
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li<{ $mine: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.85rem;
  border: 1px solid ${({ $mine }) => ($mine ? 'rgba(78, 141, 84, 0.45)' : 'transparent')};
  background: rgba(255, 255, 255, 0.85);
  min-width: 0;
`

const Nickname = styled.strong`
  flex-shrink: 0;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 800;
`

const Menu = styled.span`
  flex: 1;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`

const MineBadge = styled.span`
  flex-shrink: 0;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primaryDeep};
  font-size: 0.75rem;
  font-weight: 800;
`

export function EntryList({ entries, myEntryId }: EntryListProps) {
  return (
    <Card aria-labelledby="coffee-entry-list-title">
      <CardHeader>
        <CardTitle id="coffee-entry-list-title">참가자</CardTitle>
        <CardMeta>
          <strong>{entries.length}</strong>명
        </CardMeta>
      </CardHeader>

      {entries.length === 0 ? (
        <EmptyText>아직 없어요</EmptyText>
      ) : (
        <List>
          {entries.map((entry) => (
            <Row key={entry.id} $mine={entry.id === myEntryId}>
              <Nickname title={entry.nickname}>{entry.nickname}</Nickname>
              <Menu>{entry.menu}</Menu>
              {entry.id === myEntryId ? <MineBadge>나</MineBadge> : null}
            </Row>
          ))}
        </List>
      )}
    </Card>
  )
}
