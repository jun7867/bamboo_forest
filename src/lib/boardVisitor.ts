const STORAGE_KEY = 'bamboo-board-visitor-id'

export function getBoardVisitorId() {
  if (typeof window === 'undefined') {
    return 'server-visitor'
  }

  const savedId = window.localStorage.getItem(STORAGE_KEY)

  if (savedId) {
    return savedId
  }

  const nextId = crypto.randomUUID()
  window.localStorage.setItem(STORAGE_KEY, nextId)
  return nextId
}
