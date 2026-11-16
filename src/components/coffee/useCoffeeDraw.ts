import { useEffect, useMemo } from 'react'
import { coffeeDrawSource } from '../../lib/coffeeDraw'
import { sortCoffeeEntries, summarizeCoffeeOrders } from '../../lib/coffeeOrders'
import { useCoffeeStore } from '../../store/useCoffeeStore'
import type { CoffeeEntry } from '../../types/coffee'

const POLLING_INTERVAL_MS = 30_000
const REALTIME_DEBOUNCE_MS = 400

// useBoardSync와 같은 정책: 실시간 이벤트 + 30초 주기 + 탭 복귀 시 다시 불러온다
function useCoffeeSync() {
  const loadSnapshot = useCoffeeStore((state) => state.loadSnapshot)

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    let debounceTimer: number | undefined

    function scheduleReload() {
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => void loadSnapshot(), REALTIME_DEBOUNCE_MS)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        scheduleReload()
      }
    }

    const pollingId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadSnapshot()
      }
    }, POLLING_INTERVAL_MS)

    const unsubscribe = coffeeDrawSource.subscribe(scheduleReload)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(debounceTimer)
      window.clearInterval(pollingId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribe()
    }
  }, [loadSnapshot])
}

function groupEntriesByRound(entries: CoffeeEntry[]) {
  return entries.reduce<Record<string, CoffeeEntry[]>>((accumulator, entry) => {
    accumulator[entry.roundId] = [...(accumulator[entry.roundId] ?? []), entry]
    return accumulator
  }, {})
}

export function useCoffeeDraw() {
  useCoffeeSync()

  const rounds = useCoffeeStore((state) => state.rounds)
  const entries = useCoffeeStore((state) => state.entries)
  const myClientKey = useCoffeeStore((state) => state.myClientKey)
  const hostRoundIds = useCoffeeStore((state) => state.hostRoundIds)
  const revealRoundId = useCoffeeStore((state) => state.revealRoundId)

  const entriesByRound = useMemo(() => groupEntriesByRound(entries), [entries])
  // 가장 최근에 만든 판이 지금 판이다. 닫혔으면 결과를 보여주고 새 판을 열 수 있다
  const latestRound = rounds[0] ?? null
  const latestEntries = useMemo(
    () => sortCoffeeEntries(latestRound ? entriesByRound[latestRound.id] ?? [] : []),
    [entriesByRound, latestRound],
  )
  const orderSummary = useMemo(() => summarizeCoffeeOrders(latestEntries), [latestEntries])
  const myEntry = myClientKey
    ? latestEntries.find((entry) => entry.clientKey === myClientKey) ?? null
    : null

  return {
    latestRound,
    latestEntries,
    orderSummary,
    myEntry,
    isHost: latestRound ? hostRoundIds.includes(latestRound.id) : false,
    shouldReveal: latestRound !== null && revealRoundId === latestRound.id,
    myClientKey,
  }
}
