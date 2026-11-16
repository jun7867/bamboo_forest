import styled from 'styled-components'
import { CoffeeHeader } from '../components/coffee/CoffeeHeader'
import { DrawResult } from '../components/coffee/DrawResult'
import { EntryList } from '../components/coffee/EntryList'
import { HistorySection } from '../components/coffee/HistorySection'
import { HostPanel } from '../components/coffee/HostPanel'
import { MyEntryCard } from '../components/coffee/MyEntryCard'
import { OpenRoundCard } from '../components/coffee/OpenRoundCard'
import { OrderSummary } from '../components/coffee/OrderSummary'
import { Card, EmptyText, PrimaryButton } from '../components/coffee/coffee.style'
import { useCoffeeDraw } from '../components/coffee/useCoffeeDraw'
import { useCoffeeStore } from '../store/useCoffeeStore'

const Page = styled.main`
  min-height: 100dvh;
  padding: 1.4rem 1.4rem 4rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.85rem 0.75rem calc(3rem + env(safe-area-inset-bottom));
  }
`

const Shell = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Column = styled.div`
  display: grid;
  gap: 1rem;
  min-width: 0;
`

const ErrorCard = styled(Card)`
  justify-items: center;
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.05rem;
  }
`

export function CoffeePage() {
  const coffee = useCoffeeDraw()
  const isLoading = useCoffeeStore((state) => state.isLoading)
  const hasLoaded = useCoffeeStore((state) => state.hasLoaded)
  const loadError = useCoffeeStore((state) => state.loadError)
  const isSubmitting = useCoffeeStore((state) => state.isSubmitting)
  const isWithdrawing = useCoffeeStore((state) => state.isWithdrawing)
  const isClosing = useCoffeeStore((state) => state.isClosing)
  const isOpening = useCoffeeStore((state) => state.isOpening)
  const entryStatus = useCoffeeStore((state) => state.entryStatus)
  const loadSnapshot = useCoffeeStore((state) => state.loadSnapshot)
  const submitEntry = useCoffeeStore((state) => state.submitEntry)
  const withdrawEntry = useCoffeeStore((state) => state.withdrawEntry)
  const closeRound = useCoffeeStore((state) => state.closeRound)
  const openRound = useCoffeeStore((state) => state.openRound)
  const historyPeriod = useCoffeeStore((state) => state.historyPeriod)
  const history = useCoffeeStore((state) => state.history)
  const historyPeriodKey = useCoffeeStore((state) => state.historyPeriodKey)
  const isHistoryLoading = useCoffeeStore((state) => state.isHistoryLoading)
  const historyError = useCoffeeStore((state) => state.historyError)
  const revealRoundId = useCoffeeStore((state) => state.revealRoundId)
  const setHistoryPeriod = useCoffeeStore((state) => state.setHistoryPeriod)
  const loadHistory = useCoffeeStore((state) => state.loadHistory)

  const { latestRound, latestEntries, myEntry } = coffee

  function renderBody() {
    if (loadError) {
      return (
        <ErrorCard role="alert">
          <strong>{loadError}</strong>
          <PrimaryButton type="button" onClick={() => void loadSnapshot()}>
            다시 불러오기
          </PrimaryButton>
        </ErrorCard>
      )
    }

    if (!hasLoaded || isLoading) {
      return (
        <Card>
          <EmptyText>불러오는 중...</EmptyText>
        </Card>
      )
    }

    if (!latestRound) {
      return <OpenRoundCard isOpening={isOpening} onOpen={openRound} />
    }

    // 다른 사람이 새 판을 열면 이전 판에서 받은 안내는 지금 판 카드에 보여주지 않는다
    const latestEntryStatus = entryStatus?.roundId === latestRound.id ? entryStatus : null
    // 내 응답이 바뀌면(다른 탭에서 고친 경우 포함) 입력칸을 서버 값으로 다시 채운다
    const myEntryCard = (
      <MyEntryCard
        key={`${latestRound.id}-${myEntry?.updatedAt ?? 'none'}`}
        round={latestRound}
        myEntry={myEntry}
        isSubmitting={isSubmitting}
        isWithdrawing={isWithdrawing}
        status={latestEntryStatus}
        onSubmit={(input) => void submitEntry(input)}
        onWithdraw={() => void withdrawEntry(latestRound.id)}
      />
    )
    // 판이 닫히는 순간 key가 바뀌어 연출을 처음부터 시작한다. 연출이 끝나도 key는 그대로라 다시 돌지 않는다
    const drawResult = (
      <DrawResult
        key={`${latestRound.id}-${latestRound.status}`}
        round={latestRound}
        entries={latestEntries}
        autoPlay={coffee.shouldReveal}
      />
    )

    if (latestRound.status === 'closed') {
      return (
        <>
          {drawResult}
          <Layout>
            <Column>
              <OpenRoundCard isOpening={isOpening} onOpen={openRound} />
              {myEntryCard}
            </Column>
            <Column>
              <OrderSummary lines={coffee.orderSummary} />
              <EntryList entries={latestEntries} myEntryId={myEntry?.id ?? null} />
            </Column>
          </Layout>
        </>
      )
    }

    return (
      <Layout>
        <Column>
          {myEntryCard}
          <HostPanel
            isHost={coffee.isHost}
            participantCount={latestEntries.length}
            isClosing={isClosing}
            onClose={(adminPassword) => closeRound(latestRound.id, adminPassword)}
          />
        </Column>
        <Column>
          {drawResult}
          <EntryList entries={latestEntries} myEntryId={myEntry?.id ?? null} />
          <OrderSummary lines={coffee.orderSummary} />
        </Column>
      </Layout>
    )
  }

  return (
    <Page>
      <Shell>
        <CoffeeHeader round={latestRound} />

        {renderBody()}

        {hasLoaded && !loadError ? (
          <HistorySection
            period={historyPeriod}
            history={history}
            historyPeriodKey={historyPeriodKey}
            isLoading={isHistoryLoading}
            error={historyError}
            isRevealing={revealRoundId !== null}
            myClientKey={coffee.myClientKey}
            onChangePeriod={setHistoryPeriod}
            onRetry={() => void loadHistory()}
          />
        ) : null}
      </Shell>
    </Page>
  )
}
