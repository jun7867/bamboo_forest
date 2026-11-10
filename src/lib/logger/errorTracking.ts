import { ERROR_SOURCE } from './types'
import type { Logger } from './logger'

/**
 * 앱 코드가 아닌 곳에서 나오는 잡음.
 * 특히 Vite HMR 클라이언트는 dev 서버 연결이 끊기면 스스로 에러 보고를 반복해서
 * 초당 수천 건을 만들어낸다. 제품 지표로 볼 값이 아니다.
 */
const IGNORED_ERROR_ORIGINS = ['/@vite/client', 'chrome-extension://', 'moz-extension://']

function isIgnoredError(error: unknown, filename?: string) {
  const stack = error instanceof Error ? (error.stack ?? '') : ''
  const haystack = `${stack}\n${filename ?? ''}`

  return IGNORED_ERROR_ORIGINS.some((origin) => haystack.includes(origin))
}

/**
 * 전역 에러 수집. 에러 이벤트에는 logger가 들고 있는 직전 행동(breadcrumbs)이 함께 붙어서
 * "어떤 페이지에서, 무엇을 하다가" 터졌는지 한 레코드로 확인된다.
 */
export function startErrorTracking(logger: Logger) {
  const handleError = (event: ErrorEvent) => {
    if (isIgnoredError(event.error, event.filename)) {
      return
    }

    logger.captureError({
      error: event.error ?? event.message,
      source: ERROR_SOURCE.UNCAUGHT,
      properties: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  const handleRejection = (event: PromiseRejectionEvent) => {
    if (isIgnoredError(event.reason)) {
      return
    }

    logger.captureError({
      error: event.reason,
      source: ERROR_SOURCE.UNHANDLED_REJECTION,
    })
  }

  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleRejection)

  return () => {
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleRejection)
  }
}
