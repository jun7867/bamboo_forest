import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import type { NotePriorityAction } from '../../lib/boardOrdering'
import type { BoardNote } from '../../types/board'

interface NoteActionMenuProps {
  note: BoardNote
  position: {
    x: number
    y: number
  }
  onClose: () => void
  onSelect: (action: NotePriorityAction) => void
}

const MenuSurface = styled.div`
  position: fixed;
  z-index: 120;
  width: min(13rem, calc(100vw - 1.5rem));
  padding: 0.4rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 18px 34px rgba(48, 61, 41, 0.22),
    0 4px 10px rgba(48, 61, 41, 0.08);
  backdrop-filter: blur(10px);
`

const MenuTitle = styled.div`
  padding: 0.45rem 0.55rem 0.5rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.78rem;
  font-weight: 700;
`

const MenuButton = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.72rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.textStrong};
  text-align: left;
  font-weight: 600;

  &:hover {
    background: rgba(117, 171, 99, 0.12);
  }
`

const MenuHint = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.76rem;
  font-weight: 500;
`

const ACTION_META: Array<{
  action: NotePriorityAction
  getLabel: (note: BoardNote) => string
  hint: string
}> = [
  {
    action: 'togglePin',
    getLabel: (note) => (note.isPinned ? '고정 해제' : '상단 고정'),
    hint: '공용',
  },
  {
    action: 'moveTop',
    getLabel: () => '맨 위로',
    hint: '공용',
  },
  {
    action: 'moveUp',
    getLabel: () => '한 칸 위로',
    hint: '공용',
  },
  {
    action: 'moveDown',
    getLabel: () => '한 칸 아래로',
    hint: '공용',
  },
  {
    action: 'moveBottom',
    getLabel: () => '맨 아래로',
    hint: '공용',
  },
]

export function NoteActionMenu({ note, position, onClose, onSelect }: NoteActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target

      if (!(target instanceof Node) || menuRef.current?.contains(target)) {
        return
      }

      onClose()
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    function handleViewportChange() {
      onClose()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [onClose])

  return (
    <MenuSurface
      ref={menuRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      role="menu"
      aria-label="포스트잇 정렬 메뉴"
      onClick={(event) => event.stopPropagation()}
    >
      <MenuTitle>공용 포스트잇 정렬</MenuTitle>

      {ACTION_META.map(({ action, getLabel, hint }) => (
        <MenuButton
          key={action}
          type="button"
          role="menuitem"
          onClick={() => onSelect(action)}
        >
          <span>{getLabel(note)}</span>
          <MenuHint>{hint}</MenuHint>
        </MenuButton>
      ))}
    </MenuSurface>
  )
}
