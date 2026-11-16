import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { CoffeeRound } from '../../types/coffee'
import { IconHome } from '../common/Icons'

interface CoffeeHeaderProps {
  round: CoffeeRound | null
}

const Header = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.35rem 1.4rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.74);
  box-shadow: ${({ theme }) => theme.shadows.soft};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem;
  }
`

const TitleBlock = styled.div`
  display: grid;
  gap: 0.55rem;
  min-width: 0;
`

const EyebrowRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
`

const Eyebrow = styled.span<{ $tone?: 'open' | 'closed' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  background: ${({ $tone, theme }) => {
    if ($tone === 'open') return 'rgba(255, 180, 84, 0.22)'
    if ($tone === 'closed') return 'rgba(36, 54, 37, 0.9)'
    return theme.colors.primarySoft
  }};
  color: ${({ $tone, theme }) => {
    if ($tone === 'open') return '#8a5a12'
    if ($tone === 'closed') return '#FFF6D8'
    return theme.colors.primaryDeep
  }};
  font-size: 0.82rem;
  font-weight: 800;
`

const PageTitle = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 400;
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.textStrong};
  overflow-wrap: anywhere;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: grid;
    grid-template-columns: 1fr auto;
  }
`

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 800;
  white-space: nowrap;
  text-decoration: none;
`

const HomeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.15rem;
`

function StatusBadge({ round }: { round: CoffeeRound | null }) {
  if (!round) {
    return <Eyebrow>열린 판 없음</Eyebrow>
  }

  return round.status === 'open' ? (
    <Eyebrow $tone="open">주문 받는 중</Eyebrow>
  ) : (
    <Eyebrow $tone="closed">마감</Eyebrow>
  )
}

export function CoffeeHeader({ round }: CoffeeHeaderProps) {
  return (
    <Header>
      <TitleBlock>
        <EyebrowRow>
          <Eyebrow>☕ 커피 내기</Eyebrow>
          <StatusBadge round={round} />
        </EyebrowRow>
        <PageTitle>{round?.title ?? '커피 내기'}</PageTitle>
      </TitleBlock>

      <Actions>
        <BackLink to="/board">대나무숲</BackLink>
        <HomeLink to="/" aria-label="홈으로" title="홈으로">
          <IconHome />
        </HomeLink>
      </Actions>
    </Header>
  )
}
