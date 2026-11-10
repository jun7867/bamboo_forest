import { AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { BirthdayCelebrationModal } from '../components/board/BirthdayCelebrationModal'
import { BoardHeader } from '../components/board/BoardHeader'
import { BoardStats } from '../components/board/BoardStats'
import { BoardToast } from '../components/board/BoardToast'
import { BoardToolbar } from '../components/board/BoardToolbar'
import { CategoryZone } from '../components/board/CategoryZone'
import { NoteActionMenu } from '../components/board/NoteActionMenu'
import { NoteComposer } from '../components/board/NoteComposer'
import { NoteDetailDialog } from '../components/board/NoteDetailDialog'
import { useBoardController } from '../components/board/useBoardController'
import { LiveChatPanel } from '../components/chat/LiveChatPanel'
import { TownHallMode } from '../components/townhall/TownHallMode'
import { APP_VERSION_LABEL } from '../config/appVersion'
import { CURRENT_SEASON, findSeason } from '../config/boardVersion'
import type { BoardSeason } from '../config/boardVersion'
import { BOARD_CATEGORY_ORDER } from '../constants/board'

const Page = styled.main`
  min-height: 100dvh;
  padding: 1.4rem 1.4rem 5.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.85rem 0.75rem calc(5.5rem + env(safe-area-inset-bottom));
  }
`

const Shell = styled.div`
  width: min(1680px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
`

const ArchiveNotice = styled.div`
  padding: 0.85rem 1.1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid rgba(168, 139, 76, 0.22);
  background: rgba(255, 251, 228, 0.94);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.92rem;
  line-height: 1.6;
`

const BoardSurface = styled.div`
  scroll-margin-top: 9rem;
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background:
    radial-gradient(circle at 1px 1px, rgba(80, 115, 61, 0.14) 1px, transparent 0),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 244, 236, 0.96));
  background-size: 18px 18px, 100% 100%;
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.8rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const ZoneGrid = styled.div<{ $focused: boolean }>`
  display: grid;
  grid-template-columns: ${({ $focused }) => ($focused ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))')};
  gap: 1.6rem 1.4rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 1.2rem;
  }
`

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
`

const SkeletonZone = styled.div`
  height: 26rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`

const LoadErrorCard = styled.div`
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 3rem 1.5rem;
  text-align: center;

  span[aria-hidden='true'] {
    font-size: 2.4rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    max-width: 30rem;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.6;
  }

  button {
    min-height: 2.8rem;
    padding: 0.6rem 1.2rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.gradients.button};
    color: #ffffff;
    font-weight: 800;
  }
`

const Footer = styled.footer`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1.2rem;
  padding: 0.4rem 0.4rem 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 0.84rem;
`

const ShortcutList = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;

  kbd {
    margin-right: 0.3rem;
    padding: 0.05rem 0.4rem;
    border-radius: 0.35rem;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    font-family: inherit;
    font-size: 0.76rem;
  }

  @media (hover: none) {
    display: none;
  }
`

function BoardScreen({ season }: { season: BoardSeason }) {
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const boardTopRef = useRef<HTMLDivElement | null>(null)
  const board = useBoardController(season, { searchInputRef, boardTopRef })

  return (
    <Page>
      <Shell inert={board.isModalOpen}>
        <BoardHeader
          season={season}
          isArchive={board.isArchive}
          isDemo={board.isDemo}
          summary={{
            notes: board.insights.totalNotes,
            likes: board.insights.totalLikes,
            comments: board.insights.totalComments,
            recentNotes: board.insights.recentTrend.last7Days,
          }}
          isTownHallReady={board.isTownHallReady}
          onCompose={() => board.handleCompose()}
          onOpenTownHall={board.openTownHall}
          onOpenBirthday={board.openBirthday}
        />

        {board.isArchive ? (
          <ArchiveNotice>
            {season.period} 동안 모인 이야기를 보관한 읽기 전용 보드예요. 포스트잇과 댓글을 볼 수만 있어요.
          </ArchiveNotice>
        ) : null}

        <BoardToolbar
          categoryCounts={board.categoryCounts}
          focusedCategory={board.focusedCategory}
          onFocusCategory={board.setFocusedCategory}
          searchQuery={board.searchQuery}
          searchResultCount={board.searchResultCount}
          searchInputRef={searchInputRef}
          onSearchChange={board.setSearchQuery}
          viewMode={board.viewMode}
          onViewModeChange={board.setViewMode}
          sortOption={board.sortOption}
          onSortChange={board.setSortOption}
          onCompose={board.isArchive ? undefined : () => board.handleCompose()}
        />

        <BoardSurface ref={boardTopRef}>
          {board.loadError ? (
            <LoadErrorCard role="alert">
              <span aria-hidden="true">🌧️</span>
              <strong>보드를 불러오지 못했어요</strong>
              <p>{board.loadError} 네트워크 상태나 Supabase 설정을 확인한 뒤 다시 시도해 주세요.</p>
              <button type="button" onClick={board.retryLoad}>
                다시 불러오기
              </button>
            </LoadErrorCard>
          ) : (
            <ZoneGrid $focused={board.focusedCategory !== null}>
              {board.isInitialLoading
                ? BOARD_CATEGORY_ORDER.map((category) => <SkeletonZone key={category} />)
                : board.visibleCategories.map((category) => (
                    <CategoryZone
                      key={category}
                      category={category}
                      notes={board.notesByCategory[category]}
                      viewMode={board.viewMode}
                      sortOption={board.sortOption}
                      isFocused={board.focusedCategory === category}
                      isSearching={board.searchQuery.trim().length > 0}
                      isReadOnly={board.isArchive}
                      highlightedNoteId={board.highlightedNoteId}
                      isNewNote={board.isNewNote}
                      onToggleFocus={() => board.handleToggleFocus(category)}
                      onCompose={board.handleCompose}
                      onOpenNote={board.handleOpenNote}
                      onOpenMenu={board.handleOpenMenu}
                      onToggleLike={board.handleToggleLike}
                      onMoveNote={board.moveNote}
                    />
                  ))}
            </ZoneGrid>
          )}
        </BoardSurface>

        <BoardStats
          insights={board.insights}
          writingTrend={board.writingTrend}
          onOpenNote={board.openNoteById}
          onSearchKeyword={board.handleSearchKeyword}
        />

        <Footer>
          <span>제작자 남준영 · v.{APP_VERSION_LABEL}</span>
          <ShortcutList aria-label="키보드 단축키">
            {board.isArchive ? null : (
              <span>
                <kbd>N</kbd>포스트잇 붙이기
              </span>
            )}
            <span>
              <kbd>/</kbd>검색
            </span>
            <span>
              <kbd>T</kbd>타운홀 모드
            </span>
          </ShortcutList>
        </Footer>
      </Shell>

      <AnimatePresence>
        {board.isComposerOpen && !board.isArchive ? (
          <NoteComposer
            key="note-composer"
            initialCategory={board.composerCategory}
            onClose={board.closeComposer}
            onSubmit={board.handleSubmitNote}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {board.selectedNote ? (
          <NoteDetailDialog
            key={board.selectedNote.id}
            note={board.selectedNote}
            isReadOnly={board.isArchive}
            onClose={board.closeNote}
            onToggleLike={board.toggleLike}
            onAddComment={board.addComment}
            onSave={board.updateNote}
            onDelete={board.deleteNote}
          />
        ) : null}
      </AnimatePresence>

      {!board.isArchive && board.menuState && board.menuNote ? (
        <NoteActionMenu
          note={board.menuNote}
          position={{ x: board.menuState.x, y: board.menuState.y }}
          canMoveUp={board.menuAvailability.canMoveUp}
          canMoveDown={board.menuAvailability.canMoveDown}
          onClose={board.closeMenu}
          onSelect={board.handleSelectPriorityAction}
        />
      ) : null}

      <AnimatePresence>
        {board.isTownHallOpen ? (
          <TownHallMode
            key="town-hall"
            season={season}
            notes={board.seasonNotes}
            onClose={board.closeTownHall}
          />
        ) : null}
      </AnimatePresence>

      {board.isArchive ? null : <LiveChatPanel />}

      <AnimatePresence>
        {board.isBirthdayOpen && !board.isArchive ? (
          <BirthdayCelebrationModal key="birthday-celebration" onClose={board.closeBirthday} />
        ) : null}
      </AnimatePresence>

      <BoardToast />
    </Page>
  )
}

export function BoardPage() {
  const { seasonId } = useParams()

  if (!seasonId) {
    return <BoardScreen key={CURRENT_SEASON.id} season={CURRENT_SEASON} />
  }

  const season = findSeason(seasonId)

  if (!season || season.id === CURRENT_SEASON.id) {
    return <Navigate to="/board" replace />
  }

  return <BoardScreen key={season.id} season={season} />
}
