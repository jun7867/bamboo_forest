import { getSupabaseClient } from '../../supabase'
import { CONTENT_ENCODING, gzipText } from '../compress'
import { EVENTS_BUCKET } from '../constants'
import { toEventRow } from './supabaseTransport'
import type { AnalyticsBatch, AnalyticsTransport } from '../types'

/** dt=YYYY-MM-DD 로 잘라야 조회 시 받아올 파일 범위가 제한된다 */
export function buildPartition(isoTime: string) {
  return `dt=${isoTime.slice(0, 10)}`
}

export function buildObjectPath(batch: AnalyticsBatch, extension: string) {
  const anchor = batch.events[0]?.eventTime ?? new Date().toISOString()

  return `${buildPartition(anchor)}/${batch.id}.${extension}`
}

/** ClickHouse가 그대로 읽을 수 있도록 DB 컬럼과 같은 모양의 NDJSON으로 쓴다 */
export function toNdjson(batch: AnalyticsBatch) {
  return batch.events.map((event) => JSON.stringify(toEventRow(event))).join('\n')
}

/**
 * 이벤트를 행 단위 insert 대신 배치 단위 오브젝트로 적재한다.
 * 파일명이 배치 id라서 재시도가 새 파일을 만들지 않고 같은 파일을 덮어쓴다.
 */
export function createStorageTransport(): AnalyticsTransport {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  return {
    name: 'storage',
    async send(batch: AnalyticsBatch) {
      const { blob, encoding } = await gzipText(toNdjson(batch))
      const path = buildObjectPath(
        batch,
        encoding === CONTENT_ENCODING.GZIP ? 'ndjson.gz' : 'ndjson',
      )

      const { error } = await getSupabaseClient()
        .storage.from(EVENTS_BUCKET)
        .upload(path, blob, { contentType: 'application/x-ndjson', upsert: true })

      if (error) {
        throw new Error(`analytics upload failed: ${error.message}`)
      }
    },
    sendOnExit(batch: AnalyticsBatch) {
      if (!supabaseUrl || !supabaseAnonKey) {
        return
      }

      // 이탈 직전에는 압축할 시간이 없다. 비압축으로 올리고 확장자로 구분한다
      const path = buildObjectPath(batch, 'ndjson')

      void fetch(`${supabaseUrl}/storage/v1/object/${EVENTS_BUCKET}/${path}`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/x-ndjson',
          'x-upsert': 'true',
        },
        body: toNdjson(batch),
      }).catch(() => {
        // 페이지가 사라지는 중이라 복구할 방법이 없다
      })
    },
  }
}
