import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'
import { TopMarqueeBanner } from './components/common/TopMarqueeBanner'

const LandingPage = lazy(async () => {
  const module = await import('./pages/LandingPage')
  return { default: module.LandingPage }
})

const BoardPage = lazy(async () => {
  const module = await import('./pages/BoardPage')
  return { default: module.BoardPage }
})

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        color: '#587056',
      }}
    >
      화면을 불러오는 중이에요...
    </div>
  )
}

const AppFrame = styled.div`
  min-height: 100dvh;
  padding-top: 2.75rem;
`

function App() {
  return (
    <AppFrame>
      <TopMarqueeBanner />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/board" element={<BoardPage version="v3" />} />
          <Route path="/board/v1" element={<BoardPage version="v1" />} />
          <Route path="/board/v2" element={<BoardPage version="v2" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppFrame>
  )
}

export default App
