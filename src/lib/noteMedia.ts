const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 10 * 1024 * 1024

const VIDEO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const VIDEO_URL_PATTERN = /\.(mp4|webm)$/i

export const NOTE_MEDIA_ACCEPT = ['image/*', ...Object.keys(VIDEO_EXTENSION_BY_MIME_TYPE)].join(',')

export function getVideoExtension(file: File) {
  return VIDEO_EXTENSION_BY_MIME_TYPE[file.type] ?? null
}

export function isVideoFile(file: File) {
  return getVideoExtension(file) !== null
}

export function isNoteMediaFile(file: File) {
  return file.type.startsWith('image/') || isVideoFile(file)
}

// 업로드 경로가 `uuid.확장자`라 저장된 URL의 확장자만으로 영상 여부를 판단한다
export function isVideoUrl(url: string) {
  try {
    return VIDEO_URL_PATTERN.test(new URL(url).pathname)
  } catch {
    return false
  }
}

export function getNoteMediaSizeError(file: File) {
  if (isVideoFile(file)) {
    return file.size > MAX_VIDEO_BYTES ? '영상은 10MB 이하만 올릴 수 있어요.' : null
  }

  if (file.size <= MAX_IMAGE_BYTES) {
    return null
  }

  // GIF는 자동 축소가 안 돼서, 큰 움짤은 MP4로 바꿔 올리도록 안내한다
  return file.type === 'image/gif'
    ? 'GIF는 5MB 이하만 올릴 수 있어요. MP4로 변환하면 용량이 크게 줄어요.'
    : '사진은 5MB 이하만 올릴 수 있어요.'
}
