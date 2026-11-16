import type { CoffeeHistoryPeriod, CoffeeHistoryRange } from '../types/coffee'

// 팀이 한국에 있어서 "이번 달"은 기기 시간대와 관계없이 KST 달력 월로 자른다. KST는 서머타임이 없다
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const wonFormatter = new Intl.NumberFormat('ko-KR')

export function formatWon(amount: number) {
  return `${wonFormatter.format(amount)}원`
}

export function getCurrentKstMonth(now = Date.now()): CoffeeHistoryPeriod {
  const kst = new Date(now + KST_OFFSET_MS)
  return { kind: 'month', year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

// KST 기준 그 달 1일 0시의 UTC 시각
export function getKstMonthStart(year: number, month: number) {
  return Date.UTC(year, month - 1, 1) - KST_OFFSET_MS
}

export function getHistoryRange(period: CoffeeHistoryPeriod): CoffeeHistoryRange {
  if (period.kind === 'all') {
    return { from: null, to: null }
  }

  return {
    from: new Date(getKstMonthStart(period.year, period.month)).toISOString(),
    // Date.UTC가 13월을 다음 해 1월로 넘겨 준다
    to: new Date(getKstMonthStart(period.year, period.month + 1)).toISOString(),
  }
}

export function shiftKstMonth(period: Extract<CoffeeHistoryPeriod, { kind: 'month' }>, delta: number) {
  const index = period.year * 12 + (period.month - 1) + delta
  return { kind: 'month' as const, year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function getHistoryPeriodKey(period: CoffeeHistoryPeriod) {
  return period.kind === 'all' ? 'all' : `${period.year}-${period.month}`
}

export function formatHistoryPeriod(period: CoffeeHistoryPeriod) {
  return period.kind === 'all' ? '전체' : `${period.year}년 ${period.month}월`
}
