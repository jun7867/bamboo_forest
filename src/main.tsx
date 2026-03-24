import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { Agentation } from 'agentation'
import App from './App'
import { GlobalStyle } from './styles/GlobalStyle'
import { theme } from './styles/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <GlobalStyle />
        <App />
        {import.meta.env.DEV ? (
          <Agentation endpoint={import.meta.env.VITE_AGENTATION_ENDPOINT || 'http://localhost:4747'} />
        ) : null}
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
