import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ARCHIVE_SEASONS, getSeasonPath } from '../../config/boardVersion'
import type { BoardSeason } from '../../config/boardVersion'
import { getDaysUntil } from '../../lib/format'
import { TOWNHALL_EVENT } from '../../lib/logger/events'
import { IconChevronDown, IconHome, IconPlus, IconPresent } from '../common/Icons'

interface BoardHeaderProps {
  season: BoardSeason
  isArchive: boolean
  isDemo: boolean
  summary: {
    notes: number
    likes: number
    comments: number
    recentNotes: number
  }
  isTownHallReady: boolean
  onCompose: () => void
  onOpenTownHall: () => void
  onOpenBirthday: () => void
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

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
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

const Eyebrow = styled.span<{ $tone?: 'archive' | 'demo' | 'dday' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  background: ${({ $tone, theme }) => {
    if ($tone === 'archive') return 'rgba(168, 139, 76, 0.16)'
    if ($tone === 'demo') return 'rgba(101, 169, 198, 0.18)'
    if ($tone === 'dday') return 'rgba(36, 54, 37, 0.9)'
    return theme.colors.primarySoft
  }};
  color: ${({ $tone, theme }) => ($tone === 'dday' ? '#FFF6D8' : theme.colors.primaryDeep)};
  font-size: 0.82rem;
  font-weight: 800;
`

const todayEventPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 122, 89, 0.55), 0 6px 14px rgba(255, 122, 89, 0.28);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 122, 89, 0), 0 6px 14px rgba(255, 122, 89, 0.32);
  }
`

const TodayEventChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.8rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff7a59 0%, #ffb454 100%);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  animation: ${todayEventPulse} 2.4s ease-in-out infinite;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const PageTitle = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2rem, 4.4vw, 3.3rem);
  line-height: 1.05;
  color: ${({ theme }) => theme.colors.textStrong};
`

const Summary = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.95rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 800;
  }
`

const RecentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(232, 89, 112, 0.12);
  color: #b03a50;
  font-size: 0.82rem;
  font-weight: 800;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
  }
`

const baseButton = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.9rem;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  font-weight: 800;
  white-space: nowrap;
  text-decoration: none;

  svg {
    font-size: 1.1rem;
  }
`

const PrimaryButton = styled.button`
  ${baseButton}
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  box-shadow: 0 14px 26px rgba(78, 141, 84, 0.26);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-column: 1 / -1;
  }
`

const TownHallButton = styled.button`
  ${baseButton}
  background: #243625;
  color: #fff6d8;
  box-shadow: 0 12px 24px rgba(36, 54, 37, 0.22);

  &:hover:not(:disabled) {
    background: #2f4730;
  }

  &:disabled {
    opacity: 0.55;
    cursor: progress;
  }
`

const SecondaryButton = styled.button`
  ${baseButton}
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
`

const SecondaryLink = styled(Link)`
  ${baseButton}
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
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

const DropdownWrap = styled.div`
  position: relative;
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transition: transform 0.18s ease;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'none')};
`

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.menu};
  min-width: 14rem;
  padding: 0.35rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.98);
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    left: 0;
    right: auto;
  }
`

const DropdownItem = styled(Link)`
  display: grid;
  gap: 0.12rem;
  padding: 0.7rem 0.85rem;
  border-radius: 0.65rem;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textStrong};

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.primarySoft};
    outline: none;
  }

  strong {
    font-size: 0.9rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`

function ArchiveDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <DropdownWrap ref={wrapRef}>
      <SecondaryButton
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="archive-season-list"
        onClick={() => setIsOpen((previous) => !previous)}
      >
        지난 대나무숲
        <Chevron $open={isOpen}>
          <IconChevronDown />
        </Chevron>
      </SecondaryButton>
      {isOpen ? (
        <DropdownMenu id="archive-season-list">
          {ARCHIVE_SEASONS.map((archiveSeason) => (
            <DropdownItem
              key={archiveSeason.id}
              to={getSeasonPath(archiveSeason)}
              onClick={() => setIsOpen(false)}
            >
              <strong>{archiveSeason.label}</strong>
              <small>{archiveSeason.period}</small>
            </DropdownItem>
          ))}
        </DropdownMenu>
      ) : null}
    </DropdownWrap>
  )
}

function getTownHallLabel(townHallAt: string | undefined) {
  if (!townHallAt) {
    return null
  }

  const daysUntil = getDaysUntil(townHallAt)

  if (daysUntil < 0) {
    return null
  }

  return daysUntil === 0 ? '오늘 타운홀!' : `타운홀 D-${daysUntil}`
}

export function BoardHeader({
  season,
  isArchive,
  isDemo,
  summary,
  isTownHallReady,
  onCompose,
  onOpenTownHall,
  onOpenBirthday,
}: BoardHeaderProps) {
  const townHallLabel = isArchive ? null : getTownHallLabel(season.townHallAt)

  return (
    <Header>
      <TitleBlock>
        <EyebrowRow>
          {isArchive ? (
            <Eyebrow $tone="archive">아카이브 · {season.label}</Eyebrow>
          ) : (
            <Eyebrow>🎋 {season.label}</Eyebrow>
          )}
          {townHallLabel ? <Eyebrow $tone="dday">{townHallLabel}</Eyebrow> : null}
          {isArchive ? null : (
            <TodayEventChip
              type="button"
              onClick={onOpenBirthday}
              aria-label="오늘의 이벤트 열기 - 다가오는 생일 축하"
            >
              <span aria-hidden="true">🎂</span>
              오늘의 이벤트
            </TodayEventChip>
          )}
          {isDemo ? <Eyebrow $tone="demo">데모 모드</Eyebrow> : null}
        </EyebrowRow>

        <PageTitle>{isArchive ? '지난 대나무숲' : '하고싶은거 다 말해~'}</PageTitle>

        <Summary>
          <span>
            의견 <strong>{summary.notes}</strong>
          </span>
          <span>
            공감 <strong>{summary.likes}</strong>
          </span>
          <span>
            댓글 <strong>{summary.comments}</strong>
          </span>
          {!isArchive && summary.recentNotes > 0 ? (
            <RecentBadge>최근 7일 +{summary.recentNotes}</RecentBadge>
          ) : null}
        </Summary>
      </TitleBlock>

      <Actions>
        {isArchive ? (
          <SecondaryLink to="/board">현재 대나무숲으로</SecondaryLink>
        ) : (
          <ArchiveDropdown />
        )}
        <TownHallButton
          type="button"
          onClick={onOpenTownHall}
          disabled={!isTownHallReady}
          title="타운홀 모드 (T)"
          data-log-event={TOWNHALL_EVENT.OPENED}
          data-log-season={season.id}
        >
          <IconPresent />
          타운홀 모드
        </TownHallButton>
        <HomeLink to="/" aria-label="홈으로" title="홈으로">
          <IconHome />
        </HomeLink>
        {isArchive ? null : (
          <PrimaryButton type="button" onClick={onCompose} title="포스트잇 붙이기 (N)">
            <IconPlus />
            포스트잇 붙이기
          </PrimaryButton>
        )}
      </Actions>
    </Header>
  )
}
