import { useEffect, useLayoutEffect, useRef } from 'react'

interface BoardHotkeyHandlers {
  onCompose?: () => void
  onFocusSearch: () => void
  onOpenTownHall: () => void
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && (target.isContentEditable || EDITABLE_TAGS.has(target.tagName))
  )
}

// 한글 입력 상태에서도 동작하도록 event.key 대신 물리 키(event.code)로 판단한다
export function useBoardHotkeys(handlers: BoardHotkeyHandlers, enabled: boolean) {
  const handlersRef = useRef(handlers)

  useLayoutEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        return
      }

      const { onCompose, onFocusSearch, onOpenTownHall } = handlersRef.current

      if (event.code === 'Slash') {
        event.preventDefault()
        onFocusSearch()
        return
      }

      if (event.code === 'KeyN' && onCompose) {
        event.preventDefault()
        onCompose()
        return
      }

      if (event.code === 'KeyT') {
        event.preventDefault()
        onOpenTownHall()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
