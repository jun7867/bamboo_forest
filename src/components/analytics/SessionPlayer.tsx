import { useEffect, useRef, useState } from 'react'
import type { eventWithTime } from '@rrweb/types'
import rrwebPlayer from 'rrweb-player'
import 'rrweb-player/dist/style.css'
import { loadSessionEvents } from '../../lib/logger/replay'
import { Muted } from './AnalyticsDashboard.style'

const MIN_PLAYABLE_EVENTS = 2

type PlayerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: eventWithTime[] }

interface SessionPlayerProps {
  sessionId: string
}

export function SessionPlayer({ sessionId }: SessionPlayerProps) {
  const [state, setState] = useState<PlayerState>({ status: 'loading' })
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isStale = false

    loadSessionEvents(sessionId)
      .then((events) => {
        if (!isStale) {
          setState({ status: 'ready', events })
        }
      })
      .catch((error: Error) => {
        if (!isStale) {
          setState({ status: 'error', message: error.message })
        }
      })

    return () => {
      isStale = true
    }
  }, [sessionId])

  const events = state.status === 'ready' ? state.events : null

  useEffect(() => {
    const target = frameRef.current

    if (!target || !events || events.length < MIN_PLAYABLE_EVENTS) {
      return
    }

    target.replaceChildren()
    const player = new rrwebPlayer({
      target,
      props: { events, width: target.clientWidth, autoPlay: false },
    })

    return () => {
      // svelte 컴포넌트 정리 메서드가 타입에 노출되지 않아 런타임 존재 여부로 호출한다
      ;(player as unknown as { $destroy?: () => void }).$destroy?.()
      target.replaceChildren()
    }
  }, [events])

  return (
    <div>
      {state.status === 'loading' ? <Muted>녹화를 불러오는 중이에요...</Muted> : null}
      {state.status === 'error' ? <Muted>녹화를 불러오지 못했어요: {state.message}</Muted> : null}
      {events && events.length < MIN_PLAYABLE_EVENTS ? (
        <Muted>재생할 만큼의 이벤트가 쌓이지 않은 세션이에요.</Muted>
      ) : null}
      <div ref={frameRef} />
    </div>
  )
}
