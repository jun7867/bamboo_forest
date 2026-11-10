import { useState } from 'react'
import { formatDateTime, shortId } from '../../lib/logger/analytics/format'
import type { AnalyticsBreadcrumb } from '../../lib/logger/types'
import type { ErrorGroup } from '../../lib/logger/analytics/types'
import { Card, Chip, Mono, Muted, Pre, Table, TableWrap } from './AnalyticsDashboard.style'

interface ErrorsPanelProps {
  errorGroups: ErrorGroup[]
  onSelectSession: (sessionId: string) => void
}

function readBreadcrumbs(group: ErrorGroup): AnalyticsBreadcrumb[] {
  const raw = group.sample.properties.breadcrumbs

  return Array.isArray(raw) ? (raw as unknown as AnalyticsBreadcrumb[]) : []
}

export function ErrorsPanel({ errorGroups, onSelectSession }: ErrorsPanelProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (errorGroups.length === 0) {
    return (
      <Card>
        <h2>에러</h2>
        <Muted>수집된 에러가 없어요.</Muted>
      </Card>
    )
  }

  return (
    <Card>
      <h2>에러 {errorGroups.length}종</h2>
      <Muted>행을 누르면 에러 직전 사용자 행동(breadcrumbs)이 펼쳐져요.</Muted>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th>메시지</th>
              <th>경로</th>
              <th>발생원</th>
              <th>횟수</th>
              <th>사용자</th>
              <th>마지막</th>
              <th>세션</th>
            </tr>
          </thead>
          <tbody>
            {errorGroups.map((group) => (
              <tr
                key={group.key}
                data-clickable="true"
                data-active={group.key === expandedKey}
                onClick={() => setExpandedKey(group.key === expandedKey ? null : group.key)}
              >
                <td>{group.message}</td>
                <td>
                  <Mono>{group.path}</Mono>
                </td>
                <td>{group.source}</td>
                <td>{group.count}</td>
                <td>{group.userCount}</td>
                <td>{formatDateTime(group.lastSeenAt)}</td>
                <td>
                  <Chip
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectSession(group.sample.sessionId)
                    }}
                  >
                    {shortId(group.sample.sessionId)}
                  </Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      {expandedKey ? (
        <Pre>
          {JSON.stringify(
            readBreadcrumbs(errorGroups.find((group) => group.key === expandedKey)!),
            null,
            2,
          )}
        </Pre>
      ) : null}
    </Card>
  )
}
