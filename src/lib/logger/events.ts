/**
 * 제품 이벤트 이름 사전.
 * 자동 수집 이벤트는 `$` 접두사(types.ts), 제품 이벤트는 접두사 없이 도메인_동작 순서로 적는다.
 * 퍼널 분석이 목적이므로 "시작 → 시도 → 성공/실패"를 한 세트로 유지한다.
 */
export const BOARD_EVENT = {
  COMPOSER_OPENED: 'board_composer_opened',
  COMPOSER_CLOSED: 'board_composer_closed',
  COMPOSER_CATEGORY_SELECTED: 'board_composer_category_selected',
  COMPOSER_IMAGE_ATTACHED: 'board_composer_image_attached',
  NOTE_SUBMIT_ATTEMPTED: 'board_note_submit_attempted',
  NOTE_SUBMIT_BLOCKED: 'board_note_submit_blocked',
  NOTE_CREATED: 'board_note_created',
  NOTE_CREATE_FAILED: 'board_note_create_failed',
  NOTE_UPDATED: 'board_note_updated',
  NOTE_DELETED: 'board_note_deleted',
  NOTE_LIKED: 'board_note_liked',
  NOTE_COMMENT_CREATED: 'board_note_comment_created',
  SEARCH_SUBMITTED: 'board_search_submitted',
} as const

export type BoardEvent = (typeof BOARD_EVENT)[keyof typeof BOARD_EVENT]

/** 타운홀 모드는 클릭 위주라 data-log-event 선언형으로 남긴다 */
export const TOWNHALL_EVENT = {
  OPENED: 'townhall_opened',
  RANDOM_DRAWN: 'townhall_random_drawn',
  NOTE_DISCUSSED: 'townhall_note_discussed',
} as const

export type TownHallEvent = (typeof TOWNHALL_EVENT)[keyof typeof TOWNHALL_EVENT]
