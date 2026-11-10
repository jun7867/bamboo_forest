import type { EventStat } from '../../lib/logger/analytics/types'
import { Card, Mono, Muted, Table, TableWrap } from './AnalyticsDashboard.style'

interface EventsPanelProps {
  eventStats: EventStat[]
}

export function EventsPanel({ eventStats }: EventsPanelProps) {
  return (
    <Card>
      <h2>이벤트 전체</h2>
      <Muted>
        <Mono>$</Mono> 접두사는 자동 수집 이벤트, 나머지는 제품 이벤트예요.
      </Muted>
      {eventStats.length === 0 ? (
        <Muted>수집된 이벤트가 없어요.</Muted>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>이벤트</th>
                <th>사용자</th>
                <th>세션</th>
                <th>횟수</th>
                <th>사용자당 평균</th>
              </tr>
            </thead>
            <tbody>
              {eventStats.map((stat) => (
                <tr key={stat.event}>
                  <td>
                    <Mono>{stat.event}</Mono>
                  </td>
                  <td>{stat.userCount}</td>
                  <td>{stat.sessionCount}</td>
                  <td>{stat.count}</td>
                  <td>{Math.round((stat.count / stat.userCount) * 10) / 10}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  )
}
