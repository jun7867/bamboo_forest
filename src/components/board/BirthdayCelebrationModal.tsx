import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styled, { keyframes } from 'styled-components'
import sangminPhoto from '../../assets/sangmin.jpg'
import { formatBirthdayDate, getNearestBirthday } from '../../lib/birthdays'

// 사진 에셋이 있는 사람만 매핑. 나머지는 이모지 폴백을 쓴다.
const PHOTO_BY_NAME: Record<string, string> = {
  이상민: sangminPhoto,
}

interface BirthdayCelebrationModalProps {
  onClose: () => void
}

const CONFETTI_COLORS = ['#F8D75E', '#F58D7A', '#79AF63', '#4E8D54', '#F7B7C5', '#86C2F2', '#C7A6F0']
const CONFETTI_EMOJIS = ['🎉', '🎊', '🎂', '🎈', '✨', '💐', '🥳', '🍰']
const BALLOON_COLORS = ['#F58D7A', '#F8D75E', '#86C2F2', '#C7A6F0', '#79AF63']
const POPS = ['🎉', '💖', '✨', '⭐', '🌟', '💫', '🥰', '🎂']

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  rotate: number
  color: string
  emoji?: string
  isEmoji: boolean
}

interface Balloon {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  scale: number
  swayDelay: number
}

interface Pop {
  id: number
  x: number
  y: number
  emoji: string
  drift: number
}

// 렌더 중에 난수를 만들면 리렌더마다 배치가 바뀔 수 있어 모듈 로드 시 한 번만 만든다
const CONFETTI: ConfettiPiece[] = Array.from({ length: 60 }, (_, i) => {
  const isEmoji = Math.random() < 0.35
  return {
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: isEmoji ? 18 + Math.random() * 14 : 6 + Math.random() * 8,
    rotate: Math.random() * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    emoji: isEmoji ? CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)] : undefined,
    isEmoji,
  }
})

const BALLOONS: Balloon[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 8 + Math.random() * 84,
  delay: Math.random() * 6,
  duration: 9 + Math.random() * 5,
  color: BALLOON_COLORS[i % BALLOON_COLORS.length],
  scale: 0.8 + Math.random() * 0.6,
  swayDelay: Math.random() * 2,
}))

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: radial-gradient(circle at top, rgba(80, 50, 30, 0.42), rgba(20, 30, 18, 0.6));
  backdrop-filter: blur(14px);
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.75rem;
  }
`

const ConfettiLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`

const fallAnim = keyframes`
  0% {
    transform: translate3d(0, -10vh, 0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translate3d(8vw, 110vh, 0) rotate(720deg);
    opacity: 0.85;
  }
`

const ConfettiDot = styled.span<{
  $left: number
  $delay: number
  $duration: number
  $size: number
  $rotate: number
  $color: string
}>`
  position: absolute;
  top: -10vh;
  left: ${({ $left }) => `${$left}%`};
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size * 1.4}px`};
  border-radius: 2px;
  background: ${({ $color }) => $color};
  transform-origin: center;
  animation: ${fallAnim} ${({ $duration }) => `${$duration}s`}
    ${({ $delay }) => `${$delay}s`} linear infinite;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.18));
`

const ConfettiEmoji = styled.span<{
  $left: number
  $delay: number
  $duration: number
  $size: number
}>`
  position: absolute;
  top: -10vh;
  left: ${({ $left }) => `${$left}%`};
  font-size: ${({ $size }) => `${$size}px`};
  animation: ${fallAnim} ${({ $duration }) => `${$duration}s`}
    ${({ $delay }) => `${$delay}s`} linear infinite;
`

const floatUp = keyframes`
  0% {
    transform: translate3d(0, 110vh, 0) scale(0.85);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translate3d(-4vw, -25vh, 0) scale(1);
    opacity: 0;
  }
`

const sway = keyframes`
  0%, 100% { margin-left: 0; }
  50% { margin-left: 18px; }
`

const BalloonWrap = styled.div<{
  $left: number
  $delay: number
  $duration: number
  $swayDelay: number
}>`
  position: absolute;
  bottom: -12vh;
  left: ${({ $left }) => `${$left}%`};
  animation: ${floatUp} ${({ $duration }) => `${$duration}s`}
    ${({ $delay }) => `${$delay}s`} linear infinite;
  pointer-events: none;

  & > div {
    animation: ${sway} 3.6s ${({ $swayDelay }) => `${$swayDelay}s`} ease-in-out infinite;
  }
`

const Balloon = styled.div<{ $color: string; $scale: number }>`
  width: ${({ $scale }) => `${48 * $scale}px`};
  height: ${({ $scale }) => `${60 * $scale}px`};
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 30%,
    rgba(255, 255, 255, 0.9),
    ${({ $color }) => $color} 60%,
    rgba(0, 0, 0, 0.18) 100%
  );
  position: relative;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 10px solid ${({ $color }) => $color};
  }

  &::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    width: 1.5px;
    height: 60px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
    transform: translateX(-50%);
  }
`

const popAnim = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  20% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--drift, 0px)), calc(-50% - 90px)) scale(0.7); opacity: 0; }
`

const PopEmoji = styled.span<{ $x: number; $y: number; $drift: number }>`
  position: absolute;
  left: ${({ $x }) => `${$x}px`};
  top: ${({ $y }) => `${$y}px`};
  font-size: 2rem;
  pointer-events: none;
  --drift: ${({ $drift }) => `${$drift}px`};
  animation: ${popAnim} 1.1s ease-out forwards;
`

const Card = styled(motion.div)`
  position: relative;
  width: min(28rem, 100%);
  padding: 1.6rem 1.4rem 1.8rem;
  border-radius: 1.75rem;
  background: linear-gradient(180deg, #fff7ec 0%, #ffe5d3 100%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 30px 70px rgba(28, 18, 10, 0.45), 0 0 0 4px rgba(248, 215, 94, 0.25) inset;
  text-align: center;
  overflow: visible;
  cursor: pointer;
  user-select: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.2rem 1rem 1.4rem;
    border-radius: 1.4rem;
  }
`

const TopBadge = styled.div`
  position: absolute;
  top: -1rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.4rem 0.95rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffb454 0%, #ff7a59 100%);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 18px rgba(255, 122, 89, 0.35);
  white-space: nowrap;
`

const PhotoFrame = styled(motion.div)`
  position: relative;
  width: 12rem;
  height: 12rem;
  margin: 1rem auto 1.1rem;
  border-radius: 50%;
  overflow: hidden;
  border: 5px solid #fff;
  box-shadow: 0 14px 30px rgba(40, 25, 10, 0.32);
  background: #fff;

  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px dashed rgba(255, 184, 64, 0.6);
    pointer-events: none;
    animation: spin 18s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 10rem;
    height: 10rem;
  }
`

const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const PhotoFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4.5rem;
  background: linear-gradient(135deg, #fff2d8 0%, #ffd9c2 100%);
`

const shimmer = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`

const Title = styled(motion.h2)`
  margin: 0.4rem 0 0.6rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.6rem, 4vw, 2.1rem);
  background: linear-gradient(90deg, #ff7a59, #ffb454, #f8d75e, #ff7a59);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${shimmer} 4s ease-in-out infinite;
  line-height: 1.25;
`

const Subtitle = styled.p`
  margin: 0 0 1rem;
  color: #6b4d2e;
  font-size: 1rem;
  font-weight: 600;
`

const Hint = styled.p`
  margin: 0.5rem 0 1rem;
  font-size: 0.85rem;
  color: #8a6c4a;
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 0.6rem;
`

const ActionButton = styled.button`
  min-height: 2.6rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 122, 89, 0.35);
  background: rgba(255, 255, 255, 0.85);
  color: #b3441f;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    background: #fff;
    transform: translateY(-2px);
  }
`

const PrimaryAction = styled(ActionButton)`
  background: linear-gradient(135deg, #ff7a59 0%, #ffb454 100%);
  color: #fff;
  border: none;
  box-shadow: 0 12px 22px rgba(255, 122, 89, 0.35);

  &:hover {
    background: linear-gradient(135deg, #ff8a6a 0%, #ffc266 100%);
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.9);
  color: #6b4d2e;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #fff;
  }
`

const CounterPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 184, 64, 0.4);
  font-size: 0.85rem;
  color: #8a4a1f;
  font-weight: 700;
  margin-bottom: 0.4rem;
`

const DdayPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.95rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff7a59 0%, #ffb454 100%);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 18px rgba(255, 122, 89, 0.3);
  margin-bottom: 0.6rem;

  span {
    font-size: 0.8rem;
    font-weight: 700;
    opacity: 0.92;
  }
`

export function BirthdayCelebrationModal({ onClose }: BirthdayCelebrationModalProps) {
  const [pops, setPops] = useState<Pop[]>([])
  const [cheers, setCheers] = useState(0)
  const popIdRef = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const birthday = useMemo(() => getNearestBirthday(), [])
  const displayName = birthday ? birthday.names.join(', ') : ''
  const isToday = birthday?.daysUntil === 0
  // 사진은 이름이 한 명이고 매핑된 에셋이 있을 때만 노출.
  const photoSrc =
    birthday && birthday.names.length === 1 ? PHOTO_BY_NAME[birthday.names[0]] : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const spawnPop = useCallback((clientX: number, clientY: number) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const id = ++popIdRef.current
    const emoji = POPS[Math.floor(Math.random() * POPS.length)]
    const drift = (Math.random() - 0.5) * 80
    setPops((prev) => [...prev, { id, x, y, emoji, drift }])
    setCheers((c) => c + 1)
    window.setTimeout(() => {
      setPops((prev) => prev.filter((p) => p.id !== id))
    }, 1100)
  }, [])

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      spawnPop(e.clientX, e.clientY)
    },
    [spawnPop],
  )

  const handleCheerBurst = useCallback(() => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    for (let i = 0; i < 12; i++) {
      const x = rect.left + Math.random() * rect.width
      const y = rect.top + Math.random() * rect.height
      window.setTimeout(() => spawnPop(x, y), i * 60)
    }
  }, [spawnPop])

  const handleSing = useCallback(() => {
    handleCheerBurst()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const line = isToday
          ? `${displayName}, 생일 축하합니다! 사랑해요!`
          : `${displayName}, 곧 생일이에요! 미리 축하해요!`
        const u = new SpeechSynthesisUtterance(line)
        u.lang = 'ko-KR'
        u.rate = 1
        u.pitch = 1.2
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
      } catch {
        /* noop */
      }
    }
  }, [handleCheerBurst, displayName, isToday])

  return (
    <Backdrop
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} 생일 축하 모달`}
    >
      <ConfettiLayer aria-hidden="true">
        {CONFETTI.map((c) =>
          c.isEmoji ? (
            <ConfettiEmoji
              key={c.id}
              $left={c.left}
              $delay={c.delay}
              $duration={c.duration}
              $size={c.size}
            >
              {c.emoji}
            </ConfettiEmoji>
          ) : (
            <ConfettiDot
              key={c.id}
              $left={c.left}
              $delay={c.delay}
              $duration={c.duration}
              $size={c.size}
              $rotate={c.rotate}
              $color={c.color}
            />
          ),
        )}
        {BALLOONS.map((b) => (
          <BalloonWrap
            key={b.id}
            $left={b.left}
            $delay={b.delay}
            $duration={b.duration}
            $swayDelay={b.swayDelay}
          >
            <Balloon $color={b.color} $scale={b.scale} />
          </BalloonWrap>
        ))}
      </ConfettiLayer>

      <Card
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        onClick={(e) => {
          e.stopPropagation()
          handleCardClick(e)
        }}
      >
        <TopBadge>오늘의 이벤트 🎂</TopBadge>
        <CloseButton
          type="button"
          aria-label="닫기"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ✕
        </CloseButton>

        <PhotoFrame
          animate={{ rotate: [0, -2, 2, -1.5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {photoSrc ? (
            <PhotoImage src={photoSrc} alt={displayName} draggable={false} />
          ) : (
            <PhotoFallback aria-hidden="true">🎂</PhotoFallback>
          )}
        </PhotoFrame>

        {birthday && (
          <DdayPill>
            {formatBirthdayDate(birthday.month, birthday.day)}
            <span>{isToday ? '오늘 🎉' : `D-${birthday.daysUntil}`}</span>
          </DdayPill>
        )}

        <CounterPill>
          🎉 축하 인사 <span>{cheers}</span>회
        </CounterPill>

        <Title
          initial={{ scale: 0.8 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isToday
            ? `🎂 오늘은 ${displayName}의 생일! 🎂`
            : `🎂 ${displayName} 생일까지 D-${birthday?.daysUntil} 🎂`}
        </Title>
        <Subtitle>
          {isToday
            ? '오래오래 행복하고, 늘 빛나는 한 해 되세요 💐'
            : `${birthday?.daysUntil}일 뒤예요! 미리 축하 준비해요 💐`}
        </Subtitle>
        <Hint>모달 어디든 톡톡 눌러서 축하 폭죽을 터뜨려 보세요 ✨</Hint>

        <ActionRow>
          <PrimaryAction
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleSing()
            }}
          >
            🎵 생일축하 노래 부르기
          </PrimaryAction>
          <ActionButton
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCheerBurst()
            }}
          >
            🎉 폭죽 터뜨리기
          </ActionButton>
        </ActionRow>

        <AnimatePresence>
          {pops.map((p) => (
            <PopEmoji key={p.id} $x={p.x} $y={p.y} $drift={p.drift}>
              {p.emoji}
            </PopEmoji>
          ))}
        </AnimatePresence>
      </Card>
    </Backdrop>
  )
}
