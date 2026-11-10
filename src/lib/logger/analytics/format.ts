export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', { hour12: false })
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', { hour12: false })
}

export function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const totalSeconds = Math.round(ms / 1000)

  if (totalSeconds < 60) {
    return `${totalSeconds}초`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return seconds ? `${minutes}분 ${seconds}초` : `${minutes}분`
}

export function shortId(value: string) {
  return value.slice(0, 8)
}
