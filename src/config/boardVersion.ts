export const CURRENT_BOARD_VERSION = 'v3'

export const V2_CUTOFF_DATE = new Date('2026-05-04T00:00:00.000Z')
export const V3_CUTOFF_DATE = new Date('2026-06-23T00:00:00.000Z')

export const ARCHIVE_BOARDS = [
  {
    id: 'v1',
    label: '1기 채용혁신 대나무숲',
    period: '~ 2026.05',
    path: '/board/v1',
  },
  {
    id: 'v2',
    label: '2기 채용혁신 대나무숲',
    period: '2026.05 ~ 2026.06',
    path: '/board/v2',
  },
] as const
