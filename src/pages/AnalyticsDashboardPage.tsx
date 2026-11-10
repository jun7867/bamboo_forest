import { useState } from 'react'
import { ErrorsPanel } from '../components/analytics/ErrorsPanel'
import { EventsPanel } from '../components/analytics/EventsPanel'
import { OverviewPanel } from '../components/analytics/OverviewPanel'
import { SessionsPanel } from '../components/analytics/SessionsPanel'
import { UsersPanel } from '../components/analytics/UsersPanel'
import {
  Chip,
  Header,
  Muted,
  Page,
  Toolbar,
} from '../components/analytics/AnalyticsDashboard.style'
import { useAnalyticsData } from '../lib/logger/analytics/useAnalyticsData'
import {
  ANALYTICS_RANGE,
  ANALYTICS_RANGE_LABEL,
} from '../lib/logger/analytics/types'
import type { AnalyticsRange } from '../lib/logger/analytics/types'

const DASHBOARD_TAB = {
  OVERVIEW: 'overview',
  USERS: 'users',
  SESSIONS: 'sessions',
  EVENTS: 'events',
  ERRORS: 'errors',
} as const

type DashboardTab = (typeof DASHBOARD_TAB)[keyof typeof DASHBOARD_TAB]

const TAB_LABEL: Record<DashboardTab, string> = {
  [DASHBOARD_TAB.OVERVIEW]: '개요',
  [DASHBOARD_TAB.USERS]: '사용자',
  [DASHBOARD_TAB.SESSIONS]: '세션 · 녹화',
  [DASHBOARD_TAB.EVENTS]: '이벤트',
  [DASHBOARD_TAB.ERRORS]: '에러',
}

const RANGE_OPTIONS: AnalyticsRange[] = [
  ANALYTICS_RANGE.DAY,
  ANALYTICS_RANGE.WEEK,
  ANALYTICS_RANGE.MONTH,
]

/** 개발 환경 전용 수집 데이터 대시보드 */
export function AnalyticsDashboardPage() {
  const {
    range,
    setRange,
    reload,
    isLoading,
    errorMessage,
    events,
    sessions,
    users,
    eventStats,
    pathStats,
    errorGroups,
    overview,
    activityTrend,
    composerFunnel,
  } = useAnalyticsData()

  const [tab, setTab] = useState<DashboardTab>(DASHBOARD_TAB.OVERVIEW)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId)
    setTab(DASHBOARD_TAB.SESSIONS)
  }

  return (
    <Page>
      <Header>
        <h1>로그 대시보드</h1>
        <Toolbar>
          {RANGE_OPTIONS.map((option) => (
            <Chip
              key={option}
              type="button"
              $active={option === range}
              onClick={() => setRange(option)}
            >
              {ANALYTICS_RANGE_LABEL[option]}
            </Chip>
          ))}
          <Chip type="button" onClick={reload}>
            새로고침
          </Chip>
        </Toolbar>
      </Header>

      <Toolbar>
        {Object.values(DASHBOARD_TAB).map((option) => (
          <Chip key={option} type="button" $active={option === tab} onClick={() => setTab(option)}>
            {TAB_LABEL[option]}
          </Chip>
        ))}
      </Toolbar>

      {errorMessage ? (
        <Muted>
          불러오지 못했어요: {errorMessage}
          <br />
          <code>supabase/migrations/202608051300_analytics_poc_read_access.sql</code> 를 실행했는지
          확인해 주세요.
        </Muted>
      ) : null}
      {isLoading ? <Muted>불러오는 중이에요...</Muted> : null}

      {tab === DASHBOARD_TAB.OVERVIEW ? (
        <OverviewPanel
          overview={overview}
          eventStats={eventStats}
          pathStats={pathStats}
          activityTrend={activityTrend}
          composerFunnel={composerFunnel}
        />
      ) : null}

      {tab === DASHBOARD_TAB.USERS ? (
        <UsersPanel users={users} sessions={sessions} onSelectSession={handleSelectSession} />
      ) : null}

      {tab === DASHBOARD_TAB.SESSIONS ? (
        <SessionsPanel
          sessions={sessions}
          events={events}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
        />
      ) : null}

      {tab === DASHBOARD_TAB.EVENTS ? <EventsPanel eventStats={eventStats} /> : null}

      {tab === DASHBOARD_TAB.ERRORS ? (
        <ErrorsPanel errorGroups={errorGroups} onSelectSession={handleSelectSession} />
      ) : null}
    </Page>
  )
}
