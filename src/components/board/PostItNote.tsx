import type { PanInfo } from 'framer-motion'
import { motion } from 'framer-motion'
import type { RefObject } from 'react'
import { useRef } from 'react'
import styled from 'styled-components'
import { BOARD_CATEGORY_META, POST_IT_COLOR_META } from '../../constants/board'
import type { BoardNote } from '../../types/board'

interface PostItNoteProps {
  note: BoardNote
  zoneRef: RefObject<HTMLDivElement | null>
  onMove: (id: string, position: BoardNote['position']) => Promise<void>
  onOpen: (note: BoardNote) => void
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
  width: 9.35rem;
  aspect-ratio: 1;
  padding: 1rem 0.95rem 0.85rem;
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
    width: 8.5rem;
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
  font-size: 0.9rem;
  line-height: 1.55;
  white-space: pre-wrap;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 5;
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

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

export function PostItNote({ note, zoneRef, onMove, onOpen }: PostItNoteProps) {
  const colorMeta = POST_IT_COLOR_META[note.color]
  const categoryMeta = BOARD_CATEGORY_META[note.category]
  const isDraggingRef = useRef(false)

  async function handleDragEnd(
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const zone = zoneRef.current
    const target = event.currentTarget as HTMLDivElement | null

    if (!zone || !target) {
      isDraggingRef.current = false
      return
    }

    const padding = 14
    const nextX = clamp(
      note.position.x + info.offset.x,
      padding,
      zone.clientWidth - target.offsetWidth - padding,
    )
    const nextY = clamp(
      note.position.y + info.offset.y,
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

  return (
    <NoteCard
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
        <span>{colorMeta.label}</span>
      </MetaRow>
    </NoteCard>
  )
}
