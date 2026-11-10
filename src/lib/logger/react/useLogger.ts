import { useMemo } from 'react'
import { logger } from '../logger'
import type { AnalyticsProperties, CaptureErrorInput } from '../types'

/**
 * logger는 싱글턴이라 컨텍스트로 내려줄 상태가 없다.
 * 훅은 참조가 안정된 호출부만 만들어 준다.
 */
export function useLogger() {
  return useMemo(
    () => ({
      track: (event: string, properties?: AnalyticsProperties) =>
        logger.track(event, properties),
      identify: (userId: string, properties?: AnalyticsProperties) =>
        logger.identify(userId, properties),
      captureError: (input: CaptureErrorInput) => logger.captureError(input),
      flush: () => logger.flush(),
      reset: () => logger.reset(),
    }),
    [],
  )
}
