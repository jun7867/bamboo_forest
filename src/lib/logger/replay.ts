import type { eventWithTime } from '@rrweb/types'
import { getSupabaseClient } from '../supabase'
import { gunzipToText } from './compress'
import type { ContentEncoding } from './compress'
import { RECORDING_BUCKET, RECORDING_CHUNKS_TABLE } from './constants'

interface RecordingChunkRow {
  session_id: string
  distinct_id: string
  chunk_index: number
  storage_path: string
  encoding: ContentEncoding
  event_count: number
  started_at: string | null
  ended_at: string | null
}

export interface RecordedSession {
  sessionId: string
  distinctId: string
  startedAt: string | null
  endedAt: string | null
  chunkCount: number
  eventCount: number
}

const CHUNK_SCAN_LIMIT = 500

export async function fetchRecordedSessions(): Promise<RecordedSession[]> {
  const { data, error } = await getSupabaseClient()
    .from(RECORDING_CHUNKS_TABLE)
    .select('session_id, distinct_id, chunk_index, storage_path, encoding, event_count, started_at, ended_at')
    .order('started_at', { ascending: false })
    .limit(CHUNK_SCAN_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  const grouped = new Map<string, RecordedSession>()

  for (const row of (data ?? []) as RecordingChunkRow[]) {
    const existing = grouped.get(row.session_id)

    if (!existing) {
      grouped.set(row.session_id, {
        sessionId: row.session_id,
        distinctId: row.distinct_id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        chunkCount: 1,
        eventCount: row.event_count,
      })
      continue
    }

    existing.chunkCount += 1
    existing.eventCount += row.event_count

    if (row.started_at && (!existing.startedAt || row.started_at < existing.startedAt)) {
      existing.startedAt = row.started_at
    }

    if (row.ended_at && (!existing.endedAt || row.ended_at > existing.endedAt)) {
      existing.endedAt = row.ended_at
    }
  }

  return [...grouped.values()]
}

async function readChunk(storagePath: string, encoding: ContentEncoding) {
  const { data, error } = await getSupabaseClient()
    .storage.from(RECORDING_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new Error(error?.message ?? '녹화 청크를 내려받지 못했어요.')
  }

  return JSON.parse(await gunzipToText(data, encoding)) as eventWithTime[]
}

export async function loadSessionEvents(sessionId: string): Promise<eventWithTime[]> {
  // 한 세션에 여러 recorder(탭/새로고침)가 붙을 수 있어 chunk_index는 전역 순서가 아니다
  const { data, error } = await getSupabaseClient()
    .from(RECORDING_CHUNKS_TABLE)
    .select('storage_path, encoding, started_at')
    .eq('session_id', sessionId)
    .order('started_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const chunks = (data ?? []) as Pick<
    RecordingChunkRow,
    'storage_path' | 'encoding' | 'started_at'
  >[]

  const loaded = await Promise.all(
    chunks.map((chunk) => readChunk(chunk.storage_path, chunk.encoding)),
  )

  return loaded.flat().sort((a, b) => a.timestamp - b.timestamp)
}
