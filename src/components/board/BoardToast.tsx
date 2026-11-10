import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import styled from 'styled-components'
import { useBoardStore } from '../../store/useBoardStore'
import { IconClose } from '../common/Icons'

const TOAST_DURATION_MS = {
  info: 4200,
  success: 2600,
  error: 6000,
} as const

const Viewport = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  z-index: ${({ theme }) => theme.zIndex.toast};
  width: min(30rem, calc(100vw - 2rem));
  transform: translateX(-50%);
  pointer-events: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    bottom: calc(5rem + env(safe-area-inset-bottom));
  }
`

const ToastCard = styled(motion.div)<{ $tone: 'info' | 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.85rem 0.8rem 1.1rem;
  border-radius: 1.1rem;
  background: ${({ $tone }) => ($tone === 'error' ? 'rgba(122, 38, 38, 0.95)' : 'rgba(36, 54, 37, 0.94)')};
  color: #fffbf1;
  box-shadow: 0 18px 40px rgba(20, 30, 18, 0.28);
  backdrop-filter: blur(12px);
  font-size: 0.93rem;
  font-weight: 600;
  line-height: 1.5;
  pointer-events: auto;

  p {
    flex: 1;
    margin: 0;
  }

  button {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: inherit;
  }
`

export function BoardToast() {
  const status = useBoardStore((state) => state.status)
  const clearStatus = useBoardStore((state) => state.clearStatus)

  useEffect(() => {
    if (!status) {
      return
    }

    const timer = window.setTimeout(clearStatus, TOAST_DURATION_MS[status.tone])
    return () => window.clearTimeout(timer)
  }, [status, clearStatus])

  return (
    <Viewport role="status" aria-live="polite">
      <AnimatePresence>
        {status ? (
          <ToastCard
            key={`${status.tone}-${status.message}`}
            $tone={status.tone}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <p>{status.message}</p>
            <button type="button" onClick={clearStatus} aria-label="알림 닫기">
              <IconClose />
            </button>
          </ToastCard>
        ) : null}
      </AnimatePresence>
    </Viewport>
  )
}
