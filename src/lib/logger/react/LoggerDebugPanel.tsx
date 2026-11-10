import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { logger } from '../logger'
import type { AnalyticsEvent } from '../types'

const MAX_VISIBLE_EVENTS = 50

const Root = styled.div`
  position: fixed;
  left: 1rem;
  bottom: 1rem;
  z-index: 9999;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  /* 빈 영역이 보드 클릭을 가로채지 않도록 컨테이너는 이벤트를 받지 않는다 */
  pointer-events: none;
`

const ToggleButton = styled.button`
  pointer-events: auto;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  background: #2f4a2c;
  color: #fdfdf6;
  font-size: 0.75rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(47, 74, 44, 0.28);
`

const Panel = styled.div`
  pointer-events: auto;
  width: min(20rem, calc(100vw - 2rem));
  max-height: 40vh;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(23, 33, 22, 0.94);
  color: #e8f0e4;
  overflow-y: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-height: 30vh;
  }
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(232, 240, 228, 0.12);
  font-size: 0.7rem;
  line-height: 1.4;
`

const Time = styled.span`
  color: rgba(232, 240, 228, 0.55);
`

const Name = styled.strong`
  color: #b6e39c;
`

const Props = styled.pre`
  margin: 0.2rem 0 0;
  color: rgba(232, 240, 228, 0.7);
  white-space: pre-wrap;
  word-break: break-all;
`

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour12: false })
}

/** 개발 중 이벤트가 실제로 어떻게 쌓이는지 눈으로 확인하는 용도 */
export function LoggerDebugPanel() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(
    () =>
      logger.subscribe((event) => {
        setEvents((previous) => [event, ...previous].slice(0, MAX_VISIBLE_EVENTS))
      }),
    [],
  )

  return (
    <Root data-log-ignore>
      {isOpen ? (
        <Panel>
          {events.length === 0 ? (
            <Row>
              <Time>-</Time>
              <span>아직 수집된 이벤트가 없어요.</span>
            </Row>
          ) : (
            events.map((event) => (
              <Row key={event.id}>
                <Time>{formatTime(event.eventTime)}</Time>
                <div>
                  <Name>{event.event}</Name>
                  <Props>{JSON.stringify(event.properties)}</Props>
                </div>
              </Row>
            ))
          )}
        </Panel>
      ) : null}
      <ToggleButton type="button" onClick={() => setIsOpen((previous) => !previous)}>
        📈 logger {events.length}
      </ToggleButton>
    </Root>
  )
}
