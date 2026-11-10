import type { ReactNode, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

function createIcon(paths: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    )
  }
}

export const IconPlus = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
)

export const IconClose = createIcon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </>,
)

export const IconSearch = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </>,
)

export const IconBoard = createIcon(
  <>
    <rect x="3.5" y="4" width="7.5" height="7.5" rx="1.2" transform="rotate(-4 7 8)" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" transform="rotate(3 17 7)" />
    <rect x="4" y="13" width="7.5" height="7.5" rx="1.2" transform="rotate(2 8 17)" />
    <rect x="13.2" y="13.2" width="7.5" height="7.5" rx="1.2" transform="rotate(-3 17 17)" />
  </>,
)

export const IconList = createIcon(
  <>
    <rect x="3.5" y="4" width="17" height="6" rx="1.6" />
    <rect x="3.5" y="14" width="17" height="6" rx="1.6" />
  </>,
)

export const IconPresent = createIcon(
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M12 16v4" />
    <path d="M8 20h8" />
    <path d="M10 8.5l4 1.5-4 1.5z" fill="currentColor" />
  </>,
)

export const IconExpand = createIcon(
  <>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </>,
)

export const IconCollapse = createIcon(
  <>
    <path d="M4 14h6v6" />
    <path d="M20 10h-6V4" />
    <path d="M14 10l7-7" />
    <path d="M3 21l7-7" />
  </>,
)

export const IconChevronLeft = createIcon(<path d="M15 18l-6-6 6-6" />)

export const IconChevronRight = createIcon(<path d="M9 18l6-6-6-6" />)

export const IconChevronDown = createIcon(<path d="M6 9l6 6 6-6" />)

export const IconDice = createIcon(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
  </>,
)

export const IconCheck = createIcon(<path d="M5 12.5l4.5 4.5L19 7.5" />)

export const IconComment = createIcon(
  <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12z" />,
)

export const IconHeart = createIcon(
  <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20z" />,
)

export const IconFullscreen = createIcon(
  <>
    <path d="M4 9V4h5" />
    <path d="M20 9V4h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 15v5h-5" />
  </>,
)

export const IconExitFullscreen = createIcon(
  <>
    <path d="M9 4v5H4" />
    <path d="M15 4v5h5" />
    <path d="M9 20v-5H4" />
    <path d="M15 20v-5h5" />
  </>,
)

export const IconShuffle = createIcon(
  <>
    <path d="M16 4h4v4" />
    <path d="M4 20L20 4" />
    <path d="M20 16v4h-4" />
    <path d="M15 15l5 5" />
    <path d="M4 4l5 5" />
  </>,
)

export const IconHome = createIcon(
  <>
    <path d="M4 11l8-6.5 8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
  </>,
)

export const IconPin = createIcon(
  <>
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z" />
    <path d="M12 14v6" />
  </>,
)

export const IconImage = createIcon(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M20.5 16l-4.8-4.8L7 19.5" />
  </>,
)

export const IconMore = createIcon(
  <>
    <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </>,
)
