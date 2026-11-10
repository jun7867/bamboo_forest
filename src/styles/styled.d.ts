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
      danger: string
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
    zIndex: {
      sticky: number
      floating: number
      banner: number
      menu: number
      modal: number
      overlay: number
      toast: number
    }
  }
}
