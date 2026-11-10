import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import type { BoardSeason } from '../../config/boardVersion'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
} from '../../constants/board'
import { getBoardInsights } from '../../lib/boardInsights'
import { formatRelativeTime } from '../../lib/format'
import { TOWNHALL_EVENT } from '../../lib/logger/events'
import type { BoardNote } from '../../types/board'
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconComment,
  IconDice,
  IconExitFullscreen,
  IconFullscreen,
  IconHeart,
} from '../common/Icons'
import { NoteMedia } from '../board/NoteMedia'
import { ConfettiBurst } from './ConfettiBurst'
import {
  SLIDE_KIND,
  TOWNHALL_ORDER,
  TOWNHALL_ORDER_LABEL,
  useTownHallDeck,
} from './useTownHallDeck'
import type { TownHallFilter, TownHallSlide } from './useTownHallDeck'

interface TownHallModeProps {
  season: BoardSeason
  notes: BoardNote[]
  onClose: () => void
}

const ORDER_OPTIONS = Object.values(TOWNHALL_ORDER)

const TEXT = '#F4F1E6'
const TEXT_MUTED = 'rgba(244, 241, 230, 0.66)'
const SURFACE = 'rgba(255, 255, 255, 0.08)'
const SURFACE_STRONG = 'rgba(255, 255, 255, 0.14)'
const BORDER = 'rgba(255, 255, 255, 0.14)'

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 90, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -90, scale: 0.98 }),
}

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background:
    radial-gradient(circle at 12% 8%, rgba(121, 175, 99, 0.28), transparent 38%),
    radial-gradient(circle at 88% 92%, rgba(255, 180, 84, 0.18), transparent 40%),
    linear-gradient(180deg, #13211a 0%, #0d1711 100%);
  color: ${TEXT};
  overflow: hidden;

  &:focus {
    outline: none;
  }
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 1.4rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-wrap: wrap;
    padding: 0.8rem;
  }
`

const Brand = styled.div`
  display: grid;
  gap: 0.05rem;
  margin-right: auto;

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.35rem;
  }

  small {
    color: ${TEXT_MUTED};
    font-size: 0.8rem;
  }
`

const FilterGroup = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 1rem;
  background: ${SURFACE};
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    order: 3;
    width: 100%;
  }
`

const FilterButton = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2.3rem;
  padding: 0.35rem 0.8rem;
  border-radius: 0.8rem;
  background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.92)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#13211a' : TEXT_MUTED)};
  font-size: 0.86rem;
  font-weight: 800;

  small {
    opacity: 0.7;
  }
`

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const OrderSelect = styled.select`
  min-height: 2.5rem;
  padding: 0 0.8rem;
  border-radius: 0.85rem;
  border: 1px solid ${BORDER};
  background: ${SURFACE};
  color: ${TEXT};
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;

  option {
    color: #13211a;
  }
`

const ProgressPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  padding: 0 0.85rem;
  border-radius: 0.85rem;
  background: rgba(121, 175, 99, 0.2);
  color: #cfeac4;
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.85rem;
  border: 1px solid ${BORDER};
  background: ${SURFACE};
  color: ${TEXT};
  font-size: 1.15rem;

  &:hover {
    background: ${SURFACE_STRONG};
  }
`

const Stage = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 0.5rem 1.4rem;
  overflow-x: hidden;
  overflow-y: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    place-items: start center;
    padding: 1rem 0.8rem;
  }
`

const SlideMotion = styled(motion.div)`
  width: min(1180px, 100%);
`

const NoteLayout = styled.div<{ $withComments: boolean }>`
  display: grid;
  grid-template-columns: ${({ $withComments }) =>
    $withComments ? 'minmax(0, 1fr) minmax(16rem, 22rem)' : 'minmax(0, 1fr)'};
  align-items: center;
  gap: 2rem;
  justify-items: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.2rem;
  }
`

const BigNote = styled(motion.article)<{ $background: string; $border: string; $text: string }>`
  position: relative;
  display: grid;
  gap: 1.2rem;
  width: min(46rem, 100%);
  min-height: min(26rem, 52vh);
  padding: clamp(1.6rem, 3vw, 2.6rem);
  border-radius: 0.35rem;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  color: ${({ $text }) => $text};
  box-shadow:
    0 40px 80px rgba(0, 0, 0, 0.45),
    0 10px 24px rgba(0, 0, 0, 0.25);
  grid-template-rows: auto minmax(0, 1fr) auto;

  &::before {
    content: '';
    position: absolute;
    top: -0.8rem;
    left: 50%;
    width: 6rem;
    height: 1.6rem;
    border-radius: 0.25rem;
    background: rgba(255, 255, 255, 0.7);
    transform: translateX(-50%) rotate(-2deg);
  }
`

const BigNoteTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 800;
`

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);

  svg {
    fill: currentColor;
  }
`

const BigContent = styled.p<{ $fontSize: string }>`
  margin: 0;
  align-self: center;
  font-size: ${({ $fontSize }) => $fontSize};
  font-weight: 700;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

const BigImage = styled(NoteMedia)`
  justify-self: center;
  max-width: 100%;
  max-height: 34vh;
  border-radius: 0.6rem;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.4);
`

const BigNoteFooter = styled.div`
  justify-self: end;
  font-size: 1rem;
  font-weight: 700;
  opacity: 0.8;
`

const Stamp = styled(motion.div)`
  position: absolute;
  left: clamp(1.6rem, 3vw, 2.6rem);
  bottom: clamp(1.2rem, 2.4vw, 2rem);
  padding: 0.45rem 0.9rem;
  border: 3px solid #c2415a;
  border-radius: 0.6rem;
  color: #c2415a;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.35rem;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
`

const CommentsPanel = styled.aside`
  display: grid;
  align-content: start;
  gap: 0.75rem;
  width: 100%;
  max-height: min(30rem, 58vh);
  padding: 1rem;
  border-radius: 1.2rem;
  border: 1px solid ${BORDER};
  background: ${SURFACE};
  overflow-y: auto;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-size: 1rem;
  }

  ul {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.25rem;
    padding: 0.75rem 0.85rem;
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.07);
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  small {
    color: ${TEXT_MUTED};
    font-size: 0.76rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: min(46rem, 100%);
    max-height: none;
  }
`

const CenterLayout = styled.div`
  display: grid;
  justify-items: center;
  gap: 1rem;
  text-align: center;
`

const BigEmoji = styled.div`
  font-size: clamp(3rem, 7vw, 5rem);
`

const IntroEyebrow = styled.span`
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: ${SURFACE};
  color: ${TEXT_MUTED};
  font-size: 0.9rem;
  font-weight: 700;
`

const IntroTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2rem, 5vw, 3.6rem);
  font-weight: 400;
  line-height: 1.2;
`

const IntroCount = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(4rem, 12vw, 8.5rem);
  line-height: 1;
  color: #ffd27a;

  small {
    margin-left: 0.3rem;
    font-size: 0.35em;
    color: ${TEXT};
  }
`

const CategoryTiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 8.5rem));
  gap: 0.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, minmax(0, 8.5rem));
  }
`

const CategoryTile = styled.div<{ $accent: string; $dimmed: boolean }>`
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 0.6rem;
  border-radius: 1rem;
  border: 1px solid ${({ $accent }) => `${$accent}66`};
  background: ${({ $accent }) => `${$accent}1f`};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.4 : 1)};

  span {
    font-size: 1.6rem;
  }

  strong {
    font-size: 1.6rem;
  }

  small {
    color: ${TEXT_MUTED};
    font-size: 0.82rem;
  }
`

const KeywordLine = styled.p`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 0.6rem;
  margin: 0;
  color: ${TEXT_MUTED};

  span {
    color: ${TEXT};
    font-weight: 700;
  }
`

const Hint = styled.p`
  margin: 0;
  color: ${TEXT_MUTED};
  font-size: 0.95rem;

  kbd {
    margin: 0 0.25rem;
    padding: 0.1rem 0.45rem;
    border-radius: 0.4rem;
    border: 1px solid ${BORDER};
    font-family: inherit;
    font-size: 0.85rem;
    color: ${TEXT};
  }
`

const OutroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.5rem;
`

const PillButton = styled.button<{ $primary?: boolean }>`
  min-height: 2.9rem;
  padding: 0.6rem 1.2rem;
  border-radius: 0.95rem;
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : BORDER)};
  background: ${({ $primary }) => ($primary ? '#F4F1E6' : SURFACE)};
  color: ${({ $primary }) => ($primary ? '#13211a' : TEXT)};
  font-weight: 800;
`

const DrawStage = styled(motion.div)`
  display: grid;
  justify-items: center;
  gap: 1.4rem;
  perspective: 900px;
`

const DrawLabel = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.4rem, 3vw, 2.2rem);
`

const DrawCard = styled(motion.div)<{ $background: string; $text: string }>`
  display: grid;
  place-items: center;
  width: min(34rem, 86vw);
  min-height: 15rem;
  padding: 2rem;
  border-radius: 0.35rem;
  background: ${({ $background }) => $background};
  color: ${({ $text }) => $text};
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
  font-size: clamp(1.2rem, 2.4vw, 1.7rem);
  font-weight: 700;
  line-height: 1.5;
  text-align: center;

  p {
    margin: 0;
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }
`

const BottomBar = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: 'prev progress actions next';
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.4rem 1.3rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'prev progress next'
      'actions actions actions';
    padding: 0.8rem 0.8rem calc(0.9rem + env(safe-area-inset-bottom));
  }
`

const ActionGroup = styled.div`
  grid-area: actions;
  display: flex;
  justify-content: center;
  gap: 0.6rem;
`

const NavButton = styled.button<{ $area: 'prev' | 'next' }>`
  grid-area: ${({ $area }) => $area};
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 3rem;
  padding: 0.6rem 1rem;
  border-radius: 1rem;
  border: 1px solid ${BORDER};
  background: ${SURFACE};
  color: ${TEXT};
  font-weight: 800;

  &:hover:not(:disabled) {
    background: ${SURFACE_STRONG};
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  svg {
    font-size: 1.2rem;
  }
`

const ActionButton = styled.button<{ $tone: 'draw' | 'done'; $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 3rem;
  padding: 0.6rem 1.1rem;
  border-radius: 1rem;
  background: ${({ $tone, $active }) => {
    if ($tone === 'draw') return 'linear-gradient(135deg, #FFB454 0%, #FF7A59 100%)'
    return $active ? '#79AF63' : SURFACE_STRONG
  }};
  color: ${({ $tone }) => ($tone === 'draw' ? '#2b1608' : TEXT)};
  font-weight: 800;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  svg {
    font-size: 1.2rem;
  }

  kbd {
    padding: 0.05rem 0.4rem;
    border-radius: 0.35rem;
    border: 1px solid currentColor;
    font-family: inherit;
    font-size: 0.72rem;
    opacity: 0.6;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    kbd {
      display: none;
    }
  }
`

const ProgressBlock = styled.div`
  grid-area: progress;
  display: grid;
  gap: 0.4rem;
  min-width: 0;
  color: ${TEXT_MUTED};
  font-size: 0.85rem;
  font-weight: 700;
  text-align: center;
`

const ProgressTrack = styled.div`
  height: 0.4rem;
  border-radius: 999px;
  background: ${SURFACE_STRONG};
  overflow: hidden;
`

const ProgressFill = styled(motion.div)`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #79af63, #ffd27a);
`

function getContentFontSize(length: number) {
  if (length <= 40) return 'clamp(2rem, 4.4vw, 3.8rem)'
  if (length <= 120) return 'clamp(1.7rem, 3.2vw, 2.8rem)'
  if (length <= 300) return 'clamp(1.35rem, 2.3vw, 2rem)'
  return 'clamp(1.1rem, 1.7vw, 1.5rem)'
}

function getProgressLabel(slide: TownHallSlide, currentIndex: number, total: number) {
  if (slide.kind === SLIDE_KIND.INTRO) return '시작 전'
  if (slide.kind === SLIDE_KIND.OUTRO) return '마무리'
  return `${currentIndex} / ${total}`
}

export function TownHallMode({ season, notes, onClose }: TownHallModeProps) {
  const deck = useTownHallDeck({ notes, seasonId: season.id, onClose })
  const { actions, currentSlide, deckNotes, discussedIds } = deck
  const insights = useMemo(() => getBoardInsights(notes), [notes])
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const isPresent = useIsPresent()
  const totalNotes = deckNotes.length
  const progressRatio = totalNotes === 0 ? 0 : Math.min(deck.currentIndex, totalNotes) / totalNotes
  const filterOptions: Array<{ key: TownHallFilter; label: string; count: number }> = [
    { key: 'all', label: '전체', count: notes.length },
    ...BOARD_CATEGORY_ORDER.map((category) => ({
      key: category,
      label: `${BOARD_CATEGORY_META[category].emoji} ${BOARD_CATEGORY_META[category].label}`,
      count: insights.categoryCounts[category],
    })),
  ]

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    overlayRef.current?.focus({ preventScroll: true })

    return () => previouslyFocused?.focus({ preventScroll: true })
  }, [])

  function renderSlide(slide: TownHallSlide) {
    if (slide.kind === SLIDE_KIND.INTRO) {
      return (
        <CenterLayout>
          <BigEmoji aria-hidden="true">🎋</BigEmoji>
          <IntroEyebrow>{season.label} 타운홀</IntroEyebrow>
          <IntroTitle>오늘 함께 나눌 이야기</IntroTitle>
          <IntroCount>
            {totalNotes}
            <small>개</small>
          </IntroCount>
          <CategoryTiles>
            {BOARD_CATEGORY_ORDER.map((category) => {
              const meta = BOARD_CATEGORY_META[category]

              return (
                <CategoryTile
                  key={category}
                  $accent={meta.accent}
                  $dimmed={deck.filter !== 'all' && deck.filter !== category}
                >
                  <span aria-hidden="true">{meta.emoji}</span>
                  <strong>{insights.categoryCounts[category]}</strong>
                  <small>{meta.label}</small>
                </CategoryTile>
              )
            })}
          </CategoryTiles>
          {insights.keywordStats.length > 0 ? (
            <KeywordLine>
              자주 나온 말
              {insights.keywordStats.slice(0, 5).map((item) => (
                <span key={item.keyword}>#{item.keyword}</span>
              ))}
            </KeywordLine>
          ) : null}
          <Hint>
            {totalNotes > 0 ? (
              <>
                <kbd>→</kbd>로 시작하거나 <kbd>R</kbd>로 랜덤 뽑기
              </>
            ) : (
              '아직 나눌 이야기가 없어요. 보드에 포스트잇이 모이면 다시 열어 주세요.'
            )}
          </Hint>
        </CenterLayout>
      )
    }

    if (slide.kind === SLIDE_KIND.OUTRO) {
      const remaining = totalNotes - deck.discussedCount

      return (
        <CenterLayout>
          <BigEmoji aria-hidden="true">🎉</BigEmoji>
          <IntroTitle>
            {deck.discussedCount > 0
              ? `오늘 ${deck.discussedCount}개의 이야기를 나눴어요`
              : '모든 이야기를 함께 둘러봤어요'}
          </IntroTitle>
          {remaining > 0 && deck.discussedCount > 0 ? (
            <Hint>남은 이야기 {remaining}개는 보드에서 계속 이어가요.</Hint>
          ) : null}
          <Hint>솔직하게 남겨주시고 함께 들어주셔서 고마워요 🎋</Hint>
          <OutroActions>
            <PillButton type="button" onClick={actions.goToStart}>
              처음부터 다시
            </PillButton>
            {deck.discussedCount > 0 ? (
              <PillButton type="button" onClick={actions.resetDiscussed}>
                진행 기록 지우기
              </PillButton>
            ) : null}
            <PillButton type="button" $primary onClick={onClose}>
              보드로 돌아가기
            </PillButton>
          </OutroActions>
        </CenterLayout>
      )
    }

    const { note } = slide
    const colorMeta = POST_IT_COLOR_META[note.color]
    const categoryMeta = BOARD_CATEGORY_META[note.category]
    const comments = note.comments ?? []
    const isDiscussed = discussedIds.has(note.id)
    const withComments = deck.isCommentsVisible && comments.length > 0

    return (
      <NoteLayout $withComments={withComments}>
        <BigNote
          $background={colorMeta.background}
          $border={colorMeta.border}
          $text={colorMeta.text}
          style={{ rotate: note.rotation * 0.35 }}
        >
          <BigNoteTop>
            <Tag>
              {categoryMeta.emoji} {categoryMeta.label}
            </Tag>
            <Tag aria-label={`공감 ${note.likesCount ?? 0}개`}>
              <IconHeart />
              {note.likesCount ?? 0}
            </Tag>
          </BigNoteTop>
          <BigContent $fontSize={getContentFontSize(note.content.length)}>{note.content}</BigContent>
          {note.imageUrl ? <BigImage src={note.imageUrl} alt="첨부 사진" /> : null}
          <BigNoteFooter>
            — {note.author || '익명'} · {formatRelativeTime(note.createdAt)}
          </BigNoteFooter>
          <AnimatePresence>
            {isDiscussed ? (
              <Stamp
                key="stamp"
                initial={{ scale: 2.4, opacity: 0, rotate: -26 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
              >
                이야기 나눔 ✓
              </Stamp>
            ) : null}
          </AnimatePresence>
        </BigNote>

        {withComments ? (
          <CommentsPanel aria-label="댓글">
            <h3>
              <IconComment />
              댓글 {comments.length}
            </h3>
            <ul>
              {comments.map((comment) => (
                <li key={comment.id}>
                  {comment.content}
                  <small>
                    {comment.author} · {formatRelativeTime(comment.createdAt)}
                  </small>
                </li>
              ))}
            </ul>
          </CommentsPanel>
        ) : null}
      </NoteLayout>
    )
  }

  const drawPreviewNote = deck.drawPreviewNote
  const isNoteSlide = currentSlide.kind === SLIDE_KIND.NOTE
  const isCurrentDiscussed = isNoteSlide && discussedIds.has(currentSlide.note.id)

  return (
    <Overlay
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="타운홀 모드"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.25 }}
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
      onMouseDown={(event) => {
        // 마우스로 누른 버튼이 포커스를 가져가면 Space(다음)가 그 버튼을 다시 누르게 돼서 막는다
        if (event.target instanceof Element && event.target.closest('button')) {
          event.preventDefault()
        }
      }}
    >
      <TopBar>
        <Brand>
          <strong>🎋 타운홀 모드</strong>
          <small>{season.label}</small>
        </Brand>

        <FilterGroup role="group" aria-label="카테고리 고르기">
          {filterOptions.map((option) => (
            <FilterButton
              key={option.key}
              type="button"
              aria-pressed={deck.filter === option.key}
              $active={deck.filter === option.key}
              onClick={() => actions.changeFilter(option.key)}
            >
              {option.label}
              <small>{option.count}</small>
            </FilterButton>
          ))}
        </FilterGroup>

        <TopActions>
          <OrderSelect
            value={deck.order}
            aria-label="발표 순서"
            onChange={(event) => {
              const nextOrder = ORDER_OPTIONS.find((option) => option === event.target.value)

              if (nextOrder) {
                actions.changeOrder(nextOrder)
              }

              // 선택 후에도 포커스가 select에 남으면 방향키·Space가 발표 조작에 먹지 않는다
              overlayRef.current?.focus({ preventScroll: true })
            }}
          >
            {ORDER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {TOWNHALL_ORDER_LABEL[option]}
              </option>
            ))}
          </OrderSelect>
          <ProgressPill title="이야기 나눈 포스트잇 수">
            <IconCheck />
            {deck.discussedCount} / {totalNotes}
          </ProgressPill>
          <IconButton
            type="button"
            onClick={actions.toggleFullscreen}
            aria-label={deck.isFullscreen ? '전체 화면 끝내기' : '전체 화면'}
            title="전체 화면 (F)"
          >
            {deck.isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
          </IconButton>
          <IconButton type="button" onClick={onClose} aria-label="타운홀 모드 닫기" title="닫기 (Esc)">
            <IconClose />
          </IconButton>
        </TopActions>
      </TopBar>

      <Stage>
        <AnimatePresence mode="wait" custom={deck.direction} initial={false}>
          {deck.isDrawing && drawPreviewNote ? (
            <DrawStage
              key="draw"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.2 }}
            >
              <DrawLabel>🎲 어떤 이야기가 뽑힐까요?</DrawLabel>
              <AnimatePresence mode="popLayout" initial={false}>
                <DrawCard
                  key={drawPreviewNote.id}
                  $background={POST_IT_COLOR_META[drawPreviewNote.color].background}
                  $text={POST_IT_COLOR_META[drawPreviewNote.color].text}
                  initial={{ rotateX: -75, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: 75, opacity: 0 }}
                  transition={{ duration: 0.09 }}
                >
                  <p>{drawPreviewNote.content}</p>
                </DrawCard>
              </AnimatePresence>
            </DrawStage>
          ) : (
            <SlideMotion
              key={currentSlide.key}
              custom={deck.direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            >
              {renderSlide(currentSlide)}
            </SlideMotion>
          )}
        </AnimatePresence>
        {deck.celebrateKey > 0 ? <ConfettiBurst key={deck.celebrateKey} /> : null}
        {currentSlide.kind === SLIDE_KIND.OUTRO ? <ConfettiBurst key="outro" /> : null}
      </Stage>

      <BottomBar>
        <NavButton
          type="button"
          $area="prev"
          onClick={actions.prev}
          disabled={deck.currentIndex === 0 || deck.isDrawing}
          aria-label="이전"
        >
          <IconChevronLeft />
          이전
        </NavButton>

        <ProgressBlock>
          <ProgressTrack>
            <ProgressFill
              animate={{ width: `${Math.round(progressRatio * 100)}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </ProgressTrack>
          <span>{getProgressLabel(currentSlide, deck.currentIndex, totalNotes)}</span>
        </ProgressBlock>

        <ActionGroup>
          <ActionButton
            type="button"
            $tone="draw"
            onClick={actions.drawRandom}
            disabled={totalNotes === 0 || deck.isDrawing}
            data-log-event={TOWNHALL_EVENT.RANDOM_DRAWN}
          >
            <IconDice />
            랜덤 뽑기
            <kbd>R</kbd>
          </ActionButton>

          <ActionButton
            type="button"
            $tone="done"
            $active={isCurrentDiscussed}
            aria-pressed={isCurrentDiscussed}
            disabled={!isNoteSlide || deck.isDrawing}
            onClick={() => {
              if (currentSlide.kind === SLIDE_KIND.NOTE) {
                actions.toggleDiscussed(currentSlide.note.id)
              }
            }}
            data-log-event={TOWNHALL_EVENT.NOTE_DISCUSSED}
          >
            <IconCheck />
            {isCurrentDiscussed ? '이야기 나눴어요' : '이야기 나눔 표시'}
            <kbd>D</kbd>
          </ActionButton>
        </ActionGroup>

        <NavButton
          type="button"
          $area="next"
          onClick={actions.next}
          disabled={deck.currentIndex === deck.slides.length - 1 || deck.isDrawing}
          aria-label="다음"
        >
          다음
          <IconChevronRight />
        </NavButton>
      </BottomBar>
    </Overlay>
  )
}
