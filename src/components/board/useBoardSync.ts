import { useEffect } from 'react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useBoardStore } from '../../store/useBoardStore'

const POLLING_INTERVAL_MS = 30_000
const REALTIME_DEBOUNCE_MS = 400

// 실시간 이벤트 + 주기 동기화 + 탭 복귀 시 동기화로 보드를 최신 상태로 맞춘다
export function useBoardSync(isLive: boolean) {
  const loadNotes = useBoardStore((state) => state.loadNotes)

  // 아카이브에 있다가 현재 보드로 돌아오면 이미 불러온 상태라도 최신으로 맞춘다
  useEffect(() => {
    void loadNotes(isLive)
  }, [isLive, loadNotes])

  useEffect(() => {
    const client = supabase

    if (!isLive || !isSupabaseConfigured || !client) {
      return
    }

    let debounceTimer: number | undefined

    function scheduleReload() {
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => void loadNotes(true), REALTIME_DEBOUNCE_MS)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        scheduleReload()
      }
    }

    // board_notes는 RLS 정책상 실시간 이벤트가 오지 않을 수 있어 주기적으로도 맞춘다
    const pollingId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNotes(true)
      }
    }, POLLING_INTERVAL_MS)

    const channel = client
      .channel('board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_notes' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_note_comments' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_note_likes' }, scheduleReload)
      .subscribe()

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(debounceTimer)
      window.clearInterval(pollingId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void client.removeChannel(channel)
    }
  }, [isLive, loadNotes])
}
