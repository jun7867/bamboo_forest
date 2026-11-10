export const ANALYTICS_EVENT = {
  SESSION_START: '$session_start',
  PAGE_VIEW: '$page_view',
  PAGE_LEAVE: '$page_leave',
  CLICK: '$click',
  RAGE_CLICK: '$rage_click',
  IDENTIFY: '$identify',
  ERROR: '$error',
} as const

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT)[keyof typeof ANALYTICS_EVENT]

export const ERROR_SOURCE = {
  UNCAUGHT: 'uncaught',
  UNHANDLED_REJECTION: 'unhandled_rejection',
  REACT_BOUNDARY: 'react_boundary',
  MANUAL: 'manual',
} as const

export type ErrorSource = (typeof ERROR_SOURCE)[keyof typeof ERROR_SOURCE]

export const DEVICE_TYPE = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const

export type DeviceType = (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE]

export type AnalyticsPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AnalyticsPropertyValue[]
  | { [key: string]: AnalyticsPropertyValue }

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>

export interface AnalyticsContext {
  url: string
  path: string
  search: string
  title: string
  referrer: string
  deviceType: DeviceType
  os: string
  browser: string
  browserVersion: string
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  language: string
  timezone: string
  utm?: AnalyticsUtm
}

export interface AnalyticsUtm {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export interface AnalyticsEvent {
  id: string
  event: string
  distinctId: string
  sessionId: string
  userId: string | null
  eventTime: string
  properties: AnalyticsProperties
  context: AnalyticsContext
  appVersion: string
  sdkVersion: string
}

export type AnalyticsBreadcrumb = {
  event: string
  path: string
  at: string
  properties: AnalyticsProperties
}

export interface AnalyticsSession {
  id: string
  startedAt: string
  lastActiveAt: string
  /** 세션 생성 시 한 번만 굴리는 난수. 녹화 샘플링 판정에 쓴다 */
  samplingRoll: number
}

export const ANALYTICS_SINK = {
  TABLE: 'table',
  STORAGE: 'storage',
} as const

export type AnalyticsSink = (typeof ANALYTICS_SINK)[keyof typeof ANALYTICS_SINK]

/**
 * 배치 id는 큐에서 배치를 만들 때 한 번만 정하고 재시도에도 유지한다.
 * 오브젝트 싱크에서 재시도가 파일을 하나 더 만들어 집계를 부풀리는 걸 막는다.
 */
export interface AnalyticsBatch {
  id: string
  events: AnalyticsEvent[]
}

export interface AnalyticsTransport {
  name: string
  send(batch: AnalyticsBatch): Promise<void>
  /** 페이지 종료 시점처럼 await 할 수 없는 상황에서 쓰는 즉시 전송 경로 */
  sendOnExit?(batch: AnalyticsBatch): void
}

export interface SessionRecordingConfig {
  enabled: boolean
  /** 0~1. 세션 단위로 한 번만 굴린다 */
  sampleRate: number
  maskAllInputs: boolean
  maskTextSelector?: string
  blockSelector?: string
}

export interface LoggerConfig {
  enabled: boolean
  debug: boolean
  transport: AnalyticsTransport
  appVersion: string
  autocapture: boolean
  errorTracking: boolean
  sessionRecording: SessionRecordingConfig
  /** 오브젝트 싱크는 작은 파일이 쏟아지지 않도록 배치를 크게 잡는다 */
  flushIntervalMs: number
  flushBatchSize: number
}

export type LoggerInitOptions = Partial<Omit<LoggerConfig, 'sessionRecording'>> & {
  sessionRecording?: Partial<SessionRecordingConfig>
}

export interface CaptureErrorInput {
  error: unknown
  source?: ErrorSource
  properties?: AnalyticsProperties
}
