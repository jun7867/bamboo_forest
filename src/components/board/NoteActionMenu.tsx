import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { NotePriorityAction } from '../../lib/boardOrdering'
import type { BoardNote } from '../../types/board'

interface NoteActionMenuProps {
  note: BoardNote
  position: {
    x: number
    y: number
  }
  canMoveUp: boolean
  canMoveDown: boolean
  onClose: () => void
  onSelect: (action: NotePriorityAction) => void
}

const MenuSurface = styled.div`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.menu};
  width: min(13.5rem, calc(100vw - 1.5rem));
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
  display: grid;
  gap: 0.15rem;
  padding: 0.45rem 0.6rem 0.55rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 0.82rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.74rem;
  }
`

const MenuButton = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.6rem;
  padding: 0.68rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.textStrong};
  text-align: left;
  font-weight: 600;

  &:hover:not(:disabled),
  &:focus-visible {
    background: rgba(117, 171, 99, 0.12);
    outline: none;
  }

  &:disabled {
    opacity: 0.38;
    cursor: default;
  }
`

const MenuDivider = styled.div`
  height: 1px;
  margin: 0.3rem 0.4rem;
  background: ${({ theme }) => theme.colors.borderSoft};
`

const SCROLL_CLOSE_THRESHOLD = 24

const ACTION_META: Array<{
  action: Exclude<NotePriorityAction, 'togglePin'>
  label: string
  icon: string
  direction: 'up' | 'down'
}> = [
  { action: 'moveTop', label: '맨 위로', icon: '⤒', direction: 'up' },
  { action: 'moveUp', label: '한 칸 위로', icon: '↑', direction: 'up' },
  { action: 'moveDown', label: '한 칸 아래로', icon: '↓', direction: 'down' },
  { action: 'moveBottom', label: '맨 아래로', icon: '⤓', direction: 'down' },
]

export function NoteActionMenu({
  note,
  position,
  canMoveUp,
  canMoveDown,
  onClose,
  onSelect,
}: NoteActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  // 메뉴를 연 ⋯ 버튼(또는 포스트잇)으로 닫은 뒤 포커스를 돌려준다
  const [openerElement] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )

  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus({ preventScroll: true })

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target

      if (!(target instanceof Node) || menuRef.current?.contains(target)) {
        return
      }

      onCloseRef.current()
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (openerElement?.isConnected) {
          openerElement.focus({ preventScroll: true })
        }

        onCloseRef.current()
      }
    }

    const initialScrollY = window.scrollY

    function handleResize() {
      onCloseRef.current()
    }

    // 열기 직전 스크롤의 잔여 이벤트로 바로 닫히지 않게, 실제로 움직였을 때만 닫는다
    function handleScroll(event: Event) {
      if (
        event.target === document &&
        Math.abs(window.scrollY - initialScrollY) < SCROLL_CLOSE_THRESHOLD
      ) {
        return
      }

      onCloseRef.current()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [openerElement])

  function restoreFocus() {
    if (openerElement?.isConnected) {
      openerElement.focus({ preventScroll: true })
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return
    }

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    )
    const currentIndex = items.findIndex((item) => item === document.activeElement)
    const lastIndex = items.length - 1
    const nextIndexByKey: Record<string, number> = {
      ArrowDown: currentIndex >= lastIndex ? 0 : currentIndex + 1,
      ArrowUp: currentIndex <= 0 ? lastIndex : currentIndex - 1,
      Home: 0,
      End: lastIndex,
    }

    event.preventDefault()
    items[nextIndexByKey[event.key]]?.focus()
  }

  return (
    <MenuSurface
      ref={menuRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      role="menu"
      aria-label="포스트잇 순서 메뉴"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleMenuKeyDown}
    >
      <MenuTitle aria-hidden="true">
        <strong>모두에게 보이는 순서</strong>
        <span>목록 보기 순서와 고정이 함께 바뀌어요</span>
      </MenuTitle>

      <MenuButton
        type="button"
        role="menuitem"
        onClick={() => {
          restoreFocus()
          onSelect('togglePin')
        }}
      >
        <span aria-hidden="true">📌</span>
        {note.isPinned ? '고정 해제' : '상단 고정'}
      </MenuButton>

      <MenuDivider role="separator" />

      {ACTION_META.map(({ action, label, icon, direction }) => (
        <MenuButton
          key={action}
          type="button"
          role="menuitem"
          disabled={direction === 'up' ? !canMoveUp : !canMoveDown}
          onClick={() => {
            restoreFocus()
            onSelect(action)
          }}
        >
          <span aria-hidden="true">{icon}</span>
          {label}
        </MenuButton>
      ))}
    </MenuSurface>
  )
}
