import { getSupabaseClient } from '../../supabase'
import { CONTENT_ENCODING, gunzipToText } from '../compress'
import { EVENTS_BUCKET, EVENTS_TABLE, RECORDING_CHUNKS_TABLE } from '../constants'
import { ANALYTICS_RANGE_DAYS } from './types'
import type { AnalyticsRange, StoredEvent } from './types'

const EVENT_FETCH_LIMIT = 5_000
const OBJECT_LIST_LIMIT = 1_000
const OBJECT_DOWNLOAD_CONCURRENCY = 6

interface StoredEventRow {
  id: string
  event: string
  distinct_id: string
  session_id: string
  user_id: string | null
  event_time: string
  properties: StoredEvent['properties'] | null
  context: StoredEvent['context'] | null
  app_version: string | null
}

function mapStoredEvent(row: StoredEventRow): StoredEvent {
  return {
    id: row.id,
    event: row.event,
    distinctId: row.distinct_id,
    sessionId: row.session_id,
    userId: row.user_id,
    eventTime: row.event_time,
    properties: row.properties ?? {},
    context: row.context ?? {},
    appVersion: row.app_version,
  }
}

function rangeStart(range: AnalyticsRange) {
  return new Date(Date.now() - ANALYTICS_RANGE_DAYS[range] * 24 * 60 * 60 * 1000)
}

export async function fetchEventsFromTable(range: AnalyticsRange): Promise<StoredEvent[]> {
  const since = rangeStart(range).toISOString()

  const { data, error } = await getSupabaseClient()
    .from(EVENTS_TABLE)
    .select('id, event, distinct_id, session_id, user_id, event_time, properties, context, app_version')
    .gte('event_time', since)
    .order('event_time', { ascending: false })
    .limit(EVENT_FETCH_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as StoredEventRow[]).map(mapStoredEvent)
}

function partitionsFor(range: AnalyticsRange) {
  // 자정을 걸친 배치는 시작 시각 기준으로 앞 파티션에 들어가므로 하루 더 훑는다
  const days = ANALYTICS_RANGE_DAYS[range] + 1
  const partitions: string[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
    partitions.push(`dt=${day.toISOString().slice(0, 10)}`)
  }

  return partitions
}

function parseNdjson(text: string): StoredEvent[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => mapStoredEvent(JSON.parse(line) as StoredEventRow))
}

async function downloadObject(path: string): Promise<StoredEvent[]> {
  const { data, error } = await getSupabaseClient().storage.from(EVENTS_BUCKET).download(path)

  if (error || !data) {
    return []
  }

  const encoding = path.endsWith('.gz') ? CONTENT_ENCODING.GZIP : CONTENT_ENCODING.NONE

  try {
    return parseNdjson(await gunzipToText(data, encoding))
  } catch {
    // 업로드 도중 잘린 파일은 건너뛴다
    return []
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []

  for (let start = 0; start < items.length; start += limit) {
    const slice = items.slice(start, start + limit)
    results.push(...(await Promise.all(slice.map(task))))
  }

  return results
}

interface StorageObjectRef {
  path: string
  updatedAt: string
}

async function listPartitionObjects(partition: string): Promise<StorageObjectRef[]> {
  const client = getSupabaseClient()

  // list는 한 번에 최대 OBJECT_LIST_LIMIT개만 준다.
  // 페이지를 끝까지 넘기지 않으면 파일이 조용히 누락돼 집계가 틀린다.
  const refs: StorageObjectRef[] = []

  for (let offset = 0; ; offset += OBJECT_LIST_LIMIT) {
    const { data } = await client.storage
      .from(EVENTS_BUCKET)
      .list(partition, { limit: OBJECT_LIST_LIMIT, offset })

    const page = data ?? []

    refs.push(
      ...page
        .filter((entry) => entry.name.includes('.ndjson'))
        .map((entry) => ({
          path: `${partition}/${entry.name}`,
          updatedAt: entry.updated_at ?? entry.created_at ?? '',
        })),
    )

    if (page.length < OBJECT_LIST_LIMIT) {
      break
    }
  }

  return refs
}

/**
 * 오브젝트 싱크 조회.
 * 날짜 파티션 목록을 훑어 배치 파일을 받아온 뒤 클라이언트에서 합친다.
 * 서버 필터가 없으므로 조회 범위는 파티션 경로로만 제한된다.
 */
export async function fetchEventsFromStorage(range: AnalyticsRange): Promise<StoredEvent[]> {
  const since = rangeStart(range).toISOString()

  const listings = await mapWithConcurrency(
    partitionsFor(range),
    OBJECT_DOWNLOAD_CONCURRENCY,
    listPartitionObjects,
  )

  // 하루치가 수백 파일까지 늘어나면 전부 내려받는 순간 탭이 멈춘다.
  // 최신 배치부터 받아 table 싱크와 같은 상한(EVENT_FETCH_LIMIT)을 채우면 멈춘다.
  const refs = listings.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const collected: StoredEvent[] = []

  for (
    let start = 0;
    start < refs.length && collected.length < EVENT_FETCH_LIMIT;
    start += OBJECT_DOWNLOAD_CONCURRENCY
  ) {
    const slice = refs.slice(start, start + OBJECT_DOWNLOAD_CONCURRENCY)
    const batches = await Promise.all(slice.map((ref) => downloadObject(ref.path)))

    collected.push(...batches.flat())
  }

  return collected
    .filter((event) => event.eventTime >= since)
    .sort((a, b) => b.eventTime.localeCompare(a.eventTime))
    .slice(0, EVENT_FETCH_LIMIT)
}

/** 녹화가 존재하는 session_id 집합. 세션 목록에서 재생 가능 여부 표시에 쓴다 */
export async function fetchRecordedSessionIds(): Promise<Set<string>> {
  const { data, error } = await getSupabaseClient()
    .from(RECORDING_CHUNKS_TABLE)
    .select('session_id')
    .order('started_at', { ascending: false })
    .limit(EVENT_FETCH_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(((data ?? []) as { session_id: string }[]).map((row) => row.session_id))
}
