// 인형뽑기(크레인) 연출용 배치·경로 계산.
// 당첨자는 서버(close_coffee_round)가 이미 정했고, 여기서는 집게가 그 사람 컵을 집어 출구로 떨어뜨리는 경로를 그릴 뿐이다.
// 판 id로 시드를 만들어 같은 판이면 누구 화면에서든 같은 배치·같은 연출이 재생된다.
// 좌표는 케이스 가로를 100으로 둔 단위다. 화면에서는 1단위 = 케이스 폭의 1%(cqw)로 그린다

const CUP_COLORS = [
  '#F2994A',
  '#56A3D9',
  '#79AF63',
  '#E46A7E',
  '#9B7BE0',
  '#E0B33A',
  '#3FB8AF',
  '#D9825B',
  '#6C8CD5',
  '#9DB43A',
  '#E58FC6',
  '#8A9A5B',
]

export const CRANE_WIDTH = 100
const RAIL_Y = 4
const CLAW_UP_Y = 10
const PILE_LEFT = 3
const PILE_RIGHT = 77
const CHUTE_LEFT = 80
const CHUTE_RIGHT = 97
const MAX_CUP_WIDTH = 15
// 컵 높이/폭. 테이크아웃 컵 비율
const CUP_ASPECT = 1.3
// 뒷줄 컵이 앞줄에 가려지는 정도. 이름 띠(컵 위쪽)는 가려지지 않게 높이의 60% 남짓만 내린다
const ROW_STEP_RATIO = 0.6
// 집게가 잡을 때 컵 윗면이 집게 축보다 이만큼(컵 높이 대비) 아래에 온다
const HOLD_OFFSET_RATIO = 0.12
// 집게가 움직이는 시간(출구에 떨어질 때까지)을 이 범위로 맞추고, 그 뒤 이름 공개를 붙인다
const MOTION_MIN_MS = 3600
const MOTION_MAX_MS = 6000
const REVEAL_MS = 1000
// 두 번째 판에서 앞서 뽑힌 컵이 케이스로 돌아오는 시간
const RETURN_MS = 750
const SLIP_CHANCE = 0.35

export type CraneEase = 'linear' | 'in' | 'out' | 'inOut'

export type CranePhase =
  | 'ready'
  | 'roam'
  | 'aim'
  | 'down'
  | 'grab'
  | 'lift'
  | 'carry'
  | 'slip'
  | 'retry'
  | 'drop'
  | 'reveal'

export interface CraneItem {
  id: string
  name: string
}

export interface CupPose {
  // 컵 가로 중심
  x: number
  // 컵 윗면
  y: number
  rotate: number
}

export interface CraneCup extends CraneItem {
  color: string
  // 0이 맨 뒷줄. 앞줄일수록 위에 그린다
  row: number
  slot: CupPose
}

export interface CraneLayout {
  width: number
  height: number
  cupWidth: number
  cupHeight: number
  railY: number
  clawUpY: number
  holdOffset: number
  pileLeft: number
  pileRight: number
  floorY: number
  // 놓친 컵이 떨어져 얹히는 높이(컵 윗면)
  landingY: number
  chute: { left: number; right: number; topY: number; centerX: number }
  cups: CraneCup[]
}

interface CraneState {
  clawX: number
  // 집게 손가락이 달린 축의 높이
  clawY: number
  // 0 = 활짝 벌림, 1 = 오므림
  grip: number
  cupX: number
  cupY: number
  cupRotate: number
  // 목표 컵이 제자리를 떠나 다른 컵 위에 그려야 하는지
  cupOnTop: boolean
}

export interface CraneKeyframe extends CraneState {
  at: number
  // 이전 키프레임에서 여기까지 오는 구간의 움직임 곡선과 단계
  ease: CraneEase
  phase: CranePhase
}

export interface CranePlan {
  layout: CraneLayout
  targetId: string
  // 앞 판에서 뽑혀 케이스로 돌아오는 컵. 없으면 null
  returningId: string | null
  returnMs: number
  keyframes: CraneKeyframe[]
  // 집게를 오므려 컵을 잡은 순간들. 놓쳤다가 다시 잡으면 두 번이다
  grabTimes: number[]
  // 컵이 출구로 다 떨어진 시각. 이때부터 이름을 공개한다
  revealAt: number
  duration: number
}

export interface CraneFrame {
  clawX: number
  clawY: number
  grip: number
  phase: CranePhase
  target: CupPose & { onTop: boolean }
  // 돌아오는 중인 컵의 위치. 다 돌아왔거나 없으면 null
  returning: CupPose | null
  isRevealing: boolean
  isFinished: boolean
}

// 문자열 시드 → 32비트 정수(xmur3) → 균등 난수(mulberry32)
function createSeededRandom(seedText: string) {
  let hash = 1779033703 ^ seedText.length

  for (let index = 0; index < seedText.length; index += 1) {
    hash = Math.imul(hash ^ seedText.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  let state = hash >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio
}

export function getCupColor(index: number) {
  if (index < CUP_COLORS.length) {
    return CUP_COLORS[index]
  }

  // 참가자가 많으면 황금각으로 색상을 벌려 옆 컵과 겹치지 않게 한다
  return `hsl(${Math.round((index * 137.508) % 360)}, 58%, 54%)`
}

// 인원이 늘면 줄 수를 늘려 컵이 너무 작아지지 않게 한다(25명이면 6칸 × 5줄)
function getGrid(count: number) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.3)))
  const rows = Math.max(1, Math.ceil(count / columns))

  return { columns: Math.min(columns, count), rows }
}

interface BuildCraneLayoutInput {
  // 두 번의 집게가 같은 케이스를 쓰도록 판 id만 넣는다
  seed: string
  items: CraneItem[]
}

export function buildCraneLayout({ seed, items }: BuildCraneLayoutInput): CraneLayout {
  const random = createSeededRandom(`${seed}:layout`)
  const count = Math.max(items.length, 1)
  const { columns, rows } = getGrid(count)
  const pileWidth = PILE_RIGHT - PILE_LEFT
  // 줄마다 반 칸씩 어긋나게 쌓으니 반 칸 여유를 둔다
  const slotWidth = pileWidth / (columns + (rows > 1 ? 0.5 : 0))
  const cupWidth = Math.min(MAX_CUP_WIDTH, slotWidth * 0.92)
  const cupHeight = cupWidth * CUP_ASPECT
  const rowStep = cupHeight * ROW_STEP_RATIO
  const holdOffset = cupHeight * HOLD_OFFSET_RATIO
  // 들어 올린 컵이 쌓인 컵에 걸리지 않을 만큼 위쪽을 비운다
  const carryBottom = CLAW_UP_Y + holdOffset + cupHeight
  const pileTop = carryBottom + 4
  const floorY = pileTop + cupHeight + (rows - 1) * rowStep
  const height = Math.max(62, Math.ceil(floorY + 3))
  const chuteTopY = Math.max(carryBottom + 5, height * 0.55)

  // 앞줄부터 채워 뒷줄이 비어 보이게 한다
  const rowCounts = Array.from({ length: rows }, () => 0)
  for (let index = 0; index < count; index += 1) {
    rowCounts[rows - 1 - (index % rows)] += 1
  }

  const slots: { row: number; pose: CupPose }[] = []
  rowCounts.forEach((rowCount, row) => {
    const isShifted = (rows - 1 - row) % 2 === 1
    const rowWidth = rowCount * slotWidth + (isShifted ? slotWidth / 2 : 0)
    const startX = PILE_LEFT + (pileWidth - rowWidth) / 2 + (isShifted ? slotWidth / 2 : 0)
    const top = floorY - cupHeight - (rows - 1 - row) * rowStep

    for (let column = 0; column < rowCount; column += 1) {
      slots.push({
        row,
        pose: {
          x: startX + slotWidth * (column + 0.5) + (random() - 0.5) * slotWidth * 0.12,
          y: top + (random() - 0.5) * cupHeight * 0.05,
          rotate: (random() - 0.5) * 10,
        },
      })
    }
  })

  // 응답 순서대로 놓으면 먼저 낸 사람이 늘 같은 자리에 서서, 자리 배정도 시드로 섞는다
  const order = items.map((_, index) => index)
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[order[index], order[swapIndex]] = [order[swapIndex], order[index]]
  }

  const cups = items.map((item, itemIndex) => {
    const slot = slots[order[itemIndex]]
    return { ...item, color: getCupColor(itemIndex), row: slot.row, slot: slot.pose }
  })

  const backRowTop = floorY - cupHeight - (rows - 1) * rowStep

  return {
    width: CRANE_WIDTH,
    height,
    cupWidth,
    cupHeight,
    railY: RAIL_Y,
    clawUpY: CLAW_UP_Y,
    holdOffset,
    pileLeft: PILE_LEFT,
    pileRight: PILE_RIGHT,
    floorY,
    landingY: rows === 1 ? floorY - cupHeight : backRowTop - cupHeight * 0.3,
    chute: {
      left: CHUTE_LEFT,
      right: CHUTE_RIGHT,
      topY: chuteTopY,
      centerX: (CHUTE_LEFT + CHUTE_RIGHT) / 2,
    },
    cups,
  }
}

interface BuildCranePlanInput {
  seed: string
  layout: CraneLayout
  targetId: string
  returningId?: string | null
}

export function buildCranePlan({ seed, layout, targetId, returningId = null }: BuildCranePlanInput): CranePlan | null {
  const target = layout.cups.find((cup) => cup.id === targetId)

  if (!target) {
    return null
  }

  const returningCup = returningId ? layout.cups.find((cup) => cup.id === returningId) ?? null : null
  const random = createSeededRandom(seed)
  const between = (min: number, max: number) => min + random() * (max - min)
  const { cupWidth, holdOffset, clawUpY, chute } = layout
  const minX = layout.pileLeft + cupWidth / 2
  const maxX = layout.pileRight - cupWidth / 2
  const keyframes: CraneKeyframe[] = []
  let state: CraneState = {
    clawX: chute.centerX,
    clawY: clawUpY,
    grip: 0.4,
    cupX: target.slot.x,
    cupY: target.slot.y,
    cupRotate: target.slot.rotate,
    cupOnTop: false,
  }
  let at = 0
  const grabTimes: number[] = []

  keyframes.push({ ...state, at, ease: 'linear', phase: 'ready' })

  function step(duration: number, patch: Partial<CraneState>, phase: CranePhase, ease: CraneEase = 'inOut') {
    at += Math.round(duration)
    state = { ...state, ...patch }
    keyframes.push({ ...state, at, ease, phase })
  }

  // 컵을 쥐고 있으면 컵도 집게를 따라간다
  function carriedCup(clawX: number, clawY: number, rotate: number): Partial<CraneState> {
    return { cupX: clawX, cupY: clawY + holdOffset, cupRotate: rotate }
  }

  function moveClaw(x: number, phase: CranePhase, isCarrying = false) {
    const distance = Math.abs(x - state.clawX)
    const duration = clamp((distance / between(70, 100)) * 1000, 220, 800)
    const patch: Partial<CraneState> = { clawX: x }
    step(duration, isCarrying ? { ...patch, ...carriedCup(x, state.clawY, between(-6, 6)) } : patch, phase)
  }

  function pause(min: number, max: number, phase: CranePhase) {
    step(between(min, max), {}, phase, 'linear')
  }

  // 컵 위로 내려가 집고 다시 올라온다
  function grabAndLift(cupX: number, cupTop: number) {
    step(160, { grip: 0 }, 'down', 'out')
    step(between(420, 560), { clawY: cupTop - holdOffset }, 'down')
    step(240, { grip: 1 }, 'grab', 'out')
    grabTimes.push(at)
    step(between(420, 520), { cupOnTop: true, ...carriedCup(cupX, clawUpY, between(-4, 4)), clawY: clawUpY }, 'lift')
  }

  const willSlip = random() < SLIP_CHANCE

  pause(returningCup ? RETURN_MS + 150 : 200, (returningCup ? RETURN_MS : 0) + 340, 'ready')

  // 이리저리 헤매다가 목표를 한 번 지나쳤다 돌아온다
  const roamCount = willSlip ? Math.floor(random() * 2) : 1 + Math.floor(random() * 2)
  for (let index = 0; index < roamCount; index += 1) {
    moveClaw(between(minX, maxX), 'roam')
    pause(60, 180, 'roam')
  }

  const direction = target.slot.x >= state.clawX ? 1 : -1
  const overshootX = clamp(target.slot.x + direction * between(5, 12), minX - cupWidth * 0.4, layout.chute.right - 2)
  moveClaw(overshootX, 'roam')
  pause(100, 200, 'aim')
  moveClaw(target.slot.x - direction * between(1, 2.5), 'aim')
  moveClaw(target.slot.x, 'aim')
  // 목표 컵 위에서 멈칫한다
  pause(260, 480, 'aim')

  grabAndLift(target.slot.x, target.slot.y)

  if (willSlip) {
    const slipX = clamp(lerp(target.slot.x, chute.centerX, between(0.3, 0.65)), minX, maxX)
    moveClaw(slipX, 'carry', true)
    // 집게가 헐거워지며 컵이 흔들린다
    step(200, { grip: 0.55, cupRotate: between(8, 14) * (random() < 0.5 ? -1 : 1) }, 'slip', 'out')
    const landingX = clamp(slipX + between(-3, 3), minX, maxX)
    step(
      340,
      {
        grip: 0.2,
        cupX: landingX,
        cupY: layout.landingY,
        cupRotate: between(16, 30) * (random() < 0.5 ? -1 : 1),
      },
      'slip',
      'in',
    )
    pause(300, 420, 'slip')
    // 다시 집으러 온다. 한 번 더 망설인다
    const sway = between(3, 6) * (landingX > (minX + maxX) / 2 ? -1 : 1)
    moveClaw(landingX + sway, 'retry')
    moveClaw(landingX, 'retry')
    pause(120, 240, 'retry')
    grabAndLift(landingX, layout.landingY)
  }

  moveClaw(chute.centerX, 'carry', true)
  pause(120, 200, 'carry')
  step(160, { grip: 0 }, 'drop', 'out')
  // 출구 앞판 뒤로 떨어져 사라진다
  step(460, { cupY: layout.height + layout.cupHeight, cupRotate: state.cupRotate + between(-20, 20) }, 'drop', 'in')

  // 연출 길이를 범위 안으로 맞춘다. 돌아오는 컵 시간은 고정이라 그 뒤만 늘이고 줄인다
  const fixed = returningCup ? RETURN_MS : 0
  const scale = (clamp(at, MOTION_MIN_MS, MOTION_MAX_MS) - fixed) / (at - fixed)
  const scaled = keyframes.map((frame) => ({
    ...frame,
    at: frame.at <= fixed ? frame.at : Math.round(fixed + (frame.at - fixed) * scale),
  }))
  const scaledGrabTimes = grabTimes.map((time) => Math.round(fixed + (time - fixed) * scale))
  const revealAt = scaled[scaled.length - 1].at

  return {
    layout,
    targetId,
    returningId: returningCup?.id ?? null,
    returnMs: returningCup ? RETURN_MS : 0,
    keyframes: scaled,
    grabTimes: scaledGrabTimes,
    revealAt,
    duration: revealAt + REVEAL_MS,
  }
}

function applyEase(ease: CraneEase, ratio: number) {
  switch (ease) {
    case 'in':
      return ratio * ratio
    case 'out':
      return 1 - (1 - ratio) * (1 - ratio)
    case 'inOut':
      return ratio * ratio * (3 - 2 * ratio)
    default:
      return ratio
  }
}

// 위에서 떨어져 제자리에 살짝 튀며 앉는다
function getReturningPose(plan: CranePlan, slot: CupPose, time: number): CupPose | null {
  if (!plan.returningId || time >= plan.returnMs) {
    return null
  }

  const ratio = clamp(time / plan.returnMs, 0, 1)
  const fall = ratio < 0.75 ? applyEase('in', ratio / 0.75) : 1 - Math.sin(((ratio - 0.75) / 0.25) * Math.PI) * 0.08
  const startY = -plan.layout.cupHeight * 1.2

  return { x: slot.x, y: lerp(startY, slot.y, fall), rotate: slot.rotate + (1 - ratio) * 18 }
}

export function getCraneFrame(plan: CranePlan, time: number): CraneFrame {
  const { keyframes } = plan
  const last = keyframes[keyframes.length - 1]
  let current = last
  let ratio = 1
  let previous = last

  if (time <= keyframes[0].at) {
    previous = keyframes[0]
    current = keyframes[0]
    ratio = 1
  } else if (time < last.at) {
    const nextIndex = keyframes.findIndex((frame) => frame.at > time)
    previous = keyframes[nextIndex - 1]
    current = keyframes[nextIndex]
    ratio = applyEase(current.ease, (time - previous.at) / (current.at - previous.at))
  }

  const mix = (key: 'clawX' | 'clawY' | 'grip' | 'cupX' | 'cupY' | 'cupRotate') =>
    lerp(previous[key], current[key], ratio)
  const returningCup = plan.returningId ? plan.layout.cups.find((cup) => cup.id === plan.returningId) : undefined
  const isRevealing = time >= plan.revealAt

  return {
    clawX: mix('clawX'),
    clawY: mix('clawY'),
    grip: mix('grip'),
    phase: isRevealing ? 'reveal' : current.phase,
    target: {
      x: mix('cupX'),
      y: mix('cupY'),
      rotate: mix('cupRotate'),
      // 들어 올리기 시작하면 다른 컵 위로 그린다
      onTop: previous.cupOnTop || (current.cupOnTop && ratio > 0),
    },
    returning: returningCup ? getReturningPose(plan, returningCup.slot, time) : null,
    isRevealing,
    isFinished: time >= plan.duration,
  }
}
