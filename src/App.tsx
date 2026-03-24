import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

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

function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
