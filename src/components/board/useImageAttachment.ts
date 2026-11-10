import { useEffect, useRef, useState } from 'react'
import { uploadBoardNoteImage } from '../../lib/boardNotes'
import { shrinkImageFile } from '../../lib/imageResize'
import { getNoteMediaSizeError, isNoteMediaFile, isVideoFile, isVideoUrl } from '../../lib/noteMedia'

interface ImageAttachmentOptions {
  initialUrl?: string | null
  shouldUpload: boolean
}

// 사진 선택 → 미리보기 → 저장 시 업로드까지. 미리보기용 blob URL 정리도 여기서 맡는다
export function useImageAttachment({ initialUrl = null, shouldUpload }: ImageAttachmentOptions) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createdUrlsRef = useRef(new Set<string>())
  const handedOffUrlRef = useRef<string | null>(null)
  // 저장이 실패해 다시 시도해도 같은 사진을 또 올리지 않도록 업로드 결과를 기억한다
  const uploadedRef = useRef<{ file: File; url: string } | null>(null)

  useEffect(() => {
    const createdUrls = createdUrlsRef.current

    return () => {
      // 이 훅이 만든 미리보기만 정리한다. 기존 포스트잇 사진이나 넘겨준 데모 사진은 계속 보여야 한다
      if (previewUrl && createdUrls.has(previewUrl) && previewUrl !== handedOffUrlRef.current) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function select(nextFile: File) {
    if (!isNoteMediaFile(nextFile)) {
      setError('사진이나 MP4·WebM 영상만 붙일 수 있어요.')
      return null
    }

    setError(null)
    setIsPreparing(true)

    const preparedFile = isVideoFile(nextFile) ? nextFile : await shrinkImageFile(nextFile)

    setIsPreparing(false)

    const sizeError = getNoteMediaSizeError(preparedFile)

    if (sizeError) {
      setError(sizeError)
      return null
    }

    // FileReader 대신 objectURL 사용 — 일부 브라우저 보안정책이 파일 바이트 읽기를 막아도 미리보기는 동작한다.
    const nextPreviewUrl = URL.createObjectURL(preparedFile)

    createdUrlsRef.current.add(nextPreviewUrl)
    setFile(preparedFile)
    setPreviewUrl(nextPreviewUrl)

    return preparedFile
  }

  function remove() {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  async function resolveImageUrl() {
    if (!file) {
      return previewUrl
    }

    if (shouldUpload) {
      if (uploadedRef.current?.file === file) {
        return uploadedRef.current.url
      }

      const url = await uploadBoardNoteImage(file)
      uploadedRef.current = { file, url }
      return url
    }

    // 데모 모드는 Storage가 없어 임시 objectURL을 그대로 쓴다(메모리 한정).
    handedOffUrlRef.current = previewUrl
    return previewUrl
  }

  // 새로 고른 파일의 미리보기는 blob URL이라 확장자가 없어서 파일 타입으로 판단한다
  const isVideo = file ? isVideoFile(file) : previewUrl !== null && isVideoUrl(previewUrl)

  return { file, previewUrl, isVideo, isPreparing, error, select, remove, resolveImageUrl }
}
