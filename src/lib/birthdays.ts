export interface Birthday {
  month: number
  day: number
  name: string
}

export const BIRTHDAYS: Birthday[] = [
  { month: 3, day: 24, name: '독고현' },
  { month: 5, day: 6, name: '이상민' },
  { month: 5, day: 7, name: '박우주' },
  { month: 5, day: 7, name: '이승윤' },
  { month: 5, day: 24, name: '정선웅' },
  { month: 5, day: 28, name: '안가온' },
  { month: 6, day: 21, name: '조준식' },
  { month: 6, day: 28, name: '김민재' },
  { month: 6, day: 28, name: '윤동우' },
  { month: 7, day: 12, name: '장대성' },
  { month: 7, day: 28, name: '이덕현' },
  { month: 8, day: 1, name: '이제홍' },
  { month: 8, day: 10, name: '김종완' },
  { month: 8, day: 16, name: '이선영' },
  { month: 8, day: 24, name: '정승욱' },
  { month: 10, day: 16, name: '정종욱' },
  { month: 10, day: 23, name: '권구상' },
  { month: 11, day: 1, name: '천동영' },
  { month: 11, day: 22, name: '계해범' },
  { month: 12, day: 7, name: '함인규' },
  { month: 12, day: 13, name: '남준영' },
  { month: 12, day: 17, name: '유병재' },
  { month: 12, day: 23, name: '권구선' },
  { month: 12, day: 29, name: '김상동' },
]

export interface NearestBirthday {
  month: number
  day: number
  names: string[]
  daysUntil: number
}

const MS_PER_DAY = 86_400_000

// 오늘 기준 가장 가까운(오늘 포함) 생일을 계산한다. 같은 날짜에 여러 명이면 모두 묶는다.
export function getNearestBirthday(today: Date = new Date()): NearestBirthday | null {
  if (BIRTHDAYS.length === 0) return null

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let best: NearestBirthday | null = null

  for (const { month, day, name } of BIRTHDAYS) {
    let target = new Date(base.getFullYear(), month - 1, day)
    if (target.getTime() < base.getTime()) {
      target = new Date(base.getFullYear() + 1, month - 1, day)
    }
    const daysUntil = Math.round((target.getTime() - base.getTime()) / MS_PER_DAY)

    if (!best || daysUntil < best.daysUntil) {
      best = { month, day, names: [name], daysUntil }
    } else if (daysUntil === best.daysUntil) {
      best.names.push(name)
    }
  }

  return best
}

export function formatBirthdayDate(month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${mm}월 ${dd}일`
}
