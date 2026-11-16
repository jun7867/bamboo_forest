// 방문자 id(bamboo-board-visitor-id)는 좋아요 client_id로 공개되므로 커피 내기 본인 확인에는 따로 만든 비밀값을 쓴다
const DEVICE_SECRET_KEY = 'bamboo-coffee-device-secret'
const HOST_SECRETS_KEY = 'bamboo-coffee-host-secrets'
const NICKNAME_KEY = 'bamboo-coffee-nickname'

let memoryDeviceSecret: string | null = null

function getIdentityStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function createCoffeeSecret() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // http로 사내 IP에 접속하면 randomUUID가 없어서 같은 길이의 난수로 대신한다
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function getCoffeeDeviceSecret() {
  if (memoryDeviceSecret) {
    return memoryDeviceSecret
  }

  try {
    const saved = getIdentityStorage()?.getItem(DEVICE_SECRET_KEY)

    if (saved) {
      memoryDeviceSecret = saved
      return saved
    }
  } catch {
    // 저장소를 못 읽으면 새 비밀값으로 이 탭에서만 같은 사람으로 본다
  }

  const nextSecret = createCoffeeSecret()
  memoryDeviceSecret = nextSecret

  try {
    getIdentityStorage()?.setItem(DEVICE_SECRET_KEY, nextSecret)
  } catch {
    // 저장에 실패하면 새로고침 뒤에는 내 응답을 못 찾지만, 다시 내면 새 응답으로 들어간다
  }

  return nextSecret
}

// 서버의 hash_coffee_secret과 같은 sha256 hex. crypto.subtle이 없는 환경(http)에서는 null
export async function hashCoffeeSecret(secret: string) {
  if (!crypto.subtle) {
    return null
  }

  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

function readHostSecrets(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(getIdentityStorage()?.getItem(HOST_SECRETS_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? { ...parsed } : {}
  } catch {
    return {}
  }
}

export function getCoffeeHostSecret(roundId: string) {
  const secret = readHostSecrets()[roundId]
  return typeof secret === 'string' ? secret : null
}

export function getCoffeeHostRoundIds() {
  return Object.keys(readHostSecrets())
}

export function rememberCoffeeHostSecret(roundId: string, secret: string) {
  try {
    getIdentityStorage()?.setItem(
      HOST_SECRETS_KEY,
      JSON.stringify({ ...readHostSecrets(), [roundId]: secret }),
    )
  } catch {
    // 저장하지 못하면 이 기기에서도 관리자 비밀번호로만 마감할 수 있다
  }
}

export function readCoffeeNickname() {
  try {
    return getIdentityStorage()?.getItem(NICKNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveCoffeeNickname(nickname: string) {
  try {
    getIdentityStorage()?.setItem(NICKNAME_KEY, nickname)
  } catch {
    // 닉네임 기억은 편의 기능이라 실패해도 넘어간다
  }
}
