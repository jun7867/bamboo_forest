import { motion, useMotionValue } from 'framer-motion'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react'
import { useEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { POST_IT_COLOR_META } from '../../constants/board'
import { NOTE_PADDING, VIRTUAL_CANVAS } from '../../lib/boardLayout'
import { formatRelativeTime } from '../../lib/format'
import type { BoardDensityMode, BoardNote } from '../../types/board'
import { IconComment, IconHeart, IconMore } from '../common/Icons'
import { NoteMedia } from './NoteMedia'

interface PostItNoteProps {
  note: BoardNote
  mode: BoardDensityMode
  zoneRef?: RefObject<HTMLDivElement | null>
  isHighlighted?: boolean
  isNew?: boolean
  onMove?: (id: string, position: BoardNote['position']) => Promise<void>
  onOpen: (note: BoardNote) => void
  onOpenMenu?: (note: BoardNote, position: { x: number; y: number }) => void
  onToggleLike?: (noteId: string) => void
}

const FALLBACK_NOTE_SIZE = {
  width: 164,
  height: 164,
}

const highlightPulse = keyframes`
  0% {
    outline-color: rgba(78, 141, 84, 0.85);
    outline-offset: 2px;
  }

  70% {
    outline-color: rgba(78, 141, 84, 0);
    outline-offset: 14px;
  }

  100% {
    outline-color: rgba(78, 141, 84, 0);
    outline-offset: 14px;
  }
`

const NoteCard = styled(motion.article)<{
  $background: string
  $border: string
  $shadow: string
  $text: string
  $mode: BoardDensityMode
  $draggable: boolean
  $highlighted: boolean
}>`
  position: ${({ $mode }) => ($mode === 'spread' ? 'absolute' : 'relative')};
  top: 0;
  left: 0;
  width: ${({ $mode }) => ($mode === 'spread' ? '10.25rem' : '100%')};
  min-height: ${({ $mode }) => ($mode === 'spread' ? '10.25rem' : '10rem')};
  padding: ${({ $mode }) => ($mode === 'spread' ? '1.05rem 0.95rem 0.85rem' : '1.1rem 1rem 0.9rem')};
  border-radius: ${({ $mode }) => ($mode === 'spread' ? '0.15rem' : '1rem')};
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  box-shadow: ${({ $shadow }) => $shadow};
  color: ${({ $text }) => $text};
  cursor: ${({ $draggable }) => ($draggable ? 'grab' : 'pointer')};
  touch-action: ${({ $draggable }) => ($draggable ? 'none' : 'auto')};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 0.5rem;
  user-select: none;
  overflow: hidden;
  outline: 3px solid transparent;

  &:active {
    cursor: ${({ $draggable }) => ($draggable ? 'grabbing' : 'pointer')};
  }

  &:focus-visible {
    outline-color: rgba(78, 141, 84, 0.7);
    outline-offset: 3px;
  }

  ${({ $highlighted }) =>
    $highlighted &&
    css`
      animation: ${highlightPulse} 1.1s ease-out 3;
    `}

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: ${({ $mode }) => ($mode === 'spread' ? '9.2rem' : '100%')};
  }
`

const Tape = styled.span<{ $color: string; $mode: BoardDensityMode }>`
  position: absolute;
  top: ${({ $mode }) => ($mode === 'spread' ? '0.5rem' : '0.65rem')};
  left: ${({ $mode }) => ($mode === 'spread' ? '50%' : '1.2rem')};
  width: ${({ $mode }) => ($mode === 'spread' ? '3.2rem' : '2.8rem')};
  height: 0.9rem;
  border-radius: 0.2rem;
  background: ${({ $color }) => $color};
  transform: ${({ $mode }) =>
    $mode === 'spread' ? 'translateX(-50%) rotate(-2deg)' : 'rotate(-4deg)'};
  opacity: 0.88;
  pointer-events: none;
`

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
  min-height: 1.6rem;
`

const BadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`

const Badge = styled.span<{ $tone: 'pin' | 'new' }>`
  display: inline-flex;
  align-items: center;
  min-height: 1.45rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === 'new' ? '#E85970' : 'rgba(255, 255, 255, 0.72)')};
  color: ${({ $tone, theme }) => ($tone === 'new' ? '#ffffff' : theme.colors.textStrong)};
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.02em;
`

const MoreButton = styled.button`
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.05rem;

  &:hover {
    background: rgba(255, 255, 255, 0.88);
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
`

const NoteImage = styled(NoteMedia)<{ $mode: BoardDensityMode }>`
  width: 100%;
  height: ${({ $mode }) => ($mode === 'spread' ? '4.2rem' : '7.5rem')};
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.4);
`

const Content = styled.p<{ $lines: number; $mode: BoardDensityMode }>`
  margin: 0;
  min-height: 0;
  font-size: ${({ $mode }) => ($mode === 'spread' ? '0.9rem' : '0.95rem')};
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: ${({ $lines }) => $lines};
  -webkit-box-orient: vertical;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  font-size: 0.7rem;
  opacity: 0.82;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
`

const LikeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? 'rgba(255, 106, 129, 0.22)' : 'rgba(255, 255, 255, 0.5)'};
  color: ${({ $active }) => ($active ? '#C2415A' : 'inherit')};
  font-size: 0.72rem;
  font-weight: 800;
  transition: transform 0.14s ease;

  &:active {
    transform: scale(0.92);
  }

  &:disabled {
    cursor: inherit;
  }

  svg {
    font-size: 0.85rem;
    fill: ${({ $active }) => ($active ? 'currentColor' : 'none')};
  }
`

const StatPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 0.72rem;
  font-weight: 800;

  svg {
    font-size: 0.85rem;
  }
`

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function scaleCoordinate(value: number, fromMax: number, toMax: number, padding: number) {
  if (fromMax <= padding || toMax <= padding) {
    return clamp(value, padding, toMax)
  }

  const normalized = (value - padding) / (fromMax - padding)
  const scaled = padding + normalized * (toMax - padding)

  return clamp(scaled, padding, toMax)
}

function getContentLines(mode: BoardDensityMode, hasImage: boolean) {
  if (mode === 'spread') {
    return hasImage ? 2 : 4
  }

  return hasImage ? 3 : 5
}

export function PostItNote({
  note,
  mode,
  zoneRef,
  isHighlighted = false,
  isNew = false,
  onMove,
  onOpen,
  onOpenMenu,
  onToggleLike,
}: PostItNoteProps) {
  const colorMeta = POST_IT_COLOR_META[note.color]
  const isDraggable = mode === 'spread' && Boolean(onMove)
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const noteRef = useRef<HTMLElement | null>(null)
  const [zoneSize, setZoneSize] = useState({ width: 0, height: 0 })
  const [noteSize, setNoteSize] = useState(FALLBACK_NOTE_SIZE)

  useEffect(() => {
    if (mode !== 'spread') {
      return
    }

    const zone = zoneRef?.current

    if (!zone) {
      return
    }

    const updateSize = () => {
      setZoneSize({ width: zone.clientWidth, height: zone.clientHeight })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(zone)

    return () => observer.disconnect()
  }, [mode, zoneRef])

  useEffect(() => {
    if (mode !== 'spread') {
      return
    }

    const target = noteRef.current

    if (!target) {
      return
    }

    const updateSize = () => {
      setNoteSize({ width: target.offsetWidth, height: target.offsetHeight })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(target)

    return () => observer.disconnect()
  }, [mode])

  useEffect(() => {
    if (isHighlighted) {
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])

  const actualMaxX = Math.max(NOTE_PADDING, zoneSize.width - noteSize.width - NOTE_PADDING)
  const actualMaxY = Math.max(NOTE_PADDING, zoneSize.height - noteSize.height - NOTE_PADDING)
  const virtualMaxX = Math.max(NOTE_PADDING, VIRTUAL_CANVAS.width - noteSize.width - NOTE_PADDING)
  const virtualMaxY = Math.max(NOTE_PADDING, VIRTUAL_CANVAS.height - noteSize.height - NOTE_PADDING)
  const renderedX = scaleCoordinate(note.position.x, virtualMaxX, actualMaxX, NOTE_PADDING)
  const renderedY = scaleCoordinate(note.position.y, virtualMaxY, actualMaxY, NOTE_PADDING)
  // 한 번 드래그한 뒤에는 framer-motion이 style 숫자 변경을 무시해서, 위치를 motion value로 직접 맞춘다
  const motionX = useMotionValue(renderedX)
  const motionY = useMotionValue(renderedY)

  useEffect(() => {
    if (isDraggingRef.current) {
      return
    }

    motionX.jump(renderedX)
    motionY.jump(renderedY)
  }, [renderedX, renderedY, motionX, motionY])

  function handleDragStart() {
    isDraggingRef.current = true
    suppressClickRef.current = true
  }

  async function handleDragEnd() {
    isDraggingRef.current = false
    // 드래그를 놓을 때 이어지는 click 이벤트로 상세 화면이 열리지 않게 한 틱 뒤에 풀어준다
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)

    if (!isDraggable || !onMove) {
      return
    }

    // 드래그 중엔 확대·회전돼 있어서 bounding box 대신 실제 이동한 값으로 놓인 자리를 계산한다
    const nextX = clamp(motionX.get(), NOTE_PADDING, actualMaxX)
    const nextY = clamp(motionY.get(), NOTE_PADDING, actualMaxY)

    await onMove(note.id, {
      x: scaleCoordinate(nextX, actualMaxX, virtualMaxX, NOTE_PADDING),
      y: scaleCoordinate(nextY, actualMaxY, virtualMaxY, NOTE_PADDING),
    })
  }

  function handleClick() {
    if (suppressClickRef.current) {
      return
    }

    onOpen(note)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(note)
    }
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLElement>) {
    if (!onOpenMenu) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    onOpenMenu(note, { x: event.clientX, y: event.clientY })
  }

  function handleMoreButtonClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const { right, bottom } = event.currentTarget.getBoundingClientRect()
    onOpenMenu?.(note, { x: right, y: bottom + 8 })
  }

  function handleLikeClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    onToggleLike?.(note.id)
  }

  const likesCount = note.likesCount ?? 0
  const commentsCount = note.comments?.length ?? 0

  return (
    <NoteCard
      ref={noteRef}
      tabIndex={0}
      aria-label={`${note.author || '익명'}의 포스트잇: ${note.content.slice(0, 60)}`}
      $background={colorMeta.background}
      $border={colorMeta.border}
      $shadow={colorMeta.shadow}
      $text={colorMeta.text}
      $mode={mode}
      $draggable={isDraggable}
      $highlighted={isHighlighted}
      drag={isDraggable}
      dragConstraints={isDraggable ? zoneRef : undefined}
      dragElastic={isDraggable ? 0.08 : 0}
      dragMomentum={false}
      whileHover={mode === 'spread' ? { scale: 1.03, zIndex: 20 } : { y: -2 }}
      whileDrag={{ scale: 1.05, zIndex: 30, rotate: note.rotation + 2 }}
      style={mode === 'spread' ? { x: motionX, y: motionY, rotate: note.rotation } : undefined}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      onDragStart={handleDragStart}
      onDragEnd={() => void handleDragEnd()}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Tape $color={colorMeta.tape} $mode={mode} />
      <TopRow>
        <BadgeGroup>
          {note.isPinned ? <Badge $tone="pin">📌 고정</Badge> : null}
          {isNew ? <Badge $tone="new">NEW</Badge> : null}
        </BadgeGroup>
        {onOpenMenu ? (
          <MoreButton
            type="button"
            aria-label="포스트잇 순서 메뉴 열기"
            aria-haspopup="menu"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleMoreButtonClick}
          >
            <IconMore />
          </MoreButton>
        ) : null}
      </TopRow>
      <Body>
        {note.imageUrl ? (
          <NoteImage src={note.imageUrl} alt="첨부 사진" $mode={mode} />
        ) : null}
        <Content $mode={mode} $lines={getContentLines(mode, Boolean(note.imageUrl))}>
          {note.content}
        </Content>
      </Body>
      <MetaRow>
        <span>{note.author || '익명'}</span>
        <span aria-hidden="true">·</span>
        <span>{formatRelativeTime(note.createdAt)}</span>
      </MetaRow>
      <StatRow>
        <LikeButton
          type="button"
          $active={note.isLiked ?? false}
          aria-pressed={note.isLiked ?? false}
          aria-label={`공감 ${likesCount}개`}
          disabled={!onToggleLike}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleLikeClick}
        >
          <IconHeart />
          <span>{likesCount}</span>
        </LikeButton>
        <StatPill aria-label={`댓글 ${commentsCount}개`}>
          <IconComment />
          <span>{commentsCount}</span>
        </StatPill>
      </StatRow>
    </NoteCard>
  )
}
