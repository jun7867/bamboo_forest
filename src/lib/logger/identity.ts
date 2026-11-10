import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
  STORAGE_KEY,
} from './constants'
import type { AnalyticsSession } from './types'

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 사파리 프라이빗 모드 등 저장 실패는 추적을 막을 이유가 아니다
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // noop
  }
}

let memoryDistinctId: string | null = null

export function getDistinctId() {
  if (memoryDistinctId) {
    return memoryDistinctId
  }

  const saved = readStorage(STORAGE_KEY.DISTINCT_ID)

  if (saved) {
    memoryDistinctId = saved
    return saved
  }

  const nextId = crypto.randomUUID()
  writeStorage(STORAGE_KEY.DISTINCT_ID, nextId)
  memoryDistinctId = nextId
  return nextId
}

export function resetDistinctId() {
  const nextId = crypto.randomUUID()
  writeStorage(STORAGE_KEY.DISTINCT_ID, nextId)
  memoryDistinctId = nextId
  return nextId
}

export function getUserId() {
  return readStorage(STORAGE_KEY.USER_ID)
}

export function setUserId(userId: string) {
  writeStorage(STORAGE_KEY.USER_ID, userId)
}

export function clearUserId() {
  removeStorage(STORAGE_KEY.USER_ID)
}

function createSession(now: number): AnalyticsSession {
  const startedAt = new Date(now).toISOString()

  return {
    id: crypto.randomUUID(),
    startedAt,
    lastActiveAt: startedAt,
    samplingRoll: Math.random(),
  }
}

function parseSession(raw: string | null): AnalyticsSession | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AnalyticsSession>

    if (!parsed.id || !parsed.startedAt || !parsed.lastActiveAt) {
      return null
    }

    return {
      id: parsed.id,
      startedAt: parsed.startedAt,
      lastActiveAt: parsed.lastActiveAt,
      samplingRoll:
        typeof parsed.samplingRoll === 'number' ? parsed.samplingRoll : Math.random(),
    }
  } catch {
    return null
  }
}

function isExpired(session: AnalyticsSession, now: number) {
  const idleFor = now - new Date(session.lastActiveAt).getTime()
  const aliveFor = now - new Date(session.startedAt).getTime()

  return idleFor > SESSION_IDLE_TIMEOUT_MS || aliveFor > SESSION_MAX_DURATION_MS
}

/**
 * 유휴 30분 / 최대 8시간 기준으로 세션을 갱신한다.
 * 세션 상태의 단일 출처는 localStorage이며, 탭 간에도 그대로 공유된다.
 */
export function touchSession(now = Date.now()): {
  session: AnalyticsSession
  isNew: boolean
} {
  const saved = parseSession(readStorage(STORAGE_KEY.SESSION))

  if (saved && !isExpired(saved, now)) {
    const session: AnalyticsSession = {
      ...saved,
      lastActiveAt: new Date(now).toISOString(),
    }
    writeStorage(STORAGE_KEY.SESSION, JSON.stringify(session))
    return { session, isNew: false }
  }

  const session = createSession(now)
  writeStorage(STORAGE_KEY.SESSION, JSON.stringify(session))
  return { session, isNew: true }
}
