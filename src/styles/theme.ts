import type { DefaultTheme } from 'styled-components'

export const theme: DefaultTheme = {
  colors: {
    text: '#35513A',
    textStrong: '#243625',
    textMuted: '#587056',
    textSubtle: '#7A8D78',
    primaryDeep: '#487044',
    primarySoft: 'rgba(122, 175, 113, 0.18)',
    borderStrong: 'rgba(80, 115, 61, 0.18)',
    borderSoft: 'rgba(80, 115, 61, 0.1)',
  },
  gradients: {
    surface:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(252, 248, 239, 0.92) 100%)',
    button: 'linear-gradient(135deg, #79AF63 0%, #4E8D54 100%)',
  },
  fonts: {
    heading: "'Jua', 'Noto Sans KR', sans-serif",
    body: "'Noto Sans KR', sans-serif",
  },
  radii: {
    lg: '1rem',
    xl: '1.75rem',
    hero: '2rem',
  },
  shadows: {
    soft: '0 18px 34px rgba(83, 111, 63, 0.12)',
    card: '0 30px 48px rgba(74, 96, 57, 0.14)',
  },
  breakpoints: {
    tablet: '920px',
    mobile: '640px',
  },
}
