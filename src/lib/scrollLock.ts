let lockCount = 0
let originalOverflow = ''

// 모달이 겹쳐 열리고 닫혀도(퇴장 애니메이션 중 다음 모달이 열리는 경우 포함) 마지막 해제 때만 원래 값으로 돌린다
export function lockBodyScroll() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  lockCount += 1
  let isReleased = false

  return function unlockBodyScroll() {
    if (isReleased) {
      return
    }

    isReleased = true
    lockCount -= 1

    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow
    }
  }
}
