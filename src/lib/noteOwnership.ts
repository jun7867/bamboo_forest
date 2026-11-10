const STORAGE_KEY = 'bamboo-owned-note-secrets'

// 비밀번호 없이 쓴 포스트잇은 이 기기에 저장한 비밀값으로 본인 확인을 대신한다
function readSecrets(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? { ...parsed } : {}
  } catch {
    return {}
  }
}

function writeSecrets(secrets: Record<string, string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(secrets))
  } catch {
    // 저장소를 못 쓰면 다음 수정 때 비밀번호를 묻는 기존 흐름으로 돌아간다
  }
}

export function createNoteSecret() {
  return crypto.randomUUID()
}

export function getOwnedNoteSecret(noteId: string) {
  const secret = readSecrets()[noteId]
  return typeof secret === 'string' ? secret : null
}

export function rememberOwnedNote(noteId: string, secret: string) {
  writeSecrets({ ...readSecrets(), [noteId]: secret })
}

export function forgetOwnedNote(noteId: string) {
  const secrets = readSecrets()

  if (!(noteId in secrets)) {
    return
  }

  delete secrets[noteId]
  writeSecrets(secrets)
}
