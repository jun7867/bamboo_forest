import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../logger'
import { ERROR_SOURCE } from '../types'

interface LoggerErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  boundary?: string
}

interface LoggerErrorBoundaryState {
  hasError: boolean
}

export class LoggerErrorBoundary extends Component<
  LoggerErrorBoundaryProps,
  LoggerErrorBoundaryState
> {
  state: LoggerErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): LoggerErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.captureError({
      error,
      source: ERROR_SOURCE.REACT_BOUNDARY,
      properties: {
        boundary: this.props.boundary ?? 'root',
        componentStack: errorInfo.componentStack ?? null,
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}
