import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { logger } from '../logger'
import type { LoggerInitOptions } from '../types'

interface LoggerProviderProps extends LoggerInitOptions {
  children: ReactNode
}

/**
 * logger 수명은 페이지 수명과 같다. 언마운트로 정리하지 않고 init만 한 번 보장한다.
 * 라우트 변경은 여기서 단일 지점으로 page()에 넘긴다.
 */
export function LoggerProvider({ children, ...options }: LoggerProviderProps) {
  const location = useLocation()

  useEffect(() => {
    logger.init(options)
    // init 옵션은 최초 1회만 반영한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    logger.page(location.pathname, { search: location.search })
  }, [location.pathname, location.search])

  return children
}
