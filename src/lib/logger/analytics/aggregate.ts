import { BOARD_EVENT } from '../events'
import { ANALYTICS_EVENT } from '../types'
import { ANALYTICS_RANGE, ANALYTICS_RANGE_DAYS } from './types'
import type {
  ActivityBucket,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSessionRow,
  AnalyticsUser,
  ErrorGroup,
  EventCount,
  EventStat,
  FunnelStepStat,
  PathStat,
  StoredEvent,
} from './types'

const TOP_EVENT_LIMIT = 5
const UNKNOWN = '-'

function ascendingByTime(events: StoredEvent[]) {
  return [...events].sort((a, b) => a.eventTime.localeCompare(b.eventTime))
}

function toTopEvents(counts: Map<string, number>): EventCount[] {
  return [...counts.entries()]
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_EVENT_LIMIT)
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

export function buildSessions(
  events: StoredEvent[],
  recordedSessionIds: Set<string>,
): AnalyticsSessionRow[] {
  const grouped = new Map<string, StoredEvent[]>()

  for (const event of events) {
    const bucket = grouped.get(event.sessionId)

    if (bucket) {
      bucket.push(event)
    } else {
      grouped.set(event.sessionId, [event])
    }
  }

  const sessions = [...grouped.entries()].map(([sessionId, sessionEvents]) => {
    const ordered = ascendingByTime(sessionEvents)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const pageViews = ordered.filter((event) => event.event === ANALYTICS_EVENT.PAGE_VIEW)

    return {
      sessionId,
      distinctId: first.distinctId,
      startedAt: first.eventTime,
      endedAt: last.eventTime,
      durationMs: new Date(last.eventTime).getTime() - new Date(first.eventTime).getTime(),
      eventCount: ordered.length,
      pageViewCount: pageViews.length,
      errorCount: ordered.filter((event) => event.event === ANALYTICS_EVENT.ERROR).length,
      rageClickCount: ordered.filter((event) => event.event === ANALYTICS_EVENT.RAGE_CLICK)
        .length,
      entryPath: first.context.path ?? UNKNOWN,
      exitPath: last.context.path ?? UNKNOWN,
      device: first.context.deviceType ?? UNKNOWN,
      hasRecording: recordedSessionIds.has(sessionId),
    }
  })

  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function buildUsers(
  events: StoredEvent[],
  sessions: AnalyticsSessionRow[],
): AnalyticsUser[] {
  const sessionsByUser = new Map<string, AnalyticsSessionRow[]>()

  for (const session of sessions) {
    const bucket = sessionsByUser.get(session.distinctId)

    if (bucket) {
      bucket.push(session)
    } else {
      sessionsByUser.set(session.distinctId, [session])
    }
  }

  const eventsByUser = new Map<string, StoredEvent[]>()

  for (const event of events) {
    const bucket = eventsByUser.get(event.distinctId)

    if (bucket) {
      bucket.push(event)
    } else {
      eventsByUser.set(event.distinctId, [event])
    }
  }

  const users = [...eventsByUser.entries()].map(([distinctId, userEvents]) => {
    const ordered = ascendingByTime(userEvents)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const userSessions = sessionsByUser.get(distinctId) ?? []
    const counts = new Map<string, number>()

    for (const event of ordered) {
      // 자동 수집 이벤트는 "어떤 기능을 쓰는가"에 답하지 않아 상위 목록에서 뺀다
      if (!event.event.startsWith('$')) {
        increment(counts, event.event)
      }
    }

    return {
      distinctId,
      userId: ordered.find((event) => event.userId)?.userId ?? null,
      firstSeenAt: first.eventTime,
      lastSeenAt: last.eventTime,
      sessionCount: userSessions.length,
      eventCount: ordered.length,
      pageViewCount: ordered.filter((event) => event.event === ANALYTICS_EVENT.PAGE_VIEW).length,
      errorCount: ordered.filter((event) => event.event === ANALYTICS_EVENT.ERROR).length,
      rageClickCount: ordered.filter((event) => event.event === ANALYTICS_EVENT.RAGE_CLICK)
        .length,
      device: last.context.deviceType ?? UNKNOWN,
      browser: last.context.browser ?? UNKNOWN,
      entryPath: first.context.path ?? UNKNOWN,
      topEvents: toTopEvents(counts),
      recordedSessionCount: userSessions.filter((session) => session.hasRecording).length,
    }
  })

  return users.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
}

export function buildEventStats(events: StoredEvent[]): EventStat[] {
  const stats = new Map<string, { count: number; users: Set<string>; sessions: Set<string> }>()

  for (const event of events) {
    const entry = stats.get(event.event) ?? {
      count: 0,
      users: new Set<string>(),
      sessions: new Set<string>(),
    }

    entry.count += 1
    entry.users.add(event.distinctId)
    entry.sessions.add(event.sessionId)
    stats.set(event.event, entry)
  }

  return [...stats.entries()]
    .map(([event, entry]) => ({
      event,
      count: entry.count,
      userCount: entry.users.size,
      sessionCount: entry.sessions.size,
    }))
    .sort((a, b) => b.userCount - a.userCount || b.count - a.count)
}

export function buildPathStats(
  events: StoredEvent[],
  sessions: AnalyticsSessionRow[],
): PathStat[] {
  const views = new Map<string, { count: number; users: Set<string> }>()
  const durations = new Map<string, number[]>()

  for (const event of events) {
    const path = event.context.path ?? UNKNOWN

    if (event.event === ANALYTICS_EVENT.PAGE_VIEW) {
      const entry = views.get(path) ?? { count: 0, users: new Set<string>() }
      entry.count += 1
      entry.users.add(event.distinctId)
      views.set(path, entry)
    }

    if (event.event === ANALYTICS_EVENT.PAGE_LEAVE) {
      const durationMs = Number(event.properties.durationMs)

      if (Number.isFinite(durationMs)) {
        durations.set(path, [...(durations.get(path) ?? []), durationMs])
      }
    }
  }

  const exits = new Map<string, number>()

  for (const session of sessions) {
    increment(exits, session.exitPath)
  }

  return [...views.entries()]
    .map(([path, entry]) => {
      const samples = durations.get(path) ?? []

      return {
        path,
        viewCount: entry.count,
        userCount: entry.users.size,
        exitCount: exits.get(path) ?? 0,
        avgDurationMs: samples.length
          ? Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length)
          : 0,
      }
    })
    .sort((a, b) => b.viewCount - a.viewCount)
}

export function buildErrorGroups(events: StoredEvent[]): ErrorGroup[] {
  const groups = new Map<string, { events: StoredEvent[]; users: Set<string> }>()

  for (const event of events) {
    if (event.event !== ANALYTICS_EVENT.ERROR) {
      continue
    }

    const message = String(event.properties.message ?? UNKNOWN)
    const path = event.context.path ?? UNKNOWN
    const key = `${message}@@${path}`
    const entry = groups.get(key) ?? { events: [], users: new Set<string>() }

    entry.events.push(event)
    entry.users.add(event.distinctId)
    groups.set(key, entry)
  }

  return [...groups.entries()]
    .map(([key, entry]) => {
      const ordered = ascendingByTime(entry.events)
      const sample = ordered[ordered.length - 1]

      return {
        key,
        message: String(sample.properties.message ?? UNKNOWN),
        path: sample.context.path ?? UNKNOWN,
        source: String(sample.properties.source ?? UNKNOWN),
        count: entry.events.length,
        userCount: entry.users.size,
        lastSeenAt: sample.eventTime,
        sample,
      }
    })
    .sort((a, b) => b.count - a.count)
}

export function buildOverview(
  events: StoredEvent[],
  sessions: AnalyticsSessionRow[],
): AnalyticsOverview {
  const users = new Set(events.map((event) => event.distinctId))
  const totalDuration = sessions.reduce((sum, session) => sum + session.durationMs, 0)

  return {
    userCount: users.size,
    sessionCount: sessions.length,
    eventCount: events.length,
    errorCount: events.filter((event) => event.event === ANALYTICS_EVENT.ERROR).length,
    rageClickCount: events.filter((event) => event.event === ANALYTICS_EVENT.RAGE_CLICK).length,
    avgSessionDurationMs: sessions.length ? Math.round(totalDuration / sessions.length) : 0,
    avgEventsPerSession: sessions.length
      ? Math.round((events.length / sessions.length) * 10) / 10
      : 0,
  }
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** 24시간 범위는 시간 단위, 그 외는 일 단위로 활성 사용자·세션 수를 센다 */
export function buildActivityTrend(
  events: StoredEvent[],
  range: AnalyticsRange,
  now = Date.now(),
): ActivityBucket[] {
  const isHourly = range === ANALYTICS_RANGE.DAY
  const bucketMs = isHourly ? HOUR_MS : DAY_MS
  const bucketCount = isHourly ? 24 : ANALYTICS_RANGE_DAYS[range]
  const current = new Date(now)
  const lastBucketStart = isHourly
    ? new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        current.getHours(),
      ).getTime()
    : new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime()
  const firstBucketStart = lastBucketStart - (bucketCount - 1) * bucketMs

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(firstBucketStart + index * bucketMs)

    return {
      start,
      users: new Set<string>(),
      sessions: new Set<string>(),
    }
  })

  for (const event of events) {
    const index = Math.floor((Date.parse(event.eventTime) - firstBucketStart) / bucketMs)
    const bucket = buckets[index]

    if (bucket) {
      bucket.users.add(event.distinctId)
      bucket.sessions.add(event.sessionId)
    }
  }

  return buckets.map(({ start, users, sessions }) => ({
    key: start.toISOString(),
    axisLabel: isHourly ? `${start.getHours()}시` : `${start.getMonth() + 1}/${start.getDate()}`,
    tooltipLabel: isHourly
      ? `${start.getMonth() + 1}월 ${start.getDate()}일 ${start.getHours()}시`
      : `${start.getMonth() + 1}월 ${start.getDate()}일`,
    userCount: users.size,
    sessionCount: sessions.size,
  }))
}

const COMPOSER_FUNNEL_STEPS = [
  { event: BOARD_EVENT.COMPOSER_OPENED, label: '작성창 열기' },
  { event: BOARD_EVENT.NOTE_SUBMIT_ATTEMPTED, label: '등록 시도' },
  { event: BOARD_EVENT.NOTE_CREATED, label: '등록 완료' },
] as const

/** 세션 기준 퍼널. 앞 단계를 거친 세션만 다음 단계로 센다 */
export function buildComposerFunnel(events: StoredEvent[]): FunnelStepStat[] {
  const sessionsByEvent = new Map<string, Set<string>>()

  for (const event of events) {
    const bucket = sessionsByEvent.get(event.event)

    if (bucket) {
      bucket.add(event.sessionId)
    } else {
      sessionsByEvent.set(event.event, new Set([event.sessionId]))
    }
  }

  let reached: Set<string> | null = null

  return COMPOSER_FUNNEL_STEPS.map((step) => {
    const stepSessions = sessionsByEvent.get(step.event) ?? new Set<string>()
    const previous: Set<string> | null = reached
    const current: Set<string> = previous
      ? new Set([...stepSessions].filter((sessionId) => previous.has(sessionId)))
      : stepSessions

    reached = current

    return { key: step.event, label: step.label, sessionCount: current.size }
  })
}
