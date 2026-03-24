import { motion } from 'framer-motion'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { BOARD_CATEGORY_META, POST_IT_COLOR_META } from '../../constants/board'
import type { BoardDensityMode, BoardNote } from '../../types/board'

interface PostItNoteProps {
  note: BoardNote
  mode: BoardDensityMode
  zoneRef?: RefObject<HTMLDivElement | null>
  virtualCanvasHeight?: number
  onMove?: (id: string, position: BoardNote['position']) => Promise<void>
  onOpen: (note: BoardNote) => void
  onOpenMenu: (note: BoardNote, position: { x: number; y: number }) => void
  onToggleLike: (noteId: string) => Promise<void>
}

const NOTE_PADDING = 14
const VIRTUAL_CANVAS_WIDTH = 920
const FALLBACK_NOTE_SIZE = {
  width: 164,
  height: 164,
}

const NoteCard = styled(motion.article)<{
  $background: string
  $border: string
  $shadow: string
  $text: string
  $mode: BoardDensityMode
}>`
  position: ${({ $mode }) => ($mode === 'spread' ? 'absolute' : 'relative')};
  top: 0;
  left: 0;
  width: ${({ $mode }) => ($mode === 'spread' ? '10.25rem' : '100%')};
  min-height: ${({ $mode }) => ($mode === 'spread' ? 'auto' : '11rem')};
  aspect-ratio: ${({ $mode }) => ($mode === 'spread' ? '1' : 'auto')};
  padding: ${({ $mode }) => ($mode === 'spread' ? '1.05rem 1rem 0.9rem' : '1.05rem 1rem 0.92rem')};
  border-radius: ${({ $mode }) => ($mode === 'spread' ? '0.15rem' : '1rem')};
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  box-shadow: ${({ $shadow }) => $shadow};
  color: ${({ $text }) => $text};
  cursor: ${({ $mode }) => ($mode === 'spread' ? 'grab' : 'pointer')};
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 0.52rem;
  align-content: stretch;
  user-select: none;
  overflow: hidden;

  &:active {
    cursor: ${({ $mode }) => ($mode === 'spread' ? 'grabbing' : 'pointer')};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: ${({ $mode }) => ($mode === 'spread' ? '9.2rem' : '100%')};
  }
`

const Tape = styled.span<{ $color: string; $mode: BoardDensityMode }>`
  position: absolute;
  top: ${({ $mode }) => ($mode === 'spread' ? '0.55rem' : '0.7rem')};
  left: ${({ $mode }) => ($mode === 'spread' ? '50%' : '1.2rem')};
  width: ${({ $mode }) => ($mode === 'spread' ? '3.2rem' : '2.8rem')};
  height: 0.9rem;
  border-radius: 0.2rem;
  background: ${({ $color }) => $color};
  transform: ${({ $mode }) =>
    $mode === 'spread' ? 'translateX(-50%) rotate(-2deg)' : 'rotate(-4deg)'};
  opacity: 0.88;
`

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55rem;
`

const PinnedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0.22rem 0.58rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
`

const MoreButton = styled.button`
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: 1.9rem;
  height: 1.9rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.02rem;
  font-weight: 900;

  &:hover {
    background: rgba(255, 255, 255, 0.84);
  }
`

const Content = styled.p<{ $mode: BoardDensityMode }>`
  margin: 0;
  min-height: 0;
  align-self: start;
  font-size: ${({ $mode }) => ($mode === 'spread' ? '0.92rem' : '0.94rem')};
  line-height: 1.58;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: ${({ $mode }) => ($mode === 'spread' ? 2 : 4)};
  -webkit-box-orient: vertical;
`

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  opacity: 0.82;
`

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const StatPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  min-height: 1.5rem;
  padding: 0.18rem 0.48rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  font-size: 0.7rem;
  font-weight: 700;
`

const LikeButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  min-height: 1.5rem;
  padding: 0.18rem 0.48rem;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? 'rgba(255, 106, 129, 0.18)' : 'rgba(255, 255, 255, 0.45)'};
  color: inherit;
  font-size: 0.7rem;
  font-weight: 700;
`

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function scaleCoordinate(
  value: number,
  fromMax: number,
  toMax: number,
  padding: number,
) {
  if (fromMax <= padding || toMax <= padding) {
    return clamp(value, padding, toMax)
  }

  const normalized = (value - padding) / (fromMax - padding)
  const scaled = padding + normalized * (toMax - padding)

  return clamp(scaled, padding, toMax)
}

export function PostItNote({
  note,
  mode,
  zoneRef,
  virtualCanvasHeight,
  onMove,
  onOpen,
  onOpenMenu,
  onToggleLike,
}: PostItNoteProps) {
  const colorMeta = POST_IT_COLOR_META[note.color]
  const categoryMeta = BOARD_CATEGORY_META[note.category]
  const isDraggingRef = useRef(false)
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
      setZoneSize({
        width: zone.clientWidth,
        height: zone.clientHeight,
      })
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
      setNoteSize({
        width: target.offsetWidth,
        height: target.offsetHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(target)

    return () => observer.disconnect()
  }, [mode])

  const actualMaxX = Math.max(NOTE_PADDING, zoneSize.width - noteSize.width - NOTE_PADDING)
  const actualMaxY = Math.max(NOTE_PADDING, zoneSize.height - noteSize.height - NOTE_PADDING)
  const targetVirtualCanvasHeight = virtualCanvasHeight ?? 980
  const virtualMaxX = Math.max(NOTE_PADDING, VIRTUAL_CANVAS_WIDTH - noteSize.width - NOTE_PADDING)
  const virtualMaxY = Math.max(
    NOTE_PADDING,
    targetVirtualCanvasHeight - noteSize.height - NOTE_PADDING,
  )
  const renderedX = scaleCoordinate(note.position.x, virtualMaxX, actualMaxX, NOTE_PADDING)
  const renderedY = scaleCoordinate(note.position.y, virtualMaxY, actualMaxY, NOTE_PADDING)

  async function handleDragEnd() {
    const zone = zoneRef?.current
    const target = noteRef.current

    if (mode !== 'spread' || !zone || !target || !onMove) {
      isDraggingRef.current = false
      return
    }

    const zoneRect = zone.getBoundingClientRect()
    const noteRect = target.getBoundingClientRect()
    const nextX = clamp(
      noteRect.left - zoneRect.left,
      NOTE_PADDING,
      zone.clientWidth - target.offsetWidth - NOTE_PADDING,
    )
    const nextY = clamp(
      noteRect.top - zoneRect.top,
      NOTE_PADDING,
      zone.clientHeight - target.offsetHeight - NOTE_PADDING,
    )
    const scaledX = scaleCoordinate(nextX, actualMaxX, virtualMaxX, NOTE_PADDING)
    const scaledY = scaleCoordinate(nextY, actualMaxY, virtualMaxY, NOTE_PADDING)

    await onMove(note.id, { x: scaledX, y: scaledY })

    window.setTimeout(() => {
      isDraggingRef.current = false
    }, 0)
  }

  function handleClick() {
    if (isDraggingRef.current) {
      return
    }

    onOpen(note)
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    onOpenMenu(note, { x: event.clientX, y: event.clientY })
  }

  function handleMoreButtonClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const { right, bottom } = event.currentTarget.getBoundingClientRect()
    onOpenMenu(note, { x: right, y: bottom + 8 })
  }

  async function handleLikeClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    await onToggleLike(note.id)
  }

  return (
    <NoteCard
      ref={noteRef}
      $background={colorMeta.background}
      $border={colorMeta.border}
      $shadow={colorMeta.shadow}
      $text={colorMeta.text}
      $mode={mode}
      drag={mode === 'spread'}
      dragConstraints={mode === 'spread' ? zoneRef : undefined}
      dragElastic={mode === 'spread' ? 0.08 : 0}
      dragMomentum={false}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.04, zIndex: 30, rotate: note.rotation + 2 }}
      style={
        mode === 'spread'
          ? { x: renderedX, y: renderedY, rotate: note.rotation }
          : undefined
      }
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      onDragStart={() => {
        if (mode === 'spread') {
          isDraggingRef.current = true
        }
      }}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <Tape $color={colorMeta.tape} $mode={mode} />
      <TopRow>
        {note.isPinned ? <PinnedBadge>상단 고정</PinnedBadge> : <span />}
        <MoreButton
          type="button"
          aria-label="포스트잇 정렬 메뉴 열기"
          aria-haspopup="menu"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleMoreButtonClick}
        >
          ⋯
        </MoreButton>
      </TopRow>
      <Content $mode={mode}>{note.content}</Content>
      <MetaRow>
        <span>{categoryMeta.label}</span>
        <span>{note.author || '익명'}</span>
      </MetaRow>
      <StatRow>
        <LikeButton
          type="button"
          $active={note.isLiked ?? false}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleLikeClick}
        >
          <span>{note.isLiked ? '♥' : '♡'}</span>
          <span>{note.likesCount ?? 0}</span>
        </LikeButton>
        <StatPill>
          <span>댓글</span>
          <span>{note.comments?.length ?? 0}</span>
        </StatPill>
      </StatRow>
    </NoteCard>
  )
}
