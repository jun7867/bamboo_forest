import { motion, useIsPresent } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import styled from 'styled-components'
import { lockBodyScroll } from '../../lib/scrollLock'

type ModalSize = 'md' | 'lg'

interface ModalProps {
  ariaLabel: string
  size?: ModalSize
  onClose: () => void
  children: ReactNode
}

const PANEL_WIDTH: Record<ModalSize, string> = {
  md: '34rem',
  lg: '42rem',
}

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(41, 54, 39, 0.34);
  backdrop-filter: blur(12px);
  overflow-y: auto;
  overscroll-behavior: contain;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    align-items: flex-end;
    padding: 0;
  }
`

const Panel = styled(motion.div)<{ $size: ModalSize }>`
  position: relative;
  width: min(${({ $size }) => PANEL_WIDTH[$size]}, 100%);
  max-height: calc(100dvh - 3rem);
  padding: 1.4rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(251, 247, 239, 0.98));
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  &:focus {
    outline: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    max-height: calc(100dvh - 2rem);
    padding: 1.1rem 1rem calc(1.1rem + env(safe-area-inset-bottom));
    border-radius: 1.5rem 1.5rem 0 0;
  }
`

function getFocusedElement() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

// Esc 닫기, 배경 스크롤 잠금, 닫은 뒤 원래 포커스 복귀를 한곳에서 처리한다
function useModalBehavior(onClose: () => void, panelRef: RefObject<HTMLDivElement | null>) {
  const onCloseRef = useRef(onClose)
  // 자식의 autoFocus가 먼저 포커스를 가져가기 전에, 모달을 연 요소를 첫 렌더에서 기억한다
  const [openerElement] = useState(getFocusedElement)

  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const unlockBodyScroll = lockBodyScroll()
    const panel = panelRef.current

    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.isComposing) {
        event.stopPropagation()
        onCloseRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()

      if (openerElement?.isConnected) {
        openerElement.focus({ preventScroll: true })
      }
    }
  }, [panelRef, openerElement])
}

const EXIT_TRANSITION = { duration: 0.14, ease: 'easeIn' } as const

export function Modal({ ariaLabel, size = 'md', onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isPointerDownOnBackdropRef = useRef(false)
  const isPresent = useIsPresent()

  useModalBehavior(onClose, panelRef)

  return (
    <Backdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: EXIT_TRANSITION }}
      transition={{ duration: 0.18 }}
      // 닫히는 애니메이션 동안 투명한 배경이 다음 클릭을 가로채지 않게 한다
      style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
      onPointerDown={(event) => {
        isPointerDownOnBackdropRef.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        // 입력창에서 드래그로 글자를 고르다 바깥에서 놓은 경우에는 닫지 않는다
        if (event.target === event.currentTarget && isPointerDownOnBackdropRef.current) {
          onClose()
        }

        isPointerDownOnBackdropRef.current = false
      }}
    >
      <Panel
        ref={panelRef}
        $size={size}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98, transition: EXIT_TRANSITION }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </Panel>
    </Backdrop>
  )
}
