import type { BoardSeason } from '../config/boardVersion'
import { BOARD_CATEGORY_ORDER, BOARD_CATEGORY_META } from '../constants/board'
import type { BoardCategory, BoardNote } from '../types/board'

export const SUGGESTION_TOPIC_META = {
  communication: {
    label: '커뮤니케이션',
    keywords: ['회의', '공유', '전달', '소통', '피드백', '안건', '브리핑'],
  },
  process: {
    label: '업무 프로세스',
    keywords: ['프로세스', '절차', '승인', '일정', '플로우', '자동화', '체계'],
  },
  docs: {
    label: '문서화',
    keywords: ['문서', '가이드', '위키', '정리', '매뉴얼', '온보딩', '노션'],
  },
  tools: {
    label: '도구·환경',
    keywords: ['툴', '환경', '시스템', '장비', '세팅', '에디터', '개발환경'],
  },
  culture: {
    label: '문화·복지',
    keywords: ['문화', '복지', '점심', '행사', '분위기', '리프레시', '근무'],
  },
  hiring: {
    label: '채용 운영',
    keywords: ['채용', '공고', '지원자', '인터뷰', '면접', '후보자', '채용프로세스'],
  },
  collaboration: {
    label: '협업 방식',
    keywords: ['협업', '업무분담', '핸드오프', '역할', '책임', '정렬', '일하는방식'],
  },
  misc: {
    label: '기타',
    keywords: [],
  },
} as const

type SuggestionTopicKey = keyof typeof SUGGESTION_TOPIC_META

export interface BoardInsights {
  totalNotes: number
  totalLikes: number
  totalComments: number
  categoryCounts: Record<BoardCategory, number>
  suggestionTopicStats: Array<{
    key: SuggestionTopicKey
    label: string
    count: number
    ratio: number
  }>
  mostDiscussedCategory: {
    key: BoardCategory
    label: string
    count: number
  } | null
  topLikedNotes: Array<{
    id: string
    content: string
    category: BoardCategory
    likesCount: number
  }>
  topCommentedNotes: Array<{
    id: string
    content: string
    category: BoardCategory
    commentsCount: number
  }>
  recentTrend: {
    last7Days: number
    last30Days: number
  }
  keywordStats: Array<{
    keyword: string
    count: number
  }>
}

const STOPWORDS = new Set([
  '그리고',
  '그냥',
  '정말',
  '진짜',
  '조금',
  '너무',
  '많이',
  '항상',
  '지금',
  '이번',
  '다음',
  '우리',
  '저희',
  '제가',
  '저는',
  '모두',
  '함께',
  '같아요',
  '같습니다',
  '좋겠어요',
  '좋겠습니다',
  '좋을',
  '좋은',
  '있는',
  '없는',
  '있으면',
  '있어요',
  '없어요',
  '싶어요',
  '합니다',
  '했으면',
  '하면',
  '해서',
  '하는',
  '이런',
  '저런',
  '그런',
  '대한',
  '관련',
  '생각',
  '부분',
  '하나',
  '어떨까요',
  '궁금해요',
  '감사합니다',
  '고마워요',
  '훨씬',
  '보면',
  '하고',
  '해요',
  '되면',
  '같은',
  '정리해',
  '어떻게',
  '더',
  '것',
  '수',
  '좀',
])

// 긴 조사부터 확인해야 '에서'가 '에'로 잘리지 않는다
const TRAILING_PARTICLES = [
  '에서는',
  '에게서',
  '으로는',
  '에서',
  '에게',
  '으로',
  '까지',
  '부터',
  '처럼',
  '보다',
  '이랑',
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '도',
  '로',
  '와',
  '과',
  '랑',
  '만',
]

const MIN_KEYWORD_LENGTH = 2

function stripTrailingParticle(word: string) {
  const particle = TRAILING_PARTICLES.find(
    (candidate) =>
      word.endsWith(candidate) && word.length - candidate.length >= MIN_KEYWORD_LENGTH,
  )

  return particle ? word.slice(0, -particle.length) : word
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

function classifySuggestionTopic(content: string): SuggestionTopicKey {
  const normalized = normalizeText(content)

  let bestMatch: SuggestionTopicKey = 'misc'
  let bestScore = 0

  ;(Object.entries(SUGGESTION_TOPIC_META) as Array<
    [SuggestionTopicKey, (typeof SUGGESTION_TOPIC_META)[SuggestionTopicKey]]
  >).forEach(([key, meta]) => {
    if (key === 'misc') {
      return
    }

    const score = meta.keywords.reduce((count, keyword) => {
      return count + (normalized.includes(normalizeText(keyword)) ? 1 : 0)
    }, 0)

    if (score > bestScore) {
      bestMatch = key
      bestScore = score
    }
  })

  return bestMatch
}

function getRecentCount(notes: BoardNote[], days: number, now: Date) {
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - days)

  return notes.filter((note) => {
    if (!note.createdAt) {
      return false
    }

    return new Date(note.createdAt).getTime() >= threshold.getTime()
  }).length
}

function getKeywordStats(notes: BoardNote[]) {
  const keywordCounts = notes.reduce<Record<string, number>>((accumulator, note) => {
    const words = note.content
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((word) => stripTrailingParticle(word.trim()))
      .filter((word) => word.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(word))

    words.forEach((word) => {
      accumulator[word] = (accumulator[word] ?? 0) + 1
    })

    return accumulator
  }, {})

  return Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
}

export function getBoardInsights(notes: BoardNote[]): BoardInsights {
  const categoryCounts = BOARD_CATEGORY_ORDER.reduce<Record<BoardCategory, number>>(
    (accumulator, category) => {
      accumulator[category] = notes.filter((note) => note.category === category).length
      return accumulator
    },
    {
      praise: 0,
      suggestion: 0,
      freeTalk: 0,
      question: 0,
    },
  )

  const totalNotes = notes.length
  const suggestionNotes = notes.filter((note) => note.category === 'suggestion')
  const topicCounts = suggestionNotes.reduce<Record<SuggestionTopicKey, number>>(
    (accumulator, note) => {
      const key = classifySuggestionTopic(note.content)
      accumulator[key] += 1
      return accumulator
    },
    {
      communication: 0,
      process: 0,
      docs: 0,
      tools: 0,
      culture: 0,
      hiring: 0,
      collaboration: 0,
      misc: 0,
    },
  )

  const suggestionTopicStats = (Object.entries(topicCounts) as Array<
    [SuggestionTopicKey, number]
  >)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      label: SUGGESTION_TOPIC_META[key].label,
      count,
      ratio: suggestionNotes.length > 0 ? count / suggestionNotes.length : 0,
    }))
    .sort((left, right) => right.count - left.count)

  const mostDiscussedCategory =
    BOARD_CATEGORY_ORDER.map((category) => ({
      key: category,
      label: BOARD_CATEGORY_META[category].label,
      count: categoryCounts[category],
    })).sort((left, right) => right.count - left.count)[0] ?? null

  const topLikedNotes = notes
    .filter((note) => (note.likesCount ?? 0) > 0)
    .sort((left, right) => (right.likesCount ?? 0) - (left.likesCount ?? 0))
    .slice(0, 5)
    .map((note) => ({
      id: note.id,
      content: note.content,
      category: note.category,
      likesCount: note.likesCount ?? 0,
    }))

  const topCommentedNotes = notes
    .filter((note) => (note.comments?.length ?? 0) > 0)
    .sort(
      (left, right) => (right.comments?.length ?? 0) - (left.comments?.length ?? 0),
    )
    .slice(0, 5)
    .map((note) => ({
      id: note.id,
      content: note.content,
      category: note.category,
      commentsCount: note.comments?.length ?? 0,
    }))

  const now = new Date()

  return {
    totalNotes,
    totalLikes: notes.reduce((sum, note) => sum + (note.likesCount ?? 0), 0),
    totalComments: notes.reduce((sum, note) => sum + (note.comments?.length ?? 0), 0),
    categoryCounts,
    suggestionTopicStats,
    mostDiscussedCategory,
    topLikedNotes,
    topCommentedNotes,
    recentTrend: {
      last7Days: getRecentCount(notes, 7, now),
      last30Days: getRecentCount(notes, 30, now),
    },
    keywordStats: getKeywordStats(notes),
  }
}

export const WRITING_TREND_INTERVAL = {
  DAY: 'day',
  WEEK: 'week',
} as const

export type WritingTrendInterval =
  (typeof WRITING_TREND_INTERVAL)[keyof typeof WRITING_TREND_INTERVAL]

export interface WritingTrendBucket {
  key: string
  axisLabel: string
  tooltipLabel: string
  count: number
}

export interface WritingTrend {
  interval: WritingTrendInterval
  buckets: WritingTrendBucket[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const DAILY_BUCKET_LIMIT = 31
const WEEK_DAYS = 7

function getStartOfDay(time: number) {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatMonthDay(time: number) {
  const date = new Date(time)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function formatAxisDay(time: number) {
  const date = new Date(time)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** 회차 시작부터 오늘(또는 회차 종료)까지 작성 수. 31일을 넘으면 주 단위로 묶는다 */
export function getWritingTrend(
  notes: BoardNote[],
  season: BoardSeason,
  now = Date.now(),
): WritingTrend {
  const createdTimes = notes.map((note) => (note.createdAt ? Date.parse(note.createdAt) : now))
  const startTime = season.startsAt ? Date.parse(season.startsAt) : Math.min(...createdTimes)
  // endsAt은 해당 시각을 포함하지 않으므로 1ms 앞을 마지막 날로 본다
  const endTime = season.endsAt ? Math.min(Date.parse(season.endsAt) - 1, now) : now

  if (!Number.isFinite(startTime) || endTime < startTime) {
    return { interval: WRITING_TREND_INTERVAL.DAY, buckets: [] }
  }

  const firstDay = getStartOfDay(startTime)
  const dayCount = Math.round((getStartOfDay(endTime) - firstDay) / DAY_MS) + 1
  const interval =
    dayCount > DAILY_BUCKET_LIMIT ? WRITING_TREND_INTERVAL.WEEK : WRITING_TREND_INTERVAL.DAY
  const bucketDays = interval === WRITING_TREND_INTERVAL.WEEK ? WEEK_DAYS : 1
  const bucketCount = Math.ceil(dayCount / bucketDays)

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = firstDay + index * bucketDays * DAY_MS
    const bucketEnd = Math.min(bucketStart + (bucketDays - 1) * DAY_MS, getStartOfDay(endTime))

    return {
      key: new Date(bucketStart).toISOString(),
      axisLabel: formatAxisDay(bucketStart),
      tooltipLabel:
        interval === WRITING_TREND_INTERVAL.DAY
          ? formatMonthDay(bucketStart)
          : `${formatMonthDay(bucketStart)} ~ ${formatMonthDay(bucketEnd)}`,
      count: 0,
    }
  })

  createdTimes.forEach((time) => {
    const dayIndex = Math.round((getStartOfDay(time) - firstDay) / DAY_MS)
    const bucketIndex = Math.min(Math.max(Math.floor(dayIndex / bucketDays), 0), bucketCount - 1)

    buckets[bucketIndex].count += 1
  })

  return { interval, buckets }
}
