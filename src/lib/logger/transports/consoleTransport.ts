import type { AnalyticsBatch, AnalyticsTransport } from '../types'

export function createConsoleTransport(): AnalyticsTransport {
  return {
    name: 'console',
    async send({ id, events }: AnalyticsBatch) {
      console.groupCollapsed(`[analytics] batch ${id.slice(0, 8)} · ${events.length} events`)
      console.table(
        events.map((event) => ({
          event: event.event,
          path: event.context.path,
          session: event.sessionId.slice(0, 8),
          at: event.eventTime,
        })),
      )
      console.log(events)
      console.groupEnd()
    },
    sendOnExit({ events }: AnalyticsBatch) {
      console.log('[analytics] exit flush', events)
    },
  }
}
