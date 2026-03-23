import 'styled-components'

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      text: string
      textStrong: string
      textMuted: string
      textSubtle: string
      primaryDeep: string
      primarySoft: string
      borderStrong: string
      borderSoft: string
    }
    gradients: {
      surface: string
      button: string
    }
    fonts: {
      heading: string
      body: string
    }
    radii: {
      lg: string
      xl: string
      hero: string
    }
    shadows: {
      soft: string
      card: string
    }
    breakpoints: {
      tablet: string
      mobile: string
    }
  }
}
