import type { BoardCategory } from '../types/board'

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
