import { useState } from 'react'
import { formatDateTime, formatDuration, shortId } from '../../lib/logger/analytics/format'
import type {
  AnalyticsSessionRow,
  AnalyticsUser,
} from '../../lib/logger/analytics/types'
import {
  Card,
  Chip,
  Kpi,
  KpiGrid,
  Mono,
  Muted,
  Split,
  Table,
  TableWrap,
} from './AnalyticsDashboard.style'

interface UsersPanelProps {
  users: AnalyticsUser[]
  sessions: AnalyticsSessionRow[]
  onSelectSession: (sessionId: string) => void
}

export function UsersPanel({ users, sessions, onSelectSession }: UsersPanelProps) {
  const [selectedDistinctId, setSelectedDistinctId] = useState<string | null>(null)
  const selectedUser = users.find((user) => user.distinctId === selectedDistinctId) ?? null
  const userSessions = selectedUser
    ? sessions.filter((session) => session.distinctId === selectedUser.distinctId)
    : []

  return (
    <Split>
      <Card>
        <h2>사용자 {users.length}명</h2>
        <Muted>distinct_id는 기기/브라우저 단위 익명 ID. 행을 누르면 상세가 열려요.</Muted>
        {users.length === 0 ? (
          <Muted>아직 수집된 사용자가 없어요.</Muted>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>최근 방문</th>
                  <th>세션</th>
                  <th>이벤트</th>
                  <th>에러</th>
                  <th>기기</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.distinctId}
                    data-clickable="true"
                    data-active={user.distinctId === selectedDistinctId}
                    onClick={() => setSelectedDistinctId(user.distinctId)}
                  >
                    <td>
                      <Mono>{user.userId ?? shortId(user.distinctId)}</Mono>
                    </td>
                    <td>{formatDateTime(user.lastSeenAt)}</td>
                    <td>{user.sessionCount}</td>
                    <td>{user.eventCount}</td>
                    <td>{user.errorCount}</td>
                    <td>{user.device}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <Card>
        <h2>사용자 상세</h2>
        {!selectedUser ? (
          <Muted>왼쪽에서 사용자를 선택해 주세요.</Muted>
        ) : (
          <>
            <Muted>
              <Mono>{selectedUser.distinctId}</Mono>
              <br />
              {selectedUser.browser} · {selectedUser.device} · 첫 방문{' '}
              {formatDateTime(selectedUser.firstSeenAt)}
            </Muted>

            <KpiGrid>
              <Kpi>
                <span>세션</span>
                <strong>{selectedUser.sessionCount}</strong>
              </Kpi>
              <Kpi>
                <span>이벤트</span>
                <strong>{selectedUser.eventCount}</strong>
              </Kpi>
              <Kpi>
                <span>페이지뷰</span>
                <strong>{selectedUser.pageViewCount}</strong>
              </Kpi>
              <Kpi>
                <span>에러</span>
                <strong>{selectedUser.errorCount}</strong>
              </Kpi>
              <Kpi>
                <span>rage click</span>
                <strong>{selectedUser.rageClickCount}</strong>
              </Kpi>
              <Kpi>
                <span>녹화 세션</span>
                <strong>{selectedUser.recordedSessionCount}</strong>
              </Kpi>
            </KpiGrid>

            <h2>자주 쓴 기능</h2>
            {selectedUser.topEvents.length === 0 ? (
              <Muted>제품 이벤트 기록이 없어요.</Muted>
            ) : (
              <TableWrap>
                <Table>
                  <tbody>
                    {selectedUser.topEvents.map((item) => (
                      <tr key={item.event}>
                        <td>
                          <Mono>{item.event}</Mono>
                        </td>
                        <td>{item.count}회</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}

            <h2>세션</h2>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>시작</th>
                    <th>체류</th>
                    <th>이벤트</th>
                    <th>이탈 경로</th>
                    <th>녹화</th>
                  </tr>
                </thead>
                <tbody>
                  {userSessions.map((session) => (
                    <tr key={session.sessionId}>
                      <td>{formatDateTime(session.startedAt)}</td>
                      <td>{formatDuration(session.durationMs)}</td>
                      <td>{session.eventCount}</td>
                      <td>
                        <Mono>{session.exitPath}</Mono>
                      </td>
                      <td>
                        {session.hasRecording ? (
                          <Chip
                            type="button"
                            onClick={() => onSelectSession(session.sessionId)}
                          >
                            재생
                          </Chip>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </>
        )}
      </Card>
    </Split>
  )
}
