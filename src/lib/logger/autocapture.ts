import {
  CLICK_TEXT_MAX_LENGTH,
  LOG_ATTRIBUTE,
  RAGE_CLICK_THRESHOLD,
  RAGE_CLICK_WINDOW_MS,
} from './constants'
import { ANALYTICS_EVENT } from './types'
import type { AnalyticsProperties } from './types'
import type { Logger } from './logger'

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], input[type="button"], summary, label'

const MASKED_TEXT = '[masked]'

function toCamelCase(value: string) {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

function readText(element: HTMLElement) {
  if (element.closest(`[${LOG_ATTRIBUTE.MASK}]`)) {
    return MASKED_TEXT
  }

  const text = element.innerText?.trim().replace(/\s+/g, ' ') ?? ''
  return text.slice(0, CLICK_TEXT_MAX_LENGTH)
}

function buildElementPath(element: HTMLElement) {
  const segments: string[] = []
  let current: HTMLElement | null = element

  while (current && segments.length < 5 && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    const id = current.id ? `#${current.id}` : ''
    segments.unshift(`${tag}${id}`)
    current = current.parentElement
  }

  return segments.join(' > ')
}

/** data-log-* 속성을 그대로 이벤트 프로퍼티로 옮긴다 */
function readDeclaredProperties(element: HTMLElement): AnalyticsProperties {
  const properties: AnalyticsProperties = {}

  for (const attribute of Array.from(element.attributes)) {
    if (!attribute.name.startsWith(LOG_ATTRIBUTE.PROPS_PREFIX)) {
      continue
    }

    const key = attribute.name.slice(LOG_ATTRIBUTE.PROPS_PREFIX.length)

    if (key === 'event' || key === 'ignore' || key === 'mask') {
      continue
    }

    properties[toCamelCase(key)] = attribute.value
  }

  return properties
}

function buildElementProperties(element: HTMLElement): AnalyticsProperties {
  const anchorHref = element instanceof HTMLAnchorElement ? element.href : null

  return {
    tag: element.tagName.toLowerCase(),
    text: readText(element),
    elementId: element.id || null,
    elementClass: element.getAttribute('class'),
    href: anchorHref,
    ariaLabel: element.getAttribute('aria-label'),
    elementPath: buildElementPath(element),
  }
}

/**
 * 클릭 자동 수집.
 * - data-log-event 가 붙은 요소는 선언된 이름으로 기록
 * - 그 외 인터랙티브 요소는 $click 으로 기록
 * - 같은 요소 연타는 $rage_click 으로 따로 남겨 "헤매는 지점"을 잡는다
 */
export function startAutocapture(logger: Logger) {
  let lastTarget: HTMLElement | null = null
  let lastClickAt = 0
  let repeatCount = 0

  const handleClick = (nativeEvent: MouseEvent) => {
    const origin = nativeEvent.target

    if (!(origin instanceof Element)) {
      return
    }

    if (origin.closest(`[${LOG_ATTRIBUTE.IGNORE}]`)) {
      return
    }

    const declared = origin.closest<HTMLElement>(`[${LOG_ATTRIBUTE.EVENT}]`)
    const interactive = origin.closest<HTMLElement>(INTERACTIVE_SELECTOR)
    const target = declared ?? interactive

    if (!target) {
      return
    }

    const now = Date.now()

    if (target === lastTarget && now - lastClickAt < RAGE_CLICK_WINDOW_MS) {
      repeatCount += 1
    } else {
      repeatCount = 1
    }

    lastTarget = target
    lastClickAt = now

    const properties: AnalyticsProperties = {
      ...buildElementProperties(target),
      ...readDeclaredProperties(target),
    }

    if (declared) {
      logger.track(declared.getAttribute(LOG_ATTRIBUTE.EVENT) as string, properties)
    } else {
      logger.track(ANALYTICS_EVENT.CLICK, properties)
    }

    if (repeatCount >= RAGE_CLICK_THRESHOLD) {
      logger.track(ANALYTICS_EVENT.RAGE_CLICK, { ...properties, clickCount: repeatCount })
      repeatCount = 0
    }
  }

  document.addEventListener('click', handleClick, { capture: true })

  return () => {
    document.removeEventListener('click', handleClick, { capture: true })
  }
}
