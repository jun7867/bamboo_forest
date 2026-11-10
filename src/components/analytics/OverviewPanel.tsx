import { formatDuration } from '../../lib/logger/analytics/format'
import type {
  ActivityBucket,
  AnalyticsOverview,
  EventStat,
  FunnelStepStat,
  PathStat,
} from '../../lib/logger/analytics/types'
import { FunnelChart } from '../charts/FunnelChart'
import { RankBarList } from '../charts/RankBarList'
import { TrendAreaChart } from '../charts/TrendAreaChart'
import { CHART_PALETTE } from '../charts/chart.constants'
import {
  Card,
  CardHeader,
  Kpi,
  KpiGrid,
  LegendChip,
  Mono,
  Muted,
  Split,
  Table,
  TableWrap,
} from './AnalyticsDashboard.style'

const TOP_ROW_LIMIT = 8

// Figma 규칙(1·4번)은 2계열일 때 두 파랑이 구분되지 않아 1·10번을 쓴다
const ACTIVITY_SERIES = [
  {
    key: 'users',
    label: '사용자',
    color: CHART_PALETTE[0],
    pick: (bucket: ActivityBucket) => bucket.userCount,
  },
  {
    key: 'sessions',
    label: '세션',
    color: CHART_PALETTE[9],
    pick: (bucket: ActivityBucket) => bucket.sessionCount,
  },
] as const

interface OverviewPanelProps {
  overview: AnalyticsOverview
  eventStats: EventStat[]
  pathStats: PathStat[]
  activityTrend: ActivityBucket[]
  composerFunnel: FunnelStepStat[]
}

export function OverviewPanel({
  overview,
  eventStats,
  pathStats,
  activityTrend,
  composerFunnel,
}: OverviewPanelProps) {
  const featureStats = eventStats
    .filter((stat) => !stat.event.startsWith('$'))
    .slice(0, TOP_ROW_LIMIT)
  const activitySeries = ACTIVITY_SERIES.map((series) => ({
    key: series.key,
    label: series.label,
    color: series.color,
    values: activityTrend.map(series.pick),
  }))

  return (
    <>
      <Card>
        <h2>요약</h2>
        <KpiGrid>
          <Kpi>
            <span>사용자</span>
            <strong>{overview.userCount}</strong>
          </Kpi>
          <Kpi>
            <span>세션</span>
            <strong>{overview.sessionCount}</strong>
          </Kpi>
          <Kpi>
            <span>이벤트</span>
            <strong>{overview.eventCount}</strong>
          </Kpi>
          <Kpi>
            <span>평균 체류</span>
            <strong>{formatDuration(overview.avgSessionDurationMs)}</strong>
          </Kpi>
          <Kpi>
            <span>세션당 이벤트</span>
            <strong>{overview.avgEventsPerSession}</strong>
          </Kpi>
          <Kpi>
            <span>에러</span>
            <strong>{overview.errorCount}</strong>
          </Kpi>
          <Kpi>
            <span>rage click</span>
            <strong>{overview.rageClickCount}</strong>
          </Kpi>
        </KpiGrid>
      </Card>

      <Split>
        <Card>
          <CardHeader>
            <h2>활동 추이</h2>
            <div>
              {activitySeries.map((series) => (
                <LegendChip key={series.key} $color={series.color}>
                  {series.label}
                </LegendChip>
              ))}
            </div>
          </CardHeader>
          <TrendAreaChart
            points={activityTrend.map((bucket) => ({
              key: bucket.key,
              axisLabel: bucket.axisLabel,
              tooltipLabel: bucket.tooltipLabel,
            }))}
            series={activitySeries}
            unit=""
            height={240}
          />
        </Card>

        <Card>
          <h2>포스트잇 작성 퍼널</h2>
          <Muted>세션 기준. 빨간 전환율이 가장 많이 빠지는 단계다.</Muted>
          <FunnelChart
            steps={composerFunnel.map((step) => ({
              key: step.key,
              label: step.label,
              value: step.sessionCount,
            }))}
            unit=""
          />
        </Card>
      </Split>

      <Split>
        <Card>
          <h2>기능 사용 순위</h2>
          <Muted>사용자 수 기준. 아래쪽에 오래 머무는 기능이 제거 후보다.</Muted>
          {featureStats.length === 0 ? (
            <Muted>아직 제품 이벤트가 쌓이지 않았어요.</Muted>
          ) : (
            <RankBarList
              items={featureStats.map((stat) => ({
                key: stat.event,
                label: stat.event,
                value: stat.userCount,
                caption: `${stat.count}회`,
              }))}
              color={CHART_PALETTE[0]}
              unit="명"
            />
          )}
        </Card>

        <Card>
          <h2>페이지별 이탈</h2>
          <Muted>이탈 = 그 페이지에서 세션이 끝난 횟수.</Muted>
          {pathStats.length === 0 ? (
            <Muted>페이지뷰가 아직 없어요.</Muted>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>경로</th>
                    <th>조회</th>
                    <th>사용자</th>
                    <th>이탈</th>
                    <th>평균 체류</th>
                  </tr>
                </thead>
                <tbody>
                  {pathStats.slice(0, TOP_ROW_LIMIT).map((stat) => (
                    <tr key={stat.path}>
                      <td>
                        <Mono>{stat.path}</Mono>
                      </td>
                      <td>{stat.viewCount}</td>
                      <td>{stat.userCount}</td>
                      <td>{stat.exitCount}</td>
                      <td>{formatDuration(stat.avgDurationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </Split>
    </>
  )
}
