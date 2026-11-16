export type CoffeeRoundStatus = 'open' | 'closed'

export interface CoffeeRound {
  id: string
  title: string
  status: CoffeeRoundStatus
  // 쏘는 사람
  firstPickEntryId: string | null
  // 가져오는 사람
  secondPickEntryId: string | null
  // 판을 열 때 정해진 1인당 금액(원)
  unitAmount: number
  // 마감 시점 스냅샷. 열린 판은 null
  participantCount: number | null
  payAmount: number | null
  createdAt: string
  closedAt: string | null
}

export interface CoffeeEntry {
  id: string
  roundId: string
  // 기기 비밀값의 sha256. 공개 조회되므로 원문 비밀값은 여기에 담지 않는다
  clientKey: string
  nickname: string
  menu: string
  createdAt: string
  updatedAt: string
}

export interface CoffeeSnapshot {
  rounds: CoffeeRound[]
  entries: CoffeeEntry[]
}

export interface CreateCoffeeRoundInput {
  title: string
  hostSecret: string
}

export interface UpsertCoffeeEntryInput {
  roundId: string
  clientSecret: string
  nickname: string
  menu: string
}

export interface WithdrawCoffeeEntryInput {
  roundId: string
  clientSecret: string
}

export interface CloseCoffeeRoundInput {
  roundId: string
  // 방장 기기 비밀값 또는 관리자 비밀번호
  secret: string
}

export interface CoffeeOrderLine {
  menu: string
  count: number
}

// 마감 시각(closedAt) 기준 [from, to). null이면 그쪽 끝을 열어 둔다
export interface CoffeeHistoryRange {
  from: string | null
  to: string | null
}

export type CoffeeHistoryPeriod = { kind: 'month'; year: number; month: number } | { kind: 'all' }

export interface CoffeeRankingRow {
  // 기기 비밀값 해시. 같은 사람이 다른 기기에서 내면 다른 줄로 집계된다
  clientKey: string
  // 그 사람이 가장 최근에 쓴 닉네임
  nickname: string
  paidAmount: number
  paidCount: number
  fetchCount: number
  joinCount: number
}

export interface CoffeeHistory {
  ranking: CoffeeRankingRow[]
}
