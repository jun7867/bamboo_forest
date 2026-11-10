import { startAutocapture } from './autocapture'
import {
  BREADCRUMB_MAX_SIZE,
  ERROR_DEDUPE_WINDOW_MS,
  ERROR_MAX_PER_SESSION,
  ERROR_STACK_MAX_LENGTH,
  FLUSH_BATCH_SIZE,
  FLUSH_INTERVAL_MS,
  SDK_VERSION,
} from './constants'
import { buildContext, captureEntryContext } from './context'
import { startErrorTracking } from './errorTracking'
import {
  clearUserId,
  getDistinctId,
  getUserId,
  resetDistinctId,
  setUserId,
  touchSession,
} from './identity'
import { EventQueue } from './queue'
import { createSessionRecorder } from './sessionRecorder'
import type { SessionRecorder } from './sessionRecorder'
import { createConsoleTransport } from './transports/consoleTransport'
import { ANALYTICS_EVENT, ERROR_SOURCE } from './types'
import type {
  AnalyticsBreadcrumb,
  AnalyticsEvent,
  AnalyticsProperties,
  CaptureErrorInput,
  LoggerConfig,
  LoggerInitOptions,
} from './types'

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  debug: false,
  transport: createConsoleTransport(),
  appVersion: '0.0.0',
  autocapture: true,
  errorTracking: true,
  sessionRecording: {
    enabled: false,
    sampleRate: 1,
    maskAllInputs: true,
  },
  flushIntervalMs: FLUSH_INTERVAL_MS,
  flushBatchSize: FLUSH_BATCH_SIZE,
}

type EventListener = (event: AnalyticsEvent) => void

interface PageState {
  path: string
  enteredAt: number
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, ERROR_STACK_MAX_LENGTH) ?? null,
    }
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
    stack: null,
  }
}

class Logger {
  private config: LoggerConfig = DEFAULT_CONFIG
  private queue: EventQueue | null = null
  private recorder: SessionRecorder | null = null
  private breadcrumbs: AnalyticsBreadcrumb[] = []
  private listeners = new Set<EventListener>()
  private teardowns: (() => void)[] = []
  private currentPage: PageState | null = null
  private isInitialized = false
  private errorSightings = new Map<string, { lastAdmittedAt: number; suppressedCount: number }>()
  private errorCount = 0

  init(options: LoggerInitOptions = {}) {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
      sessionRecording: {
        ...DEFAULT_CONFIG.sessionRecording,
        ...options.sessionRecording,
      },
    }

    if (!this.config.enabled) {
      return
    }

    this.isInitialized = true
    captureEntryContext()

    this.queue = new EventQueue({
      transport: this.config.transport,
      debug: this.config.debug,
      flushIntervalMs: this.config.flushIntervalMs,
      flushBatchSize: this.config.flushBatchSize,
    })
    this.queue.start()

    const { session, isNew } = touchSession()

    if (isNew) {
      this.track(ANALYTICS_EVENT.SESSION_START)
    }

    if (this.config.autocapture) {
      this.teardowns.push(startAutocapture(this))
    }

    if (this.config.errorTracking) {
      this.teardowns.push(startErrorTracking(this))
    }

    if (
      this.config.sessionRecording.enabled &&
      session.samplingRoll < this.config.sessionRecording.sampleRate
    ) {
      this.recorder = createSessionRecorder({
        sessionId: session.id,
        distinctId: getDistinctId(),
        options: this.config.sessionRecording,
        debug: this.config.debug,
      })
      void this.recorder.start()
    }

    this.teardowns.push(this.bindLifecycle())
  }

  shutdown() {
    this.teardowns.forEach((teardown) => teardown())
    this.teardowns = []
    this.recorder?.stop()
    this.recorder = null
    this.queue?.flushOnExit()
    this.queue?.stop()
    this.queue = null
    this.currentPage = null
    this.isInitialized = false
  }

  get isReady() {
    return this.isInitialized
  }

  get sessionId() {
    return touchSession().session.id
  }

  get distinctId() {
    return getDistinctId()
  }

  subscribe(listener: EventListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  track(event: string, properties: AnalyticsProperties = {}) {
    if (!this.config.enabled || typeof window === 'undefined') {
      return
    }

    const { session } = touchSession()
    const context = buildContext()

    const payload: AnalyticsEvent = {
      id: crypto.randomUUID(),
      event,
      distinctId: getDistinctId(),
      sessionId: session.id,
      userId: getUserId(),
      eventTime: new Date().toISOString(),
      properties,
      context,
      appVersion: this.config.appVersion,
      sdkVersion: SDK_VERSION,
    }

    this.pushBreadcrumb(payload)
    this.listeners.forEach((listener) => listener(payload))

    if (this.config.debug) {
      console.debug(`[analytics] ${event}`, properties)
    }

    this.queue?.enqueue(payload)
  }

  /**
   * 라우트 변경 시 호출한다. 직전 페이지의 체류 시간을 함께 남겨
   * "어느 페이지에서 이탈했는지"를 조회 한 번으로 볼 수 있게 한다.
   */
  page(path: string, properties: AnalyticsProperties = {}) {
    if (this.currentPage && this.currentPage.path !== path) {
      this.trackPageLeave('navigate')
    }

    if (this.currentPage?.path === path) {
      return
    }

    this.currentPage = { path, enteredAt: Date.now() }
    this.track(ANALYTICS_EVENT.PAGE_VIEW, { path, ...properties })
  }

  identify(userId: string, properties: AnalyticsProperties = {}) {
    setUserId(userId)
    this.track(ANALYTICS_EVENT.IDENTIFY, { userId, ...properties })
  }

  reset() {
    clearUserId()
    resetDistinctId()
    this.breadcrumbs = []
  }

  captureError({ error, source = ERROR_SOURCE.MANUAL, properties = {} }: CaptureErrorInput) {
    const normalized = normalizeError(error)
    const decision = this.admitError(normalized)

    if (!decision.admit) {
      return
    }

    this.track(ANALYTICS_EVENT.ERROR, {
      ...normalized,
      source,
      suppressedCount: decision.suppressedCount,
      breadcrumbs: this.breadcrumbs.slice(-BREADCRUMB_MAX_SIZE),
      recordingSessionId: this.recorder ? this.sessionId : null,
      ...properties,
    })

    // 처음 보는 에러만 즉시 올린다. 반복 에러까지 매번 flush하면 배치가 무의미해진다
    if (decision.isFirstSighting) {
      void this.flush()
    }
  }

  /**
   * 에러 폭주 차단.
   * 같은 지문은 쿨다운 동안 접어서 첫 건에 suppressedCount로 합산하고,
   * 세션당 총량을 넘으면 더 받지 않는다.
   */
  private admitError(normalized: ReturnType<typeof normalizeError>) {
    if (this.errorCount >= ERROR_MAX_PER_SESSION) {
      return { admit: false as const }
    }

    const fingerprint = `${normalized.name}:${normalized.message}:${
      normalized.stack?.split('\n')[1]?.trim() ?? ''
    }`
    const seen = this.errorSightings.get(fingerprint)
    const now = Date.now()

    if (seen && now - seen.lastAdmittedAt < ERROR_DEDUPE_WINDOW_MS) {
      seen.suppressedCount += 1
      return { admit: false as const }
    }

    const suppressedCount = seen?.suppressedCount ?? 0
    this.errorSightings.set(fingerprint, { lastAdmittedAt: now, suppressedCount: 0 })
    this.errorCount += 1

    return {
      admit: true as const,
      suppressedCount,
      isFirstSighting: !seen,
    }
  }

  async flush() {
    await this.queue?.flush()
  }

  private trackPageLeave(reason: 'navigate' | 'unload') {
    if (!this.currentPage) {
      return
    }

    this.track(ANALYTICS_EVENT.PAGE_LEAVE, {
      path: this.currentPage.path,
      durationMs: Date.now() - this.currentPage.enteredAt,
      reason,
    })
  }

  private pushBreadcrumb(event: AnalyticsEvent) {
    if (event.event === ANALYTICS_EVENT.ERROR) {
      return
    }

    this.breadcrumbs.push({
      event: event.event,
      path: event.context.path,
      at: event.eventTime,
      properties: event.properties,
    })

    if (this.breadcrumbs.length > BREADCRUMB_MAX_SIZE) {
      this.breadcrumbs.shift()
    }
  }

  private bindLifecycle() {
    const handleHidden = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }

      this.trackPageLeave('unload')
      this.currentPage = null
      this.recorder?.flushOnExit()
      this.queue?.flushOnExit()
    }

    const handlePageShow = () => {
      if (document.visibilityState !== 'visible' || this.currentPage) {
        return
      }

      this.page(window.location.pathname, { restored: true })
    }

    document.addEventListener('visibilitychange', handleHidden)
    window.addEventListener('pagehide', handleHidden)
    document.addEventListener('visibilitychange', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleHidden)
      window.removeEventListener('pagehide', handleHidden)
      document.removeEventListener('visibilitychange', handlePageShow)
    }
  }
}

export const logger = new Logger()
export type { Logger }
