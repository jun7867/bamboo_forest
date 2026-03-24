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
  '조금',
  '너무',
  '같아요',
  '있으면',
  '있어요',
  '합니다',
  '하면',
  '해서',
  '하는',
  '이런',
  '저런',
  '대한',
  '관련',
  '생각',
  '부분',
  '하나',
  '더',
  '것',
  '수',
  '좀',
  '을',
  '를',
  '이',
  '가',
  '은',
  '는',
  '에',
  '의',
  '도',
  '로',
])

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
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && !STOPWORDS.has(word))

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

  const topLikedNotes = [...notes]
    .sort((left, right) => (right.likesCount ?? 0) - (left.likesCount ?? 0))
    .slice(0, 5)
    .map((note) => ({
      id: note.id,
      content: note.content,
      category: note.category,
      likesCount: note.likesCount ?? 0,
    }))

  const topCommentedNotes = [...notes]
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
