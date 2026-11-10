import type { BoardPosition } from '../types/board'

// 포스트잇 좌표는 고정 크기 가상 캔버스 기준으로 저장하고, 화면 크기에 맞춰 비율로 그린다
export const VIRTUAL_CANVAS = {
  width: 920,
  height: 980,
} as const

export const NOTE_PADDING = 14

const SLOT_COLUMNS = 5
const SLOT_ROWS = 5
const SLOT_ORIGIN = { x: 22, y: 26 }
const SLOT_STEP = { x: 178, y: 188 }

const SLOTS: BoardPosition[] = Array.from({ length: SLOT_COLUMNS * SLOT_ROWS }, (_, index) => ({
  x: SLOT_ORIGIN.x + (index % SLOT_COLUMNS) * SLOT_STEP.x,
  y: SLOT_ORIGIN.y + Math.floor(index / SLOT_COLUMNS) * SLOT_STEP.y,
}))

function getDistanceToNearest(slot: BoardPosition, occupied: BoardPosition[]) {
  return occupied.reduce((nearest, position) => {
    const distance = Math.hypot(
      (position.x - slot.x) / VIRTUAL_CANVAS.width,
      (position.y - slot.y) / VIRTUAL_CANVAS.height,
    )

    return Math.min(nearest, distance)
  }, Number.POSITIVE_INFINITY)
}

// 이미 붙은 포스트잇들과 가장 멀리 떨어진 칸을 골라 새 포스트잇이 겹치지 않게 한다
export function getSuggestedNotePosition(occupied: BoardPosition[]): BoardPosition {
  let bestSlot = SLOTS[0]
  let bestDistance = -1

  SLOTS.forEach((slot) => {
    const distance = getDistanceToNearest(slot, occupied)

    if (distance > bestDistance) {
      bestSlot = slot
      bestDistance = distance
    }
  })

  return { ...bestSlot }
}
