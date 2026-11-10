export const CONTENT_ENCODING = {
  GZIP: 'gzip',
  NONE: 'none',
} as const

export type ContentEncoding = (typeof CONTENT_ENCODING)[keyof typeof CONTENT_ENCODING]

/** CompressionStream 미지원 환경에서는 압축을 건너뛰고 encoding으로 사실을 남긴다 */
export async function gzipText(text: string) {
  if (typeof CompressionStream === 'undefined') {
    return {
      blob: new Blob([text], { type: 'application/json' }),
      encoding: CONTENT_ENCODING.NONE,
    }
  }

  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const blob = await new Response(stream).blob()

  return { blob, encoding: CONTENT_ENCODING.GZIP }
}

export async function gunzipToText(blob: Blob, encoding: ContentEncoding) {
  if (encoding !== CONTENT_ENCODING.GZIP) {
    return blob.text()
  }

  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))

  return new Response(stream).text()
}
