import { motion } from 'framer-motion'
import styled from 'styled-components'

const MotionWrap = styled(motion.div)`
  width: min(100%, 31rem);
  filter: drop-shadow(0 28px 34px rgba(88, 120, 72, 0.2));
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
`

const Leaf = styled(motion.path)`
  transform-box: fill-box;
  transform-origin: center;
`

export function BambooIllustration() {
  return (
    <MotionWrap
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <Svg viewBox="0 0 420 320" fill="none" role="img" aria-label="대나무숲 일러스트">
        <defs>
          <linearGradient id="bamboo-stalk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ED79A" />
            <stop offset="100%" stopColor="#5AA662" />
          </linearGradient>
          <linearGradient id="bamboo-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#BCE8A4" />
            <stop offset="100%" stopColor="#4E9654" />
          </linearGradient>
          <linearGradient id="sunset" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF8D8" />
            <stop offset="100%" stopColor="#FFE2B1" />
          </linearGradient>
        </defs>

        <circle cx="318" cy="68" r="44" fill="url(#sunset)" opacity="0.9" />
        <ellipse cx="210" cy="276" rx="150" ry="30" fill="#DDEBCF" />

        <g opacity="0.92">
          <rect x="88" y="64" width="34" height="184" rx="17" fill="url(#bamboo-stalk)" />
          <rect x="128" y="32" width="34" height="216" rx="17" fill="url(#bamboo-stalk)" />
          <rect x="188" y="56" width="34" height="192" rx="17" fill="url(#bamboo-stalk)" />
          <rect x="236" y="24" width="34" height="224" rx="17" fill="url(#bamboo-stalk)" />
          <rect x="290" y="76" width="34" height="172" rx="17" fill="url(#bamboo-stalk)" />
        </g>

        {[
          [88, 102, 34],
          [88, 156, 34],
          [128, 82, 34],
          [128, 144, 34],
          [128, 206, 34],
          [188, 110, 34],
          [188, 172, 34],
          [236, 74, 34],
          [236, 138, 34],
          [236, 202, 34],
          [290, 118, 34],
          [290, 178, 34],
        ].map(([x, y, width]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={width}
            height="7"
            rx="3.5"
            fill="#4E8D54"
            opacity="0.45"
          />
        ))}

        <g>
          <Leaf
            d="M110 114C84 92 62 90 42 106C67 110 84 121 100 138"
            fill="url(#bamboo-leaf)"
            animate={{ rotate: [-3, 2, -3], y: [0, -3, 0] }}
            transition={{
              duration: 6,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <Leaf
            d="M150 84C174 56 204 44 234 56C206 67 186 84 167 109"
            fill="url(#bamboo-leaf)"
            animate={{ rotate: [2, -3, 2], y: [0, 3, 0] }}
            transition={{
              duration: 5.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <Leaf
            d="M204 136C178 116 152 114 126 128C156 133 177 147 194 166"
            fill="url(#bamboo-leaf)"
            animate={{ rotate: [-2, 3, -2] }}
            transition={{
              duration: 5.8,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <Leaf
            d="M242 104C268 72 300 62 336 74C304 85 280 108 260 136"
            fill="url(#bamboo-leaf)"
            animate={{ rotate: [3, -2, 3], y: [0, 4, 0] }}
            transition={{
              duration: 6.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <Leaf
            d="M314 148C338 128 364 126 392 140C364 146 342 159 325 176"
            fill="url(#bamboo-leaf)"
            animate={{ rotate: [-2, 2, -2] }}
            transition={{
              duration: 5.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        </g>

        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        >
          <circle cx="212" cy="240" r="26" fill="#F8F3D6" />
          <ellipse cx="201" cy="236" rx="3.5" ry="4.5" fill="#30442C" />
          <ellipse cx="223" cy="236" rx="3.5" ry="4.5" fill="#30442C" />
          <path
            d="M204 248C208 252 216 252 220 248"
            stroke="#30442C"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M186 222C190 210 198 204 210 202C201 211 196 221 194 232"
            fill="#B9DFB0"
          />
          <path
            d="M238 222C234 210 226 204 214 202C223 211 228 221 230 232"
            fill="#B9DFB0"
          />
        </motion.g>
      </Svg>
    </MotionWrap>
  )
}
