import { getSupabaseClient } from '../../supabase'
import { EVENTS_TABLE } from '../constants'
import type { AnalyticsBatch, AnalyticsEvent, AnalyticsTransport } from '../types'

export interface AnalyticsEventRow {
  id: string
  event: string
  distinct_id: string
  session_id: string
  user_id: string | null
  event_time: string
  properties: AnalyticsEvent['properties']
  context: AnalyticsEvent['context']
  app_version: string
  sdk_version: string
}

export function toEventRow(event: AnalyticsEvent): AnalyticsEventRow {
  return {
    id: event.id,
    event: event.event,
    distinct_id: event.distinctId,
    session_id: event.sessionId,
    user_id: event.userId,
    event_time: event.eventTime,
    properties: event.properties,
    context: event.context,
    app_version: event.appVersion,
    sdk_version: event.sdkVersion,
  }
}

export function createSupabaseTransport(): AnalyticsTransport {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  return {
    name: 'supabase',
    async send({ events }: AnalyticsBatch) {
      const { error } = await getSupabaseClient()
        .from(EVENTS_TABLE)
        .insert(events.map(toEventRow))

      if (error) {
        throw new Error(`analytics insert failed: ${error.message}`)
      }
    },
    sendOnExit({ events }: AnalyticsBatch) {
      if (!supabaseUrl || !supabaseAnonKey) {
        return
      }

      // sendBeacon은 헤더를 못 붙여서 apikey 인증이 불가능하다. keepalive fetch로 대체
      void fetch(`${supabaseUrl}/rest/v1/${EVENTS_TABLE}`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(events.map(toEventRow)),
      }).catch(() => {
        // 페이지가 사라지는 중이라 복구할 방법이 없다
      })
    },
  }
}
