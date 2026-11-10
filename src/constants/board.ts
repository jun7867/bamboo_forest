import { CURRENT_SEASON } from '../config/boardVersion'
import type { BoardCategory, BoardNote, PostItColor } from '../types/board'

export const BOARD_CATEGORY_ORDER: BoardCategory[] = [
  'praise',
  'suggestion',
  'freeTalk',
  'question',
]

export const BOARD_CATEGORY_META: Record<
  BoardCategory,
  {
    label: string
    emoji: string
    description: string
    prompt: string
    accent: string
    softAccent: string
  }
> = {
  praise: {
    label: '칭찬하기',
    emoji: '👏',
    description: '고마웠던 동료와 좋았던 순간을 남기는 구역',
    prompt: '고마웠던 동료나 좋았던 순간을 떠올려 보세요.',
    accent: '#F4B65D',
    softAccent: 'rgba(244, 182, 93, 0.18)',
  },
  suggestion: {
    label: '건의하기',
    emoji: '💡',
    description: '업무 방식과 협업 문화를 더 좋게 만드는 제안 구역',
    prompt: '이렇게 바뀌면 더 좋겠다 싶은 점을 적어주세요.',
    accent: '#79AF63',
    softAccent: 'rgba(121, 175, 99, 0.2)',
  },
  freeTalk: {
    label: '하고싶은말',
    emoji: '💬',
    description: '익명으로 툭 던지고 싶은 생각을 적는 구역',
    prompt: '무슨 말이든 괜찮아요. 편하게 털어놓으세요.',
    accent: '#65A9C6',
    softAccent: 'rgba(101, 169, 198, 0.18)',
  },
  question: {
    label: '질문하기',
    emoji: '🙋',
    description: '궁금하지만 쉽게 꺼내지 못한 질문을 남기는 구역',
    prompt: '궁금했지만 묻기 어려웠던 것을 물어보세요.',
    accent: '#C88AC8',
    softAccent: 'rgba(200, 138, 200, 0.18)',
  },
}

export const POST_IT_COLOR_META: Record<
  PostItColor,
  {
    label: string
    background: string
    border: string
    tape: string
    shadow: string
    text: string
  }
> = {
  butter: {
    label: '버터 옐로우',
    background: '#FFF4A8',
    border: '#E6D66A',
    tape: 'rgba(255, 255, 255, 0.72)',
    shadow: '0 16px 26px rgba(204, 179, 76, 0.22)',
    text: '#555039',
  },
  sky: {
    label: '스카이 블루',
    background: '#91D0FF',
    border: '#6BAEE1',
    tape: 'rgba(255, 255, 255, 0.68)',
    shadow: '0 16px 26px rgba(74, 138, 187, 0.2)',
    text: '#31516B',
  },
  mint: {
    label: '민트',
    background: '#B9F0E1',
    border: '#8DD2C0',
    tape: 'rgba(255, 255, 255, 0.7)',
    shadow: '0 16px 26px rgba(92, 160, 143, 0.18)',
    text: '#35564C',
  },
  lavender: {
    label: '라벤더',
    background: '#D79BFF',
    border: '#BC7BE7',
    tape: 'rgba(255, 255, 255, 0.68)',
    shadow: '0 16px 26px rgba(154, 101, 191, 0.2)',
    text: '#593D69',
  },
  blush: {
    label: '블러시',
    background: '#FFC2D4',
    border: '#E79FB5',
    tape: 'rgba(255, 255, 255, 0.72)',
    shadow: '0 16px 26px rgba(193, 116, 141, 0.19)',
    text: '#69424D',
  },
  peach: {
    label: '피치',
    background: '#FFD1A3',
    border: '#E0AA72',
    tape: 'rgba(255, 255, 255, 0.72)',
    shadow: '0 16px 26px rgba(193, 134, 74, 0.18)',
    text: '#6A4C34',
  },
}

export const POST_IT_COLOR_ORDER: PostItColor[] = [
  'butter',
  'sky',
  'mint',
  'lavender',
  'blush',
  'peach',
]

export const BOARD_SORT_OPTION = {
  MANUAL: 'manual',
  LIKES: 'likes',
  LATEST: 'latest',
  COMMENTS: 'comments',
} as const

export type BoardSortOption = (typeof BOARD_SORT_OPTION)[keyof typeof BOARD_SORT_OPTION]

export const BOARD_SORT_OPTION_LABEL: Record<BoardSortOption, string> = {
  manual: '기본 순서',
  likes: '공감순',
  latest: '최신순',
  comments: '댓글순',
}

export const MAX_NOTE_LENGTH = 1000
export const MAX_COMMENT_LENGTH = 240
export const MAX_AUTHOR_LENGTH = 40
export const MAX_PASSWORD_LENGTH = 64

const HOUR_MS = 60 * 60 * 1000
const DEMO_WINDOW_HOURS = 72

// 현재 회차 데모 글은 회차 시작 이후로 몰아 넣어야, 회차를 막 바꿨을 때도 데모 보드가 비지 않는다
function getDemoCreatedAt(hoursAgo: number, now: number) {
  const seasonStart = CURRENT_SEASON.startsAt
    ? Date.parse(CURRENT_SEASON.startsAt)
    : Number.NEGATIVE_INFINITY
  const windowMs = Math.max(0, Math.min(DEMO_WINDOW_HOURS * HOUR_MS, now - seasonStart))

  return new Date(now - (hoursAgo / DEMO_WINDOW_HOURS) * windowMs).toISOString()
}

const DEMO_NOTE_SEEDS: Array<
  Pick<BoardNote, 'id' | 'category' | 'content' | 'color' | 'position' | 'rotation'> & {
    // 지난 회차 아카이브 예시는 고정 날짜, 현재 회차는 지금 기준 상대 시간으로 만든다
    createdAt?: string
    hoursAgo?: number
    likesCount: number
    isPinned?: boolean
    sortRank: number
    comments?: Array<{ id: string; content: string; hoursAgo: number }>
  }
> = [
  {
    id: 'note-1',
    category: 'praise',
    content: '온보딩 문서 정리 덕분에 이번 주 적응이 훨씬 쉬웠어요. 정리해 주신 분께 감사해요!',
    color: 'butter',
    position: { x: 22, y: 26 },
    rotation: -2.4,
    hoursAgo: 70,
    likesCount: 5,
    sortRank: 1024,
    comments: [{ id: 'comment-1', content: '저도 같은 도움 받았어요. 진짜 큰 도움 됐어요.', hoursAgo: 66 }],
  },
  {
    id: 'note-2',
    category: 'praise',
    content: '지난 배포 때 늦게까지 같이 남아 준 동료들 정말 고마워요 🙏',
    color: 'blush',
    position: { x: 734, y: 778 },
    rotation: 1.6,
    hoursAgo: 20,
    likesCount: 8,
    sortRank: 2048,
  },
  {
    id: 'note-3',
    category: 'suggestion',
    content: '회의 없는 수요일 오후를 시도해 보면 어떨까요? 집중할 시간이 필요해요.',
    color: 'sky',
    position: { x: 22, y: 26 },
    rotation: 1.8,
    hoursAgo: 52,
    likesCount: 9,
    isPinned: true,
    sortRank: 1024,
    comments: [
      { id: 'comment-2', content: '완전 동의해요. 오후 통째로 비면 좋겠어요.', hoursAgo: 50 },
      { id: 'comment-3', content: '급한 건은 메신저로 처리하면 될 것 같아요.', hoursAgo: 30 },
    ],
  },
  {
    id: 'note-4',
    category: 'suggestion',
    content: '주간 회의 안건을 하루 전에 공유하면 준비가 훨씬 쉬울 것 같아요.',
    color: 'mint',
    position: { x: 734, y: 778 },
    rotation: -1.2,
    hoursAgo: 44,
    likesCount: 6,
    sortRank: 1024,
  },
  {
    id: 'note-5',
    category: 'suggestion',
    content: '코드 리뷰 기준을 문서로 정리해 두면 리뷰 시간이 줄어들 것 같아요.',
    color: 'peach',
    position: { x: 734, y: 26 },
    rotation: 2.4,
    hoursAgo: 6,
    likesCount: 4,
    sortRank: 2048,
  },
  {
    id: 'note-6',
    category: 'freeTalk',
    content: '점심 번개나 잡담용 채널이 하나 더 있으면 재밌을 것 같아요.',
    color: 'lavender',
    position: { x: 22, y: 26 },
    rotation: -1.6,
    hoursAgo: 60,
    likesCount: 2,
    sortRank: 1024,
    comments: [{ id: 'comment-4', content: '좋아요. 랜덤 점심 신청처럼 가볍게 열어도 괜찮겠네요.', hoursAgo: 58 }],
  },
  {
    id: 'note-7',
    category: 'freeTalk',
    content: '요즘 다들 바빠 보여서 조금 걱정돼요. 무리하지 말고 쉬엄쉬엄 해요!',
    color: 'peach',
    position: { x: 734, y: 778 },
    rotation: 1.1,
    hoursAgo: 3,
    likesCount: 3,
    sortRank: 2048,
  },
  {
    id: 'note-8',
    category: 'question',
    content: '하반기 팀 목표와 우선순위는 어떻게 정해지는지 궁금해요.',
    color: 'butter',
    position: { x: 22, y: 26 },
    rotation: 1.4,
    hoursAgo: 28,
    likesCount: 7,
    sortRank: 1024,
    comments: [{ id: 'comment-5', content: '저도 궁금했어요. 타운홀에서 꼭 듣고 싶어요.', hoursAgo: 25 }],
  },
  {
    id: 'note-9',
    category: 'question',
    content: '최근 공고 실험 결과는 어디에서 한 번에 보면 좋을까요?',
    color: 'lavender',
    position: { x: 734, y: 778 },
    rotation: -0.9,
    hoursAgo: 12,
    likesCount: 1,
    sortRank: 2048,
  },
  {
    id: 'note-archive-1',
    category: 'freeTalk',
    content: '첫 대나무숲 오픈 축하해요! 앞으로 자주 들를게요.',
    color: 'mint',
    position: { x: 22, y: 26 },
    rotation: -1.4,
    createdAt: '2026-04-10T03:00:00.000Z',
    likesCount: 4,
    sortRank: 1024,
  },
  {
    id: 'note-archive-3',
    category: 'question',
    content: '지난 타운홀에서 나온 건의는 지금 어떻게 반영되고 있나요?',
    color: 'sky',
    position: { x: 22, y: 26 },
    rotation: -0.8,
    createdAt: '2026-08-20T03:00:00.000Z',
    likesCount: 5,
    sortRank: 1024,
  },
  {
    id: 'note-archive-2',
    category: 'praise',
    content: '2기 회고 때 나온 아이디어가 바로 반영돼서 좋았어요.',
    color: 'butter',
    position: { x: 22, y: 26 },
    rotation: 1.2,
    createdAt: '2026-06-01T03:00:00.000Z',
    likesCount: 6,
    sortRank: 1024,
    comments: [{ id: 'comment-archive-1', content: '맞아요, 실행이 빨라서 신기했어요.', hoursAgo: 0 }],
  },
]

export function cloneInitialBoardNotes(): BoardNote[] {
  const now = Date.now()

  return DEMO_NOTE_SEEDS.map((seed, index) => {
    const createdAt = seed.createdAt ?? getDemoCreatedAt(seed.hoursAgo ?? 0, now)

    return {
      id: seed.id,
      category: seed.category,
      author: '익명',
      content: seed.content,
      color: seed.color,
      position: { ...seed.position },
      rotation: seed.rotation,
      isPinned: seed.isPinned ?? false,
      sortRank: seed.sortRank,
      likesCount: seed.likesCount,
      isLiked: false,
      comments: (seed.comments ?? []).map((comment) => ({
        id: comment.id,
        noteId: seed.id,
        author: '익명',
        content: comment.content,
        createdAt: seed.createdAt ?? getDemoCreatedAt(comment.hoursAgo, now),
      })),
      password: `${index + 1}`.repeat(4),
      createdAt,
      updatedAt: createdAt,
    }
  })
}
