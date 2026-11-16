import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { buildCraneLayout, buildCranePlan } from '../../lib/craneGame'
import { useCoffeeStore } from '../../store/useCoffeeStore'
import type { CoffeeEntry, CoffeeRound } from '../../types/coffee'
import { ConfettiBurst } from '../townhall/ConfettiBurst'
import { Card, CardHeader, CardTitle, SecondaryButton } from './coffee.style'
import { CraneGame } from './CraneGame'

// 쏘는 사람 결과를 잠깐 보여준 뒤 가져오는 사람 집게로 넘어간다
const PAYER_HOLD_MS = 1600
// 움직임 줄이기를 켠 화면은 집게 연출 없이 결과를 이 간격으로 차례로 보여준다
const REDUCED_MOTION_STEP_MS = 1000
// 방장 화면은 마감 응답이 먼저 오고 응답 목록은 재조회로 뒤따른다. 그래도 끝내 못 받으면 연출 없이 결과만 보여준다
const DATA_WAIT_LIMIT_MS = 6000

interface DrawResultProps {
  round: CoffeeRound
  entries: CoffeeEntry[]
  // 막 마감된 판이면 인형뽑기 연출을 재생한다. 부모가 key로 다시 만들어 처음부터 재생한다
  autoPlay: boolean
}

type Stage = 'payer-crane' | 'payer-result' | 'fetcher-crane' | 'done'

interface Playback {
  token: number
  stage: Stage
  // 집게 연출이 끝까지 재생됐을 때만 컨페티를 띄운다(새로고침해서 결과만 볼 때는 띄우지 않는다)
  celebrate: boolean
}

const ResultCard = styled(Card)`
  position: relative;
`

const SlotGrid = styled.div<{ $stacked: boolean }>`
  display: grid;
  grid-template-columns: ${({ $stacked }) => ($stacked ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))')};
  gap: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Slot = styled.div<{ $state: 'waiting' | 'picked' }>`
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.35rem;
  min-height: 7.5rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px ${({ $state }) => ($state === 'waiting' ? 'dashed' : 'solid')} rgba(80, 115, 61, 0.28);
  background: ${({ $state }) =>
    $state === 'picked'
      ? 'linear-gradient(160deg, #fff6d8 0%, #ffe4b8 100%)'
      : 'rgba(255, 255, 255, 0.78)'};
  text-align: center;
  min-width: 0;
`

const SlotLabel = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.02em;
`

const WinnerName = styled(motion.strong)`
  display: block;
  max-width: 100%;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.6rem, 3.6vw, 2.2rem);
  font-weight: 400;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.textStrong};
  overflow-wrap: anywhere;
`

const WinnerMenu = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  font-weight: 700;
  overflow-wrap: anywhere;
`

const ReplayRow = styled.div`
  display: flex;
  justify-content: flex-end;
`

function findEntry(entries: CoffeeEntry[], entryId: string | null) {
  return entries.find((entry) => entry.id === entryId) ?? null
}

function PickedSlot({ label, entry, animate }: { label: string; entry: CoffeeEntry | null; animate: boolean }) {
  return (
    <Slot $state="picked">
      <SlotLabel>{label}</SlotLabel>
      <WinnerName
        initial={animate ? { scale: 0.7, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        {entry?.nickname ?? '...'}
      </WinnerName>
      {entry ? <WinnerMenu>{entry.menu}</WinnerMenu> : null}
    </Slot>
  )
}

function WaitingSlot({ label }: { label: string }) {
  return (
    <Slot $state="waiting">
      <SlotLabel>{label}</SlotLabel>
      <WinnerName>?</WinnerName>
    </Slot>
  )
}

const PAYER_LABEL = '☕ 쏘는 사람'
const FETCHER_LABEL = '🚶 가져오는 사람'

export function DrawResult({ round, entries, autoPlay }: DrawResultProps) {
  const finishReveal = useCoffeeStore((state) => state.finishReveal)
  const prefersReducedMotion = useReducedMotion() ?? false
  const hasDraw = round.status === 'closed' && round.firstPickEntryId !== null
  const firstStage: Stage = prefersReducedMotion ? 'payer-result' : 'payer-crane'
  const [playback, setPlayback] = useState<Playback>(() => ({
    token: 0,
    stage: autoPlay && hasDraw ? firstStage : 'done',
    celebrate: false,
  }))
  const [hasWaitedTooLong, setHasWaitedTooLong] = useState(false)

  // 서버와 같은 순서(응답한 순서)로 세워야 누구 화면에서든 같은 케이스 배치가 나온다
  const participants = useMemo(
    () =>
      [...entries].sort(
          (left, right) =>
            Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
        ),
    [entries],
  )
  const payer = findEntry(participants, round.firstPickEntryId)
  const fetcher = findEntry(participants, round.secondPickEntryId)
  // 마감 직후 방장 화면은 마감 전에 받아 둔 응답 목록을 들고 있을 수 있다.
  // 당첨자와 마감 때 저장한 참가 인원까지 다 들어온 목록으로만 케이스를 채워 당첨자 컵이 빠지지 않게 한다
  const isDataReady =
    payer !== null &&
    fetcher !== null &&
    (round.participantCount === null || participants.length >= round.participantCount)

  const plans = useMemo(() => {
    if (!isDataReady || !round.firstPickEntryId || !round.secondPickEntryId) {
      return null
    }

    const items = participants.map((entry) => ({ id: entry.id, name: entry.nickname }))
    // 두 번 다 같은 케이스에서 집도록 배치는 판 id 하나로 만들고, 집게 경로만 따로 뽑는다
    const layout = buildCraneLayout({ seed: round.id, items })
    const payerPlan = buildCranePlan({ seed: `${round.id}:payer`, layout, targetId: round.firstPickEntryId })
    // 쏘는 사람 컵이 케이스로 돌아온 뒤 두 번째 집게가 움직인다. 같은 사람이 또 뽑히면 그 컵을 다시 집는다
    const fetcherPlan = buildCranePlan({
      seed: `${round.id}:fetcher`,
      layout,
      targetId: round.secondPickEntryId,
      returningId: round.firstPickEntryId,
    })

    return payerPlan && fetcherPlan ? { payer: payerPlan, fetcher: fetcherPlan } : null
  }, [isDataReady, participants, round.firstPickEntryId, round.id, round.secondPickEntryId])

  // 끝내 데이터가 안 맞으면 연출을 건너뛰고 결과만 보여준다. 늦게 들어와도 결과를 본 뒤에 집게가 다시 움직이지 않게 유지한다
  const stage: Stage = hasWaitedTooLong ? 'done' : playback.stage
  const isWaitingForData = stage !== 'done' && !plans

  useEffect(() => {
    if (!isWaitingForData) {
      return
    }

    const timer = window.setTimeout(() => setHasWaitedTooLong(true), DATA_WAIT_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [isWaitingForData])

  useEffect(() => {
    if (stage !== 'payer-result' || isWaitingForData) {
      return
    }

    const timer = window.setTimeout(
      () =>
        setPlayback((current) =>
          current.stage === 'payer-result'
            ? { ...current, stage: prefersReducedMotion ? 'done' : 'fetcher-crane' }
            : current,
        ),
      prefersReducedMotion ? REDUCED_MOTION_STEP_MS : PAYER_HOLD_MS,
    )

    return () => window.clearTimeout(timer)
  }, [isWaitingForData, prefersReducedMotion, stage])

  useEffect(() => {
    if (stage === 'done') {
      finishReveal(round.id)
    }
  }, [finishReveal, round.id, stage])

  function handleReplay() {
    setHasWaitedTooLong(false)
    setPlayback((current) => ({ token: current.token + 1, stage: firstStage, celebrate: false }))
  }

  const isCraneRunning = stage === 'payer-crane' || stage === 'fetcher-crane'

  function renderDrawStages() {
    if (isWaitingForData) {
      return (
        <>
          <WaitingSlot label={PAYER_LABEL} />
          <WaitingSlot label={FETCHER_LABEL} />
        </>
      )
    }

    const payerSlot = (
      <PickedSlot
        label={PAYER_LABEL}
        entry={payer}
        animate={stage === 'payer-result' && !prefersReducedMotion}
      />
    )

    switch (stage) {
      case 'payer-crane':
        return (
          <>
            {plans ? (
              <CraneGame
                key={`${playback.token}-payer`}
                plan={plans.payer}
                label={PAYER_LABEL}
                roleLabel={PAYER_LABEL}
                onFinish={() =>
                  setPlayback((current) =>
                    current.stage === 'payer-crane' ? { ...current, stage: 'payer-result' } : current,
                  )
                }
              />
            ) : null}
            <WaitingSlot label={FETCHER_LABEL} />
          </>
        )
      case 'payer-result':
        return (
          <>
            {payerSlot}
            <WaitingSlot label={FETCHER_LABEL} />
          </>
        )
      case 'fetcher-crane':
        return (
          <>
            {payerSlot}
            {plans ? (
              <CraneGame
                key={`${playback.token}-fetcher`}
                plan={plans.fetcher}
                label={FETCHER_LABEL}
                roleLabel={FETCHER_LABEL}
                onFinish={() =>
                  setPlayback((current) =>
                    current.stage === 'fetcher-crane' ? { ...current, stage: 'done', celebrate: true } : current,
                  )
                }
              />
            ) : null}
          </>
        )
      default:
        return (
          <>
            {payerSlot}
            <PickedSlot
              label={FETCHER_LABEL}
              entry={fetcher}
              animate={(playback.token > 0 || autoPlay) && !prefersReducedMotion}
            />
          </>
        )
    }
  }

  // 마감 전이거나 참가자 없이 닫힌 판은 결과 칸을 두지 않는다
  if (!hasDraw) {
    return null
  }

  return (
    <ResultCard aria-labelledby="coffee-draw-result-title">
      <CardHeader>
        <CardTitle id="coffee-draw-result-title">결과</CardTitle>
      </CardHeader>

      <SlotGrid $stacked={isCraneRunning || isWaitingForData} aria-live="polite" aria-busy={stage !== 'done'}>
        {renderDrawStages()}
      </SlotGrid>

      {hasDraw && stage === 'done' && plans ? (
        <ReplayRow>
          <SecondaryButton type="button" onClick={handleReplay}>
            ↻ 다시 보기
          </SecondaryButton>
        </ReplayRow>
      ) : null}

      {playback.celebrate && stage === 'done' ? <ConfettiBurst key={playback.token} /> : null}
    </ResultCard>
  )
}
