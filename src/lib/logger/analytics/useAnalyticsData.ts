import { useEffect, useMemo, useState } from 'react'
import {
  buildActivityTrend,
  buildComposerFunnel,
  buildErrorGroups,
  buildEventStats,
  buildOverview,
  buildPathStats,
  buildSessions,
  buildUsers,
} from './aggregate'
import { ANALYTICS_SINK_MODE } from '../../../config/analytics'
import { ANALYTICS_SINK } from '../types'
import {
  fetchEventsFromStorage,
  fetchEventsFromTable,
  fetchRecordedSessionIds,
} from './queries'
import { ANALYTICS_RANGE } from './types'
import type { AnalyticsRange, StoredEvent } from './types'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      range: AnalyticsRange
      events: StoredEvent[]
      recordedSessionIds: Set<string>
    }

const EMPTY_EVENTS: StoredEvent[] = []
const EMPTY_RECORDINGS = new Set<string>()

/**
 * 조회 → 집계를 한 곳에서 담당한다.
 * 집계는 순수 함수(aggregate.ts)라 화면은 결과만 그린다.
 */
export function useAnalyticsData() {
  const [range, setRange] = useState<AnalyticsRange>(ANALYTICS_RANGE.WEEK)
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let isStale = false

    const fetchEvents =
      ANALYTICS_SINK_MODE === ANALYTICS_SINK.STORAGE
        ? fetchEventsFromStorage
        : fetchEventsFromTable

    Promise.all([fetchEvents(range), fetchRecordedSessionIds()])
      .then(([events, recordedSessionIds]) => {
        if (!isStale) {
          setState({ status: 'ready', range, events, recordedSessionIds })
        }
      })
      .catch((error: Error) => {
        if (!isStale) {
          setState({ status: 'error', message: error.message })
        }
      })

    return () => {
      isStale = true
    }
  }, [range, reloadToken])

  const events = state.status === 'ready' ? state.events : EMPTY_EVENTS
  const loadedRange = state.status === 'ready' ? state.range : range
  const recordedSessionIds =
    state.status === 'ready' ? state.recordedSessionIds : EMPTY_RECORDINGS

  const sessions = useMemo(
    () => buildSessions(events, recordedSessionIds),
    [events, recordedSessionIds],
  )
  const users = useMemo(() => buildUsers(events, sessions), [events, sessions])
  const eventStats = useMemo(() => buildEventStats(events), [events])
  const pathStats = useMemo(() => buildPathStats(events, sessions), [events, sessions])
  const errorGroups = useMemo(() => buildErrorGroups(events), [events])
  const overview = useMemo(() => buildOverview(events, sessions), [events, sessions])
  const activityTrend = useMemo(
    () => buildActivityTrend(events, loadedRange),
    [events, loadedRange],
  )
  const composerFunnel = useMemo(() => buildComposerFunnel(events), [events])

  return {
    range,
    setRange,
    reload: () => setReloadToken((token) => token + 1),
    isLoading: state.status === 'loading' || (state.status === 'ready' && state.range !== range),
    errorMessage: state.status === 'error' ? state.message : null,
    events,
    sessions,
    users,
    eventStats,
    pathStats,
    errorGroups,
    overview,
    activityTrend,
    composerFunnel,
  }
}
