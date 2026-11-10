import { isVideoUrl } from '../../lib/noteMedia'

interface NoteMediaProps {
  src: string
  alt: string
  isVideo?: boolean
  className?: string
}

// 영상 첨부는 GIF처럼 보이도록 소리 없이 자동 반복 재생한다
export function NoteMedia({ src, alt, isVideo, className }: NoteMediaProps) {
  if (isVideo ?? isVideoUrl(src)) {
    return (
      <video className={className} src={src} aria-label={alt} autoPlay loop muted playsInline />
    )
  }

  return <img className={className} src={src} alt={alt} loading="lazy" draggable={false} />
}
