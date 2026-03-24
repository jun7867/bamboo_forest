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
    description: string
    accent: string
    softAccent: string
  }
> = {
  praise: {
    label: '칭찬하기',
    description: '고마웠던 동료와 좋았던 순간을 남기는 구역',
    accent: '#F4B65D',
    softAccent: 'rgba(244, 182, 93, 0.18)',
  },
  suggestion: {
    label: '건의하기',
    description: '업무 방식과 협업 문화를 더 좋게 만드는 제안 구역',
    accent: '#79AF63',
    softAccent: 'rgba(121, 175, 99, 0.2)',
  },
  freeTalk: {
    label: '하고싶은말',
    description: '익명으로 툭 던지고 싶은 생각을 적는 구역',
    accent: '#65A9C6',
    softAccent: 'rgba(101, 169, 198, 0.18)',
  },
  question: {
    label: '질문하기',
    description: '궁금하지만 쉽게 꺼내지 못한 질문을 남기는 구역',
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

export const INITIAL_BOARD_NOTES: BoardNote[] = [
  {
    id: 'note-1',
    category: 'praise',
    content: '온보딩 문서 정리 덕분에 이번 주 적응이 훨씬 쉬웠어요.',
    color: 'butter',
    comments: [
      {
        id: 'comment-1',
        noteId: 'note-1',
        author: '익명 204',
        content: '저도 같은 도움 받았어요. 진짜 큰 도움 됐어요.',
        createdAt: '2026-03-20T09:10:00.000Z',
      },
    ],
    password: '1111',
    position: { x: 20, y: 28 },
    rotation: -2.4,
  },
  {
    id: 'note-2',
    category: 'suggestion',
    content: '주간 회의 안건을 하루 전에 공유하면 더 준비가 쉬울 것 같아요.',
    color: 'sky',
    password: '2222',
    position: { x: 188, y: 30 },
    rotation: 1.8,
  },
  {
    id: 'note-3',
    category: 'freeTalk',
    content: '점심 번개나 잡담용 채널이 하나 더 있으면 재밌을 것 같아요.',
    color: 'lavender',
    comments: [
      {
        id: 'comment-2',
        noteId: 'note-3',
        author: '익명 517',
        content: '좋아요. 랜덤 점심 신청처럼 가볍게 열어도 괜찮겠네요.',
        createdAt: '2026-03-21T04:35:00.000Z',
      },
    ],
    password: '3333',
    position: { x: 42, y: 112 },
    rotation: -1.6,
  },
  {
    id: 'note-4',
    category: 'question',
    content: '최근 공고 실험 결과는 어디에서 한 번에 보면 좋을까요?',
    color: 'lavender',
    password: '4444',
    position: { x: 212, y: 118 },
    rotation: 1.4,
  },
]

export function cloneInitialBoardNotes() {
  return INITIAL_BOARD_NOTES.map((note) => ({
    ...note,
    comments: note.comments?.map((comment) => ({ ...comment })),
    position: { ...note.position },
  }))
}
