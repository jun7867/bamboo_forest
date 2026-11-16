import type { CoffeeEntry, CoffeeOrderLine } from '../types/coffee'

export const COFFEE_NICKNAME_MAX_LENGTH = 20
export const COFFEE_MENU_MAX_LENGTH = 40
export const COFFEE_TITLE_MAX_LENGTH = 40

// "아이스  아메리카노 "처럼 공백만 다른 메뉴를 한 줄로 묶는다
export function normalizeCoffeeMenu(menu: string) {
  return menu.trim().replace(/\s+/g, ' ')
}

export function summarizeCoffeeOrders(entries: CoffeeEntry[]): CoffeeOrderLine[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    const menu = normalizeCoffeeMenu(entry.menu)

    if (menu) {
      counts.set(menu, (counts.get(menu) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([menu, count]) => ({ menu, count })).sort(
    (left, right) => right.count - left.count || left.menu.localeCompare(right.menu, 'ko'),
  )
}

// 먼저 참가한 순서로 보여준다
export function sortCoffeeEntries(entries: CoffeeEntry[]) {
  return [...entries].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
}
