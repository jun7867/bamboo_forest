import type { AnalyticsContext, AnalyticsProperties } from '../types'

export const ANALYTICS_RANGE = {
  DAY: '1d',
  WEEK: '7d',
  MONTH: '30d',
} as const

export type AnalyticsRange = (typeof ANALYTICS_RANGE)[keyof typeof ANALYTICS_RANGE]

export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRange, number> = {
  [ANALYTICS_RANGE.DAY]: 1,
  [ANALYTICS_RANGE.WEEK]: 7,
  [ANALYTICS_RANGE.MONTH]: 30,
}

export const ANALYTICS_RANGE_LABEL: Record<AnalyticsRange, string> = {
  [ANALYTICS_RANGE.DAY]: '최근 24시간',
  [ANALYTICS_RANGE.WEEK]: '최근 7일',
  [ANALYTICS_RANGE.MONTH]: '최근 30일',
}

/** DB에서 읽어온 이벤트. 전송용 AnalyticsEvent와 달리 ingested_at 기준 정렬 정보를 포함한다 */
export interface StoredEvent {
  id: string
  event: string
  distinctId: string
  sessionId: string
  userId: string | null
  eventTime: string
  properties: AnalyticsProperties
  context: Partial<AnalyticsContext>
  appVersion: string | null
}

export interface EventCount {
  event: string
  count: number
}

export interface AnalyticsUser {
  distinctId: string
  userId: string | null
  firstSeenAt: string
  lastSeenAt: string
  sessionCount: number
  eventCount: number
  pageViewCount: number
  errorCount: number
  rageClickCount: number
  device: string
  browser: string
  entryPath: string
  topEvents: EventCount[]
  recordedSessionCount: number
}

export interface AnalyticsSessionRow {
  sessionId: string
  distinctId: string
  startedAt: string
  endedAt: string
  durationMs: number
  eventCount: number
  pageViewCount: number
  errorCount: number
  rageClickCount: number
  entryPath: string
  exitPath: string
  device: string
  hasRecording: boolean
}

export interface EventStat {
  event: string
  count: number
  userCount: number
  sessionCount: number
}

export interface PathStat {
  path: string
  viewCount: number
  userCount: number
  exitCount: number
  avgDurationMs: number
}

export interface ErrorGroup {
  key: string
  message: string
  path: string
  source: string
  count: number
  userCount: number
  lastSeenAt: string
  sample: StoredEvent
}

export interface AnalyticsOverview {
  userCount: number
  sessionCount: number
  eventCount: number
  errorCount: number
  rageClickCount: number
  avgSessionDurationMs: number
  avgEventsPerSession: number
}

export interface ActivityBucket {
  key: string
  axisLabel: string
  tooltipLabel: string
  userCount: number
  sessionCount: number
}

export interface FunnelStepStat {
  key: string
  label: string
  sessionCount: number
}
