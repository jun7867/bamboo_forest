import { DEVICE_TYPE } from './types'
import type { AnalyticsContext, AnalyticsUtm, DeviceType } from './types'

const BROWSER_MATCHERS: { name: string; pattern: RegExp }[] = [
  { name: 'Edge', pattern: /Edg\/([\d.]+)/ },
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/ },
  { name: 'Opera', pattern: /OPR\/([\d.]+)/ },
  { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
  { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
  { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
]

const OS_MATCHERS: { name: string; pattern: RegExp }[] = [
  { name: 'iOS', pattern: /iPhone|iPad|iPod/ },
  { name: 'Android', pattern: /Android/ },
  { name: 'macOS', pattern: /Mac OS X/ },
  { name: 'Windows', pattern: /Windows NT/ },
  { name: 'Linux', pattern: /Linux/ },
]

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

function detectBrowser(userAgent: string) {
  for (const matcher of BROWSER_MATCHERS) {
    const matched = userAgent.match(matcher.pattern)

    if (matched) {
      return { browser: matcher.name, browserVersion: matched[1] ?? '' }
    }
  }

  return { browser: 'unknown', browserVersion: '' }
}

function detectOs(userAgent: string) {
  return OS_MATCHERS.find((matcher) => matcher.pattern.test(userAgent))?.name ?? 'unknown'
}

function detectDeviceType(userAgent: string, width: number): DeviceType {
  if (/iPad|Tablet/i.test(userAgent) || (width >= 768 && width < 1024)) {
    return DEVICE_TYPE.TABLET
  }

  if (/Mobi|iPhone|Android/i.test(userAgent) || width < 768) {
    return DEVICE_TYPE.MOBILE
  }

  return DEVICE_TYPE.DESKTOP
}

function readUtm(search: string): AnalyticsUtm | undefined {
  const params = new URLSearchParams(search)
  const utm: AnalyticsUtm = {}

  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`)

    if (value) {
      utm[key] = value
    }
  }

  return Object.keys(utm).length > 0 ? utm : undefined
}

/** 세션 첫 진입의 유입 정보는 이후 이벤트에도 붙여야 하므로 메모리에 고정한다 */
let sessionUtm: AnalyticsUtm | undefined
let sessionReferrer: string | undefined

export function captureEntryContext() {
  sessionUtm = readUtm(window.location.search)
  sessionReferrer = document.referrer
}

export function buildContext(): AnalyticsContext {
  const userAgent = navigator.userAgent
  const viewportWidth = window.innerWidth
  const { browser, browserVersion } = detectBrowser(userAgent)

  return {
    url: window.location.href,
    path: window.location.pathname,
    search: window.location.search,
    title: document.title,
    referrer: sessionReferrer ?? document.referrer,
    deviceType: detectDeviceType(userAgent, viewportWidth),
    os: detectOs(userAgent),
    browser,
    browserVersion,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth,
    viewportHeight: window.innerHeight,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utm: sessionUtm ?? readUtm(window.location.search),
  }
}
