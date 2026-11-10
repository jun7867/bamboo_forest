import { useEffect, useMemo, useRef } from 'react'
import { BOARD_EVENT } from '../../lib/logger/events'
import { useLogger } from '../../lib/logger/react/useLogger'
import type { BoardCategory, PostItColor } from '../../types/board'

export interface NoteComposerSnapshot {
  category: BoardCategory
  color: PostItColor
  contentLength: number
  hasAuthor: boolean
  hasPassword: boolean
  hasImage: boolean
}

/**
 * 작성 퍼널 추적.
 * 열림 → 입력 → 제출 시도 → 성공/실패 를 한 세트로 남기고,
 * 성공 없이 닫히면 그 시점의 입력 상태를 함께 남겨 "어디서 멈췄는지"를 본다.
 */
export function useNoteComposerTracking(snapshot: NoteComposerSnapshot) {
  const { track } = useLogger()
  const snapshotRef = useRef(snapshot)
  const completedRef = useRef(false)
  const openedAtRef = useRef(0)

  // 언마운트 시점에 최신 입력 상태를 읽어야 해서 렌더마다 스냅샷만 갱신한다
  useEffect(() => {
    snapshotRef.current = snapshot
  })

  useEffect(() => {
    const openedAt = Date.now()
    openedAtRef.current = openedAt
    track(BOARD_EVENT.COMPOSER_OPENED, { category: snapshotRef.current.category })

    return () => {
      if (completedRef.current) {
        return
      }

      track(BOARD_EVENT.COMPOSER_CLOSED, {
        ...snapshotRef.current,
        completed: false,
        durationMs: Date.now() - openedAt,
      })
    }
  }, [track])

  return useMemo(
    () => ({
      trackCategorySelected: (category: BoardCategory) =>
        track(BOARD_EVENT.COMPOSER_CATEGORY_SELECTED, { category }),
      trackImageAttached: (sizeBytes: number, mimeType: string) =>
        track(BOARD_EVENT.COMPOSER_IMAGE_ATTACHED, { sizeBytes, mimeType }),
      trackSubmitAttempted: () =>
        track(BOARD_EVENT.NOTE_SUBMIT_ATTEMPTED, {
          ...snapshotRef.current,
          durationMs: Date.now() - openedAtRef.current,
        }),
      trackSubmitBlocked: (reason: string) =>
        track(BOARD_EVENT.NOTE_SUBMIT_BLOCKED, { reason, ...snapshotRef.current }),
      trackCreated: () => {
        completedRef.current = true
        track(BOARD_EVENT.NOTE_CREATED, {
          ...snapshotRef.current,
          durationMs: Date.now() - openedAtRef.current,
        })
      },
      trackFailed: (stage: string, message: string) =>
        track(BOARD_EVENT.NOTE_CREATE_FAILED, {
          stage,
          message,
          ...snapshotRef.current,
          durationMs: Date.now() - openedAtRef.current,
        }),
    }),
    [track],
  )
}
