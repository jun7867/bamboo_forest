import { motion } from 'framer-motion'
import styled from 'styled-components'

const CONFETTI_COLORS = ['#F8D75E', '#F58D7A', '#79AF63', '#86C2F2', '#C7A6F0', '#FFB454', '#F7B7C5']

// 렌더 중 난수를 만들지 않도록 조각 배치는 모듈 로드 때 한 번만 정한다
const PIECES = Array.from({ length: 56 }, (_, index) => ({
  id: index,
  left: Math.random() * 100,
  delay: Math.random() * 0.35,
  duration: 1.9 + Math.random() * 1.4,
  drift: (Math.random() - 0.5) * 220,
  rotate: 360 + Math.random() * 720,
  size: 7 + Math.random() * 8,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  isRound: index % 3 === 0,
}))

const Layer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`

const Piece = styled(motion.span)<{ $color: string; $size: number; $round: boolean }>`
  position: absolute;
  top: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size, $round }) => ($round ? $size : $size * 0.45)}px;
  border-radius: ${({ $round }) => ($round ? '999px' : '2px')};
  background: ${({ $color }) => $color};
`

export function ConfettiBurst() {
  return (
    <Layer aria-hidden="true">
      {PIECES.map((piece) => (
        <Piece
          key={piece.id}
          $color={piece.color}
          $size={piece.size}
          $round={piece.isRound}
          style={{ left: `${piece.left}%` }}
          initial={{ y: '-8vh', x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '108vh', x: piece.drift, rotate: piece.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </Layer>
  )
}
