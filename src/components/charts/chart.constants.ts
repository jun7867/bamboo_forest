// Figma "대시보드 위젯 기본 디자인" 공통 규칙의 30색 팔레트와 중립 토큰
export const CHART_PALETTE = [
  '#6BB2F9',
  '#6AA6F3',
  '#6A99ED',
  '#6B8DE6',
  '#788BEC',
  '#8588F1',
  '#9285F4',
  '#B385EB',
  '#CD88DC',
  '#E28DCC',
  '#EF8FBE',
  '#F893AE',
  '#FF989F',
  '#FE9E93',
  '#FEA386',
  '#FFA777',
  '#FDAC6E',
  '#FAB166',
  '#F5B760',
  '#E4C059',
  '#CFC95E',
  '#B5D26E',
  '#A3D175',
  '#90D07D',
  '#7DCE85',
  '#6BD1A4',
  '#67D0BD',
  '#71CECF',
  '#60C8DF',
  '#5DBEED',
] as const

export const CHART_NEUTRAL = {
  grid: '#EEF1F5',
  axisLabel: '#676F75',
  hoverGuide: '#D6D6D6',
  hoverBackground: '#F3F6FA',
  compare: '#E0E6EC',
  baseline: '#C6CACE',
  track: '#F5F7FA',
  drop: '#FDECEE',
  dropStrong: '#F04452',
  chip: '#EEF6FE',
} as const

export const CHART_DIMMED_OPACITY = 0.35

/** Y축 0부터, 1·2·5 × 10ⁿ 단위의 깔끔한 눈금. 최대값을 덮는 데까지만 만든다 */
export function getNiceTicks(maxValue: number, targetIntervals: number) {
  const safeMax = Math.max(maxValue, 1)
  const rawStep = safeMax / targetIntervals
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const niceStep =
    [1, 2, 5, 10].map((unit) => unit * magnitude).find((candidate) => candidate >= rawStep) ??
    10 * magnitude
  const step = Math.max(1, niceStep)
  const intervals = Math.max(1, Math.ceil(safeMax / step))

  return Array.from({ length: intervals + 1 }, (_, index) => index * step)
}

export function formatPercent(ratio: number) {
  return `${Math.round(ratio * 1000) / 10}%`
}
