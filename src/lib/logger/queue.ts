import {
  PENDING_EVENTS_MAX_SIZE,
  QUEUE_MAX_SIZE,
  SEND_MAX_RETRY,
  SEND_RETRY_BASE_DELAY_MS,
  STORAGE_KEY,
} from './constants'
import type { AnalyticsBatch, AnalyticsEvent, AnalyticsTransport } from './types'

interface EventQueueOptions {
  transport: AnalyticsTransport
  debug: boolean
  flushIntervalMs: number
  flushBatchSize: number
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function loadPendingBatches(): AnalyticsBatch[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY.PENDING_EVENTS)
    const parsed = raw ? (JSON.parse(raw) as AnalyticsBatch[]) : []

    return Array.isArray(parsed) ? parsed.filter((batch) => batch?.id && batch.events) : []
  } catch {
    return []
  }
}

function savePendingBatches(batches: AnalyticsBatch[]) {
  try {
    if (batches.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY.PENDING_EVENTS)
      return
    }

    let kept: AnalyticsBatch[] = []
    let total = 0

    // 오래된 배치부터 버린다
    for (let index = batches.length - 1; index >= 0; index -= 1) {
      const batch = batches[index]

      if (total + batch.events.length > PENDING_EVENTS_MAX_SIZE) {
        break
      }

      total += batch.events.length
      kept = [batch, ...kept]
    }

    window.localStorage.setItem(STORAGE_KEY.PENDING_EVENTS, JSON.stringify(kept))
  } catch {
    // 저장 실패 시 이번 세션 안에서만 재시도한다
  }
}

/**
 * 이벤트 버퍼링 / 배치 전송 / 실패 재시도를 담당한다.
 * 배치 id는 만들 때 한 번 정하고 재시도·재방문 전송까지 유지해서
 * 오브젝트 싱크에서 같은 배치가 파일 두 개로 갈라지지 않게 한다.
 */
export class EventQueue {
  private buffer: AnalyticsEvent[] = []
  private timerId: number | null = null
  private isFlushing = false
  private isStarted = false
  private readonly options: EventQueueOptions

  constructor(options: EventQueueOptions) {
    this.options = options
  }

  start() {
    if (this.isStarted) {
      return
    }

    this.isStarted = true

    const pending = loadPendingBatches()

    if (pending.length > 0) {
      savePendingBatches([])
      pending.forEach((batch) => {
        void this.deliver(batch)
      })
    }

    this.timerId = window.setInterval(() => {
      void this.flush()
    }, this.options.flushIntervalMs)
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }

    this.isStarted = false
  }

  enqueue(event: AnalyticsEvent) {
    if (this.buffer.length >= QUEUE_MAX_SIZE) {
      this.buffer.shift()
    }

    this.buffer.push(event)

    if (this.buffer.length >= this.options.flushBatchSize) {
      void this.flush()
    }
  }

  get size() {
    return this.buffer.length
  }

  async flush() {
    if (this.isFlushing || this.buffer.length === 0) {
      return
    }

    this.isFlushing = true

    try {
      await this.deliver(this.takeBatch())
    } finally {
      this.isFlushing = false
    }
  }

  /** 페이지 이탈 시점: await 불가능하므로 keepalive 경로로 즉시 밀어낸다 */
  flushOnExit() {
    if (this.buffer.length === 0) {
      return
    }

    const batch = this.takeBatch()

    if (this.options.transport.sendOnExit) {
      this.options.transport.sendOnExit(batch)
      return
    }

    savePendingBatches([...loadPendingBatches(), batch])
  }

  private takeBatch(): AnalyticsBatch {
    return {
      id: crypto.randomUUID(),
      events: this.buffer.splice(0, this.buffer.length),
    }
  }

  private async deliver(batch: AnalyticsBatch) {
    try {
      await this.sendWithRetry(batch)
    } catch (error) {
      if (this.options.debug) {
        console.warn('[analytics] flush failed, kept for retry', error)
      }

      savePendingBatches([...loadPendingBatches(), batch])
    }
  }

  private async sendWithRetry(batch: AnalyticsBatch) {
    let lastError: unknown

    for (let attempt = 0; attempt < SEND_MAX_RETRY; attempt += 1) {
      try {
        await this.options.transport.send(batch)
        return
      } catch (error) {
        lastError = error

        if (attempt < SEND_MAX_RETRY - 1) {
          await delay(SEND_RETRY_BASE_DELAY_MS * 2 ** attempt)
        }
      }
    }

    throw lastError
  }
}
