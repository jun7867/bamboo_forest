const MAX_DIMENSION = 2048
const RESIZE_THRESHOLD_BYTES = 1.5 * 1024 * 1024
const OUTPUT_QUALITY = 0.86

// 휴대폰 원본 사진은 업로드 제한(5MB)을 쉽게 넘어서, 올리기 전에 크기를 줄인다
export async function shrinkImageFile(file: File) {
  if (
    file.size <= RESIZE_THRESHOLD_BYTES ||
    file.type === 'image/gif' ||
    typeof createImageBitmap !== 'function'
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = width
    canvas.height = height

    if (!context) {
      bitmap.close()
      return file
    }

    // 투명 PNG를 JPEG로 바꿀 때 배경이 검게 나오지 않도록 흰 바탕을 깐다
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY)
    })

    if (!blob || blob.size >= file.size) {
      return file
    }

    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, {
      type: 'image/jpeg',
    })
  } catch {
    return file
  }
}
