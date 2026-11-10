const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

const relativeTimeFormatter = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })
const shortDateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' })
const fullDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatRelativeTime(value: string | undefined, now = Date.now()) {
  if (!value) {
    return '방금 전'
  }

  const elapsed = now - Date.parse(value)

  if (Number.isNaN(elapsed) || elapsed < MINUTE_MS) {
    return '방금 전'
  }

  if (elapsed < HOUR_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsed / MINUTE_MS), 'minute')
  }

  if (elapsed < DAY_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsed / HOUR_MS), 'hour')
  }

  if (elapsed < 7 * DAY_MS) {
    return relativeTimeFormatter.format(-Math.floor(elapsed / DAY_MS), 'day')
  }

  return shortDateFormatter.format(new Date(value))
}

export function formatFullDateTime(value: string | undefined) {
  return value ? fullDateTimeFormatter.format(new Date(value)) : ''
}

export function getDaysUntil(value: string, now = Date.now()) {
  const today = new Date(now)
  const target = new Date(value)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()

  return Math.round((startOfTarget - startOfToday) / DAY_MS)
}
