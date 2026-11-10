export const SDK_VERSION = '0.1.0'

export const STORAGE_KEY = {
  DISTINCT_ID: 'bamboo.analytics.distinct_id',
  USER_ID: 'bamboo.analytics.user_id',
  SESSION: 'bamboo.analytics.session',
  PENDING_EVENTS: 'bamboo.analytics.pending_events',
} as const

export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const SESSION_MAX_DURATION_MS = 8 * 60 * 60 * 1000

export const FLUSH_INTERVAL_MS = 5_000
export const FLUSH_BATCH_SIZE = 20

/**
 * 오브젝트 싱크용. 조회 비용이 파일 개수에 비례하므로 간격이 곧 성능이다.
 * 이탈 시에는 어차피 즉시 flush되므로 간격을 늘려도 실제 유실 위험은 커지지 않는다.
 */
export const STORAGE_FLUSH_INTERVAL_MS = 60_000
export const STORAGE_FLUSH_BATCH_SIZE = 200
export const QUEUE_MAX_SIZE = 500
export const PENDING_EVENTS_MAX_SIZE = 200
export const SEND_MAX_RETRY = 3
export const SEND_RETRY_BASE_DELAY_MS = 1_000

export const BREADCRUMB_MAX_SIZE = 20

/**
 * 같은 에러가 반복해서 터지면 수집 파이프라인이 그대로 침수된다.
 * 지문(이름+메시지+최상단 스택)이 같으면 쿨다운 동안 묶고, 세션당 총량도 막는다.
 */
export const ERROR_DEDUPE_WINDOW_MS = 10_000
export const ERROR_MAX_PER_SESSION = 50

export const RAGE_CLICK_THRESHOLD = 3
export const RAGE_CLICK_WINDOW_MS = 800

export const CLICK_TEXT_MAX_LENGTH = 80
export const ERROR_STACK_MAX_LENGTH = 4_000

export const RECORDING_CHUNK_INTERVAL_MS = 30_000
export const RECORDING_CHUNK_MAX_EVENTS = 400
export const RECORDING_BUCKET = 'session-recordings'
export const EVENTS_BUCKET = 'analytics-events'

export const EVENTS_TABLE = 'analytics_events'
export const RECORDING_CHUNKS_TABLE = 'analytics_recording_chunks'

/** DOM 요소에 선언적으로 이벤트를 붙일 때 쓰는 속성 */
export const LOG_ATTRIBUTE = {
  EVENT: 'data-log-event',
  PROPS_PREFIX: 'data-log-',
  IGNORE: 'data-log-ignore',
  MASK: 'data-log-mask',
} as const
