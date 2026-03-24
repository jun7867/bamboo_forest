import { motion } from 'framer-motion'
import type { MouseEvent, RefObject } from 'react'
import { useRef } from 'react'
import styled from 'styled-components'
import { BOARD_CATEGORY_META, POST_IT_COLOR_META } from '../../constants/board'
import type { BoardNote } from '../../types/board'

interface PostItNoteProps {
  note: BoardNote
  zoneRef: RefObject<HTMLDivElement | null>
  onMove: (id: string, position: BoardNote['position']) => Promise<void>
  onOpen: (note: BoardNote) => void
  onToggleLike: (noteId: string) => Promise<void>
}

const NoteCard = styled(motion.article)<{
  $background: string
  $border: string
  $shadow: string
  $text: string
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 10.25rem;
  aspect-ratio: 1;
  padding: 1.05rem 1rem 0.9rem;
  border-radius: 0.15rem;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  box-shadow: ${({ $shadow }) => $shadow};
  color: ${({ $text }) => $text};
  cursor: grab;
  display: grid;
  align-content: space-between;
  user-select: none;
  overflow: hidden;

  &:active {
    cursor: grabbing;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 9.2rem;
  }
`

const Tape = styled.span<{ $color: string }>`
  position: absolute;
  top: 0.55rem;
  left: 50%;
  width: 3.2rem;
  height: 0.9rem;
  border-radius: 0.2rem;
  background: ${({ $color }) => $color};
  transform: translateX(-50%) rotate(-2deg);
  opacity: 0.88;
`

const Content = styled.p`
  margin: 1.4rem 0 0;
  font-size: 0.94rem;
  line-height: 1.6;
  white-space: pre-wrap;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
`

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.8rem;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  opacity: 0.82;
`

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.55rem;
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

export function PostItNote({
  note,
  zoneRef,
  onMove,
  onOpen,
  onToggleLike,
}: PostItNoteProps) {
  const colorMeta = POST_IT_COLOR_META[note.color]
  const categoryMeta = BOARD_CATEGORY_META[note.category]
  const isDraggingRef = useRef(false)
  const noteRef = useRef<HTMLElement | null>(null)

  async function handleDragEnd() {
    const zone = zoneRef.current
    const target = noteRef.current

    if (!zone || !target) {
      isDraggingRef.current = false
      return
    }

    const zoneRect = zone.getBoundingClientRect()
    const noteRect = target.getBoundingClientRect()
    const padding = 14
    const nextX = clamp(
      noteRect.left - zoneRect.left,
      padding,
      zone.clientWidth - target.offsetWidth - padding,
    )
    const nextY = clamp(
      noteRect.top - zoneRect.top,
      padding,
      zone.clientHeight - target.offsetHeight - padding,
    )

    await onMove(note.id, { x: nextX, y: nextY })

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

  async function handleLikeClick(event: MouseEvent<HTMLButtonElement>) {
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
      drag
      dragConstraints={zoneRef}
      dragElastic={0.08}
      dragMomentum={false}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.04, zIndex: 30, rotate: note.rotation + 2 }}
      style={{ x: note.position.x, y: note.position.y, rotate: note.rotation }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      onDragStart={() => {
        isDraggingRef.current = true
      }}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <Tape $color={colorMeta.tape} />
      <Content>{note.content}</Content>
      <MetaRow>
        <span>{categoryMeta.label}</span>
        <span>{note.author || '익명'}</span>
      </MetaRow>
      <StatRow>
        <LikeButton type="button" $active={note.isLiked ?? false} onClick={handleLikeClick}>
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
