import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    color: ${({ theme }) => theme.colors.text};
    background:
      radial-gradient(circle at top left, rgba(193, 232, 171, 0.7), transparent 28%),
      radial-gradient(circle at top right, rgba(255, 231, 188, 0.65), transparent 26%),
      linear-gradient(180deg, #f6f9ee 0%, #edf5e7 45%, #f8f4e6 100%);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    position: relative;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
    background:
      linear-gradient(115deg, transparent 0 24%, rgba(97, 154, 82, 0.05) 24% 25%, transparent 25% 49%, rgba(97, 154, 82, 0.05) 49% 50%, transparent 50% 100%),
      repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px 28px);
  }

  a {
    color: inherit;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    border: 0;
    cursor: pointer;
    background: none;
  }

  img,
  svg {
    max-width: 100%;
  }

  ::selection {
    background: rgba(118, 170, 103, 0.22);
    color: ${({ theme }) => theme.colors.textStrong};
  }
`
