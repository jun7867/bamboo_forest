import styled, { useTheme } from 'styled-components'
import { BOARD_CATEGORY_META, BOARD_CATEGORY_ORDER } from '../../constants/board'
import { WRITING_TREND_INTERVAL } from '../../lib/boardInsights'
import type { BoardInsights, WritingTrend } from '../../lib/boardInsights'
import { DonutChart } from '../charts/DonutChart'
import { RankBarList } from '../charts/RankBarList'
import { TrendAreaChart } from '../charts/TrendAreaChart'
import { formatPercent } from '../charts/chart.constants'

interface BoardStatsProps {
  insights: BoardInsights
  writingTrend: WritingTrend
  onOpenNote: (noteId: string) => void
  onSearchKeyword: (keyword: string) => void
}

const Section = styled.section`
  display: grid;
  gap: 1rem;
`

const SectionHeader = styled.div`
  display: grid;
  gap: 0.3rem;
  padding: 0.6rem 0.4rem 0;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.6;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.section<{ $span: number }>`
  grid-column: span ${({ $span }) => $span};
  display: grid;
  align-content: start;
  gap: 0.9rem;
  padding: 1.15rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  box-shadow: ${({ theme }) => theme.shadows.soft};

  h3 {
    margin: 0;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-column: span 1;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.95rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.82rem;
    font-weight: 700;
  }
`

const RankingList = styled.ol`
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
`

const RankingButton = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(248, 250, 245, 0.95);
  color: ${({ theme }) => theme.colors.textStrong};
  text-align: left;
  transition: background 0.14s ease, transform 0.14s ease;

  &:hover {
    background: #ffffff;
    transform: translateY(-1px);
  }

  b {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 0.9rem;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 0.92rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 800;
    white-space: nowrap;
  }
`

const EmptyText = styled.p`
  margin: 0;
  padding: 0.9rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  background: rgba(247, 248, 244, 0.9);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.6;
  text-align: center;
`

function getPreview(content: string) {
  return content.replace(/\s+/g, ' ').trim()
}

export function BoardStats({
  insights,
  writingTrend,
  onOpenNote,
  onSearchKeyword,
}: BoardStatsProps) {
  const theme = useTheme()
  const cumulativeCounts = writingTrend.buckets.reduce<number[]>((accumulator, bucket) => {
    return [...accumulator, (accumulator[accumulator.length - 1] ?? 0) + bucket.count]
  }, [])

  return (
    <Section aria-labelledby="board-stats-title">
      <SectionHeader>
        <h2 id="board-stats-title">한눈에 보는 대나무숲</h2>
        <p>어떤 이야기가 많이 모였는지, 무엇에 공감이 쏠렸는지 확인해 보세요.</p>
      </SectionHeader>

      <Grid>
        <Card $span={5}>
          <h3>카테고리 분포</h3>
          <DonutChart
            items={BOARD_CATEGORY_ORDER.map((category) => ({
              key: category,
              label: `${BOARD_CATEGORY_META[category].emoji} ${BOARD_CATEGORY_META[category].label}`,
              value: insights.categoryCounts[category],
              color: BOARD_CATEGORY_META[category].accent,
            }))}
            totalLabel="전체 이야기"
            unit="건"
          />
        </Card>

        <Card $span={7}>
          <CardHeader>
            <h3>작성 추이</h3>
            <p>
              회차 시작부터 쌓인 포스트잇 ·{' '}
              {writingTrend.interval === WRITING_TREND_INTERVAL.WEEK ? '주 단위' : '일 단위'}
            </p>
          </CardHeader>
          {writingTrend.buckets.length > 0 ? (
            <TrendAreaChart
              points={writingTrend.buckets.map((bucket) => ({
                key: bucket.key,
                axisLabel: bucket.axisLabel,
                tooltipLabel: bucket.tooltipLabel,
              }))}
              series={[
                {
                  key: 'notes',
                  label: '누적 포스트잇',
                  color: theme.colors.primaryDeep,
                  values: cumulativeCounts,
                },
              ]}
              unit="건"
            />
          ) : (
            <EmptyText>포스트잇이 붙기 시작하면 날짜별 흐름을 그려드려요.</EmptyText>
          )}
        </Card>

        <Card $span={6}>
          <h3>건의사항 세부 주제</h3>
          {insights.suggestionTopicStats.length > 0 ? (
            <RankBarList
              items={insights.suggestionTopicStats.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.count,
                caption: formatPercent(item.ratio),
                isMuted: item.key === 'misc',
              }))}
              color={BOARD_CATEGORY_META.suggestion.accent}
              unit="건"
            />
          ) : (
            <EmptyText>건의가 모이면 내용을 읽고 주제별로 묶어서 보여드려요.</EmptyText>
          )}
        </Card>

        <Card $span={6}>
          <CardHeader>
            <h3>자주 나온 키워드</h3>
            <p>누르면 해당 키워드로 검색해요</p>
          </CardHeader>
          {insights.keywordStats.length > 0 ? (
            <RankBarList
              items={insights.keywordStats.map((item) => ({
                key: item.keyword,
                label: item.keyword,
                value: item.count,
              }))}
              color={theme.colors.primaryDeep}
              unit="회"
              onSelect={onSearchKeyword}
              getSelectTitle={(item) => `'${item.label}' 들어간 포스트잇만 보기`}
            />
          ) : (
            <EmptyText>키워드를 추릴 만큼 글이 쌓이면 여기에 표시돼요.</EmptyText>
          )}
        </Card>

        <Card $span={6}>
          <h3>💗 공감 많은 이야기</h3>
          {insights.topLikedNotes.length > 0 ? (
            <RankingList>
              {insights.topLikedNotes.map((note, index) => (
                <li key={note.id}>
                  <RankingButton type="button" onClick={() => onOpenNote(note.id)}>
                    <b>{index + 1}</b>
                    <span>
                      {BOARD_CATEGORY_META[note.category].emoji} {getPreview(note.content)}
                    </span>
                    <small>공감 {note.likesCount}</small>
                  </RankingButton>
                </li>
              ))}
            </RankingList>
          ) : (
            <EmptyText>공감이 모이면 많이 공감한 이야기를 여기서 모아 볼 수 있어요.</EmptyText>
          )}
        </Card>

        <Card $span={6}>
          <h3>💬 대화가 많은 이야기</h3>
          {insights.topCommentedNotes.length > 0 ? (
            <RankingList>
              {insights.topCommentedNotes.map((note, index) => (
                <li key={note.id}>
                  <RankingButton type="button" onClick={() => onOpenNote(note.id)}>
                    <b>{index + 1}</b>
                    <span>
                      {BOARD_CATEGORY_META[note.category].emoji} {getPreview(note.content)}
                    </span>
                    <small>댓글 {note.commentsCount}</small>
                  </RankingButton>
                </li>
              ))}
            </RankingList>
          ) : (
            <EmptyText>댓글이 달리기 시작하면 대화가 많은 이야기를 보여드릴게요.</EmptyText>
          )}
        </Card>
      </Grid>
    </Section>
  )
}
