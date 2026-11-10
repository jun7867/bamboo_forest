import type { eventWithTime } from '@rrweb/types'
import { getSupabaseClient } from '../supabase'
import { CONTENT_ENCODING, gzipText } from './compress'
import type { ContentEncoding } from './compress'
import {
  RECORDING_BUCKET,
  RECORDING_CHUNK_INTERVAL_MS,
  RECORDING_CHUNK_MAX_EVENTS,
  RECORDING_CHUNKS_TABLE,
} from './constants'
import type { SessionRecordingConfig } from './types'

export interface SessionRecorder {
  start(): Promise<void>
  stop(): void
  flush(): void
  /** 페이지 이탈 시점: 압축/SDK 왕복 없이 keepalive 요청으로 마지막 청크를 밀어낸다 */
  flushOnExit(): void
}

interface SessionRecorderParams {
  sessionId: string
  distinctId: string
  options: SessionRecordingConfig
  debug: boolean
}

interface ChunkPayload {
  chunkIndex: number
  events: eventWithTime[]
}

function buildStoragePath(
  sessionId: string,
  recorderId: string,
  chunkIndex: number,
  encoding: ContentEncoding,
) {
  const suffix = encoding === CONTENT_ENCODING.GZIP ? 'json.gz' : 'json'
  return `${sessionId}/${recorderId}-${String(chunkIndex).padStart(4, '0')}.${suffix}`
}

/**
 * rrweb 세션 녹화.
 * checkoutEveryNms 주기마다 풀 스냅샷이 들어오므로 그 경계에서 청크를 끊는다.
 * 청크 단위 업로드라 세션이 길어져도 메모리와 업로드 크기가 일정하게 유지된다.
 *
 * 세션은 탭과 새로고침을 넘어 유지되지만 recorder는 로드마다 새로 생긴다.
 * 청크 번호를 세션 단위로 공유하면 탭 간 경쟁으로 충돌하므로,
 * recorderId로 네임스페이스를 나누고 번호는 인스턴스 안에서만 센다.
 */
export function createSessionRecorder({
  sessionId,
  distinctId,
  options,
  debug,
}: SessionRecorderParams): SessionRecorder {
  const recorderId = crypto.randomUUID()
  let buffer: eventWithTime[] = []
  let chunkIndex = 0
  let stopRecording: (() => void) | undefined
  let isStopped = false
  let isAtCheckoutBoundary = false

  const takeChunk = (): ChunkPayload | null => {
    if (buffer.length === 0) {
      return null
    }

    const payload = { chunkIndex, events: buffer }
    buffer = []
    chunkIndex += 1
    return payload
  }

  const upload = async ({ chunkIndex: index, events }: ChunkPayload) => {
    const serialized = JSON.stringify(events)
    const { blob, encoding } = await gzipText(serialized)
    const storagePath = buildStoragePath(sessionId, recorderId, index, encoding)
    const client = getSupabaseClient()

    const uploaded = await client.storage
      .from(RECORDING_BUCKET)
      .upload(storagePath, blob, { contentType: 'application/json', upsert: true })

    if (uploaded.error) {
      if (debug) {
        console.warn('[analytics] recording upload failed', uploaded.error)
      }
      return
    }

    const { error } = await client.from(RECORDING_CHUNKS_TABLE).insert({
      session_id: sessionId,
      distinct_id: distinctId,
      recorder_id: recorderId,
      chunk_index: index,
      storage_path: storagePath,
      encoding,
      event_count: events.length,
      byte_size: blob.size,
      started_at: new Date(events[0].timestamp).toISOString(),
      ended_at: new Date(events[events.length - 1].timestamp).toISOString(),
    })

    if (error && debug) {
      console.warn('[analytics] recording chunk insert failed', error)
    }
  }

  const flushAsync = () => {
    const chunk = takeChunk()

    if (chunk) {
      void upload(chunk)
    }
  }

  const uploadOnExit = ({ chunkIndex: index, events }: ChunkPayload) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    if (!supabaseUrl || !supabaseAnonKey) {
      return
    }

    const storagePath = buildStoragePath(sessionId, recorderId, index, CONTENT_ENCODING.NONE)
    const authHeaders = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    }

    void fetch(`${supabaseUrl}/storage/v1/object/${RECORDING_BUCKET}/${storagePath}`, {
      method: 'POST',
      keepalive: true,
      headers: { ...authHeaders, 'Content-Type': 'application/json', 'x-upsert': 'true' },
      body: JSON.stringify(events),
    })
      .then(() =>
        fetch(`${supabaseUrl}/rest/v1/${RECORDING_CHUNKS_TABLE}`, {
          method: 'POST',
          keepalive: true,
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            session_id: sessionId,
            distinct_id: distinctId,
            recorder_id: recorderId,
            chunk_index: index,
            storage_path: storagePath,
            encoding: CONTENT_ENCODING.NONE,
            event_count: events.length,
            byte_size: null,
            started_at: new Date(events[0].timestamp).toISOString(),
            ended_at: new Date(events[events.length - 1].timestamp).toISOString(),
          }),
        }),
      )
      .catch(() => {
        // 페이지가 사라지는 중이라 복구할 방법이 없다
      })
  }

  return {
    async start() {
      const { record } = await import('rrweb')

      if (isStopped) {
        return
      }

      stopRecording = record({
        emit(event, isCheckout) {
          // 체크아웃 한 번에 Meta + FullSnapshot이 연달아 들어온다.
          // 매번 끊으면 Meta만 담긴 1건짜리 청크가 생기고 스냅샷과 분리된다.
          if (isCheckout && !isAtCheckoutBoundary) {
            flushAsync()
          }

          isAtCheckoutBoundary = Boolean(isCheckout)
          buffer.push(event)

          if (buffer.length >= RECORDING_CHUNK_MAX_EVENTS) {
            flushAsync()
          }
        },
        checkoutEveryNms: RECORDING_CHUNK_INTERVAL_MS,
        maskAllInputs: options.maskAllInputs,
        maskTextSelector: options.maskTextSelector,
        blockSelector: options.blockSelector,
        sampling: {
          mousemove: 50,
          scroll: 150,
          input: 'last',
        },
      })
    },
    stop() {
      isStopped = true
      stopRecording?.()
      stopRecording = undefined
      flushAsync()
    },
    flush() {
      flushAsync()
    },
    flushOnExit() {
      const chunk = takeChunk()

      if (chunk) {
        uploadOnExit(chunk)
      }
    },
  }
}
