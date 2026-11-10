import { isSupabaseConfigured } from '../lib/supabase'
import {
  FLUSH_BATCH_SIZE,
  FLUSH_INTERVAL_MS,
  STORAGE_FLUSH_BATCH_SIZE,
  STORAGE_FLUSH_INTERVAL_MS,
} from '../lib/logger/constants'
import { createConsoleTransport } from '../lib/logger/transports/consoleTransport'
import { createStorageTransport } from '../lib/logger/transports/storageTransport'
import { createSupabaseTransport } from '../lib/logger/transports/supabaseTransport'
import { ANALYTICS_SINK } from '../lib/logger/types'
import type { AnalyticsSink, LoggerInitOptions } from '../lib/logger/types'
import { APP_VERSION_LABEL } from './appVersion'

function readFlag(value: unknown, fallback: boolean) {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

function readRate(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

/**
 * table: 이벤트 1건 = DB row 1개. 서버 필터가 되고 소량에 편하다
 * storage: 배치 1개 = 오브젝트 1개(NDJSON.gz). row 증가가 없고 ClickHouse 이관이 쉽다
 */
export const ANALYTICS_SINK_MODE: AnalyticsSink =
  import.meta.env.VITE_ANALYTICS_SINK === ANALYTICS_SINK.STORAGE
    ? ANALYTICS_SINK.STORAGE
    : ANALYTICS_SINK.TABLE

const isStorageSink = ANALYTICS_SINK_MODE === ANALYTICS_SINK.STORAGE

/** Supabase 미설정이면 콘솔로만 흘려서 로컬 개발을 막지 않는다 */
function resolveTransport() {
  if (!isSupabaseConfigured) {
    return createConsoleTransport()
  }

  return isStorageSink ? createStorageTransport() : createSupabaseTransport()
}

export const analyticsLoggerOptions: LoggerInitOptions = {
  enabled: readFlag(import.meta.env.VITE_ANALYTICS_ENABLED, true),
  debug: import.meta.env.DEV,
  transport: resolveTransport(),
  appVersion: APP_VERSION_LABEL,
  flushIntervalMs: isStorageSink ? STORAGE_FLUSH_INTERVAL_MS : FLUSH_INTERVAL_MS,
  flushBatchSize: isStorageSink ? STORAGE_FLUSH_BATCH_SIZE : FLUSH_BATCH_SIZE,
  autocapture: true,
  errorTracking: true,
  sessionRecording: {
    enabled: isSupabaseConfigured && readFlag(import.meta.env.VITE_ANALYTICS_RECORDING, false),
    sampleRate: readRate(import.meta.env.VITE_ANALYTICS_RECORDING_SAMPLE_RATE, 1),
    maskAllInputs: true,
    blockSelector: '[data-log-block]',
    maskTextSelector: '[data-log-mask]',
  },
}
