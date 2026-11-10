import { formatDateTime, formatDuration, formatTime, shortId } from '../../lib/logger/analytics/format'
import type {
  AnalyticsSessionRow,
  StoredEvent,
} from '../../lib/logger/analytics/types'
import { SessionPlayer } from './SessionPlayer'
import {
  Card,
  Mono,
  Muted,
  Pre,
  Split,
  Table,
  TableWrap,
  Timeline,
  TimelineItem,
} from './AnalyticsDashboard.style'

interface SessionsPanelProps {
  sessions: AnalyticsSessionRow[]
  events: StoredEvent[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export function SessionsPanel({
  sessions,
  events,
  selectedSessionId,
  onSelectSession,
}: SessionsPanelProps) {
  const selectedSession =
    sessions.find((session) => session.sessionId === selectedSessionId) ?? null

  const timeline = selectedSession
    ? events
        .filter((event) => event.sessionId === selectedSession.sessionId)
        .sort((a, b) => a.eventTime.localeCompare(b.eventTime))
    : []

  return (
    <Split>
      <Card>
        <h2>세션 {sessions.length}개</h2>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>세션</th>
                <th>사용자</th>
                <th>시작</th>
                <th>체류</th>
                <th>이벤트</th>
                <th>이탈</th>
                <th>녹화</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.sessionId}
                  data-clickable="true"
                  data-active={session.sessionId === selectedSessionId}
                  onClick={() => onSelectSession(session.sessionId)}
                >
                  <td>
                    <Mono>{shortId(session.sessionId)}</Mono>
                  </td>
                  <td>
                    <Mono>{shortId(session.distinctId)}</Mono>
                  </td>
                  <td>{formatDateTime(session.startedAt)}</td>
                  <td>{formatDuration(session.durationMs)}</td>
                  <td>{session.eventCount}</td>
                  <td>
                    <Mono>{session.exitPath}</Mono>
                  </td>
                  <td>{session.hasRecording ? '●' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <h2>세션 상세</h2>
        {!selectedSession ? (
          <Muted>왼쪽에서 세션을 선택해 주세요.</Muted>
        ) : (
          <>
            <Muted>
              <Mono>{selectedSession.sessionId}</Mono>
              <br />
              {selectedSession.entryPath} → {selectedSession.exitPath} ·{' '}
              {formatDuration(selectedSession.durationMs)} · 에러 {selectedSession.errorCount} ·
              rage {selectedSession.rageClickCount}
            </Muted>

            {selectedSession.hasRecording ? (
              <SessionPlayer sessionId={selectedSession.sessionId} />
            ) : (
              <Muted>이 세션에는 녹화가 없어요.</Muted>
            )}

            <h2>행동 타임라인</h2>
            <Timeline>
              {timeline.map((event) => (
                <TimelineItem key={event.id}>
                  <time>{formatTime(event.eventTime)}</time>
                  <div>
                    <Mono>{event.event}</Mono>
                    {Object.keys(event.properties).length > 0 ? (
                      <Pre>{JSON.stringify(event.properties, null, 2)}</Pre>
                    ) : null}
                  </div>
                </TimelineItem>
              ))}
            </Timeline>
          </>
        )}
      </Card>
    </Split>
  )
}
