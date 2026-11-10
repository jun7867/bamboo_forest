export interface BoardSeason {
  id: string
  label: string
  period: string
  startsAt?: string
  endsAt?: string
  // 타운홀 일시(ISO). 값이 있으면 헤더에 D-day가 표시된다
  townHallAt?: string
}

// 새 회차를 시작할 때는 직전 회차에 endsAt을 채우고 새 항목을 맨 뒤에 추가한다
export const BOARD_SEASONS: BoardSeason[] = [
  {
    id: 'v1',
    label: '1기 채용혁신 대나무숲',
    period: '~ 2026.05',
    endsAt: '2026-05-04T00:00:00.000Z',
  },
  {
    id: 'v2',
    label: '2기 채용혁신 대나무숲',
    period: '2026.05 ~ 2026.06',
    startsAt: '2026-05-04T00:00:00.000Z',
    endsAt: '2026-06-23T00:00:00.000Z',
  },
  {
    id: 'v3',
    label: '3기 채용혁신 대나무숲',
    period: '2026.06 ~ 2026.10',
    startsAt: '2026-06-23T00:00:00.000Z',
    endsAt: '2026-10-15T13:00:00+09:00',
  },
  {
    id: 'v4',
    label: '뉴 채용혁신개발팀',
    period: '2026.10 ~ 2026.11',
    startsAt: '2026-10-15T13:00:00+09:00',
    endsAt: '2026-11-09T00:00:00+09:00',
  },
  {
    id: 'v5',
    label: '5기 채용혁신개발팀 대나무숲',
    period: '2026.11 ~',
    startsAt: '2026-11-09T00:00:00+09:00',
  },
]

export const CURRENT_SEASON = BOARD_SEASONS[BOARD_SEASONS.length - 1]

export const ARCHIVE_SEASONS = BOARD_SEASONS.slice(0, -1)

export function findSeason(seasonId: string) {
  return BOARD_SEASONS.find((season) => season.id === seasonId) ?? null
}

export function getSeasonPath(season: BoardSeason) {
  return season.id === CURRENT_SEASON.id ? '/board' : `/board/${season.id}`
}

export function isInSeason(createdAt: string | undefined, season: BoardSeason) {
  // 아직 서버 시간이 없는 포스트잇은 방금 쓴 글로 보고 현재 회차에 넣는다
  const time = createdAt ? Date.parse(createdAt) : Number.POSITIVE_INFINITY

  if (season.startsAt && time < Date.parse(season.startsAt)) {
    return false
  }

  if (season.endsAt && time >= Date.parse(season.endsAt)) {
    return false
  }

  return true
}

export function isInCurrentSeason(createdAt: string | undefined) {
  return isInSeason(createdAt, CURRENT_SEASON)
}
