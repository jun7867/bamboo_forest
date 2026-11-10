import styled from 'styled-components'

export const Page = styled.div`
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
  max-width: 78rem;
  margin: 0 auto;
`

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.7rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

export const Toolbar = styled.div`
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
`

export const Chip = styled.button<{ $active?: boolean }>`
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.textStrong : theme.colors.borderStrong)};
  background: ${({ $active }) => ($active ? 'rgba(47, 74, 44, 0.1)' : 'rgba(255,255,255,0.85)')};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
`

export const Card = styled.section`
  display: grid;
  gap: 0.85rem;
  padding: 1.1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);

  h2 {
    margin: 0;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;

  > div {
    display: flex;
    gap: 0.75rem;
  }
`

export const LegendChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  font-weight: 700;

  &::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
`

export const Kpi = styled.div`
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.75);

  span {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  strong {
    font-size: 1.5rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }
`

export const TableWrap = styled.div`
  overflow-x: auto;
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th,
  td {
    padding: 0.55rem 0.6rem;
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong};
    white-space: nowrap;
  }

  th {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 700;
  }

  td {
    color: ${({ theme }) => theme.colors.textStrong};
  }

  tbody tr[data-clickable='true'] {
    cursor: pointer;
  }

  tbody tr[data-active='true'] {
    background: rgba(47, 74, 44, 0.08);
  }
`

export const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
  line-height: 1.7;
`

export const Mono = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
`

export const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const Timeline = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
  max-height: 26rem;
  overflow-y: auto;
`

export const TimelineItem = styled.li`
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;

  time {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`

export const Pre = styled.pre`
  margin: 0;
  padding: 0.5rem;
  border-radius: 0.6rem;
  background: rgba(41, 54, 39, 0.06);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.72rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 12rem;
  overflow-y: auto;
`
