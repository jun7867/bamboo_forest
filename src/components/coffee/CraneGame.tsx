import { motion } from 'framer-motion'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { getCraneFrame } from '../../lib/craneGame'
import type { CraneCup, CranePlan, CupPose } from '../../lib/craneGame'

interface CraneGameProps {
  plan: CranePlan
  label: string
  // 이름 공개 때 컵에 함께 적는 역할(예: ☕ 쏘는 사람)
  roleLabel: string
  onFinish: () => void
}

const LIGHT_COUNT = 11

// 좌표 1단위 = 케이스 폭의 1%라서 cqw로 그대로 옮긴다
function unit(value: number) {
  return `${value}cqw`
}

const glow = keyframes`
  from { opacity: 0.45; }
  to { opacity: 1; }
`

const Wrap = styled.div`
  display: grid;
  gap: 0.45rem;
  min-width: 0;
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.2rem 0.8rem;

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.15rem;
    font-weight: 400;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
    font-weight: 700;
  }
`

const Machine = styled.div`
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0.45rem 0.45rem 0.55rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(180deg, #35513a 0%, #243625 100%);
  box-shadow:
    0 14px 26px rgba(36, 54, 37, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
`

const Lights = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem 0.4rem;
`

const Light = styled.span<{ $delay: number }>`
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: #ffd98a;
  box-shadow: 0 0 6px rgba(255, 196, 92, 0.8);
  animation: ${glow} 1.4s ease-in-out ${({ $delay }) => $delay}s infinite alternate;
`

// ::after는 유리에 비친 빛이라 컵·집게보다 위에 얹는다
const Stage = styled.div`
  position: relative;
  container-type: inline-size;
  overflow: hidden;
  border-radius: 0.7rem;
  border: 2px solid rgba(200, 214, 196, 0.55);
  background: linear-gradient(180deg, #eef6e8 0%, #dcebd2 100%);
  box-shadow: inset 0 0 22px rgba(255, 214, 120, 0.28);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 80;
    pointer-events: none;
    background: linear-gradient(
      115deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.32) 38%,
      rgba(255, 255, 255, 0) 46%
    );
  }
`

const Floor = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #cfe2c3 0%, #bdd5b0 100%);
`

const Rail = styled.div`
  position: absolute;
  left: 2cqw;
  right: 2cqw;
  height: 1.4cqw;
  min-height: 4px;
  z-index: 55;
  border-radius: 999px;
  background: linear-gradient(180deg, #eef2ec 0%, #a7b3a5 60%, #7f8d7e 100%);
`

const metal = 'linear-gradient(90deg, #8d9a8c 0%, #e8ede6 45%, #8d9a8c 100%)'

const Carriage = styled.div`
  position: absolute;
  z-index: 56;
  border-radius: 0.3rem;
  background: ${metal};
  box-shadow: 0 1px 2px rgba(36, 54, 37, 0.3);
`

const Rope = styled.div`
  position: absolute;
  z-index: 60;
  width: 0.5cqw;
  min-width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #6f7d6e, #c9d2c7, #6f7d6e);
`

const Claw = styled.div`
  position: absolute;
  z-index: 60;
  pointer-events: none;
`

const Hub = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  border-radius: 0.35rem 0.35rem 0.5rem 0.5rem;
  background: ${metal};
  box-shadow: 0 2px 3px rgba(36, 54, 37, 0.3);
`

// ::after로 끝을 안쪽으로 살짝 꺾어 집게 모양을 낸다
const Finger = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  transform-origin: 50% 0;
  border-radius: 999px 999px 0.3rem 0.3rem;
  background: ${metal};

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    ${({ $side }) => ($side === 'left' ? 'left: 50%;' : 'right: 50%;')}
    width: 160%;
    height: 22%;
    border-radius: 999px;
    background: #8d9a8c;
  }
`

const ChuteHole = styled.div`
  position: absolute;
  z-index: 5;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #1c2a1d 0%, #2f4730 100%);
`

const ChuteFront = styled.div`
  position: absolute;
  bottom: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  border-radius: 0.4rem 0.4rem 0 0;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: linear-gradient(180deg, rgba(122, 175, 113, 0.75) 0%, rgba(72, 112, 68, 0.9) 100%);
  color: #fff6d8;
  font-size: clamp(9px, 2.4cqw, 13px);
  font-weight: 800;
  letter-spacing: 0.08em;
`

const CupBox = styled.div`
  position: absolute;
  transform-origin: 50% 60%;
`

const CupLid = styled.div`
  position: absolute;
  left: -5%;
  right: -5%;
  top: 0;
  height: 16%;
  border-radius: 0.3rem 0.3rem 0.15rem 0.15rem;
  background: linear-gradient(180deg, #fbf7ee 0%, #e2d8c4 100%);
  box-shadow: 0 1px 1px rgba(36, 54, 37, 0.25);
`

const CupBody = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 14%;
  bottom: 0;
  clip-path: polygon(3% 0, 97% 0, 85% 100%, 15% 100%);
  background: linear-gradient(90deg, #f1eadb 0%, #fffdf7 40%, #e9e0cc 100%);
`

const CupSleeve = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 22%;
  height: 40%;
  display: grid;
  place-items: center;
  padding: 0 11%;
`

const CupName = styled.span`
  max-width: 100%;
  overflow: hidden;
  color: #ffffff;
  font-weight: 800;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
`

const RevealLayer = styled(motion.div)`
  position: absolute;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: rgba(36, 54, 37, 0.3);
`

const RevealCup = styled(motion.div)`
  position: relative;
  width: 40cqw;
  max-width: 220px;
  aspect-ratio: 1 / 1.25;
  filter: drop-shadow(0 10px 18px rgba(36, 54, 37, 0.35));
`

const RevealText = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.2rem;
  padding: 0 14%;
  text-align: center;

  span {
    color: #fff6d8;
    font-size: clamp(10px, 2.6cqw, 14px);
    font-weight: 800;
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    color: #ffffff;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(16px, 5.4cqw, 30px);
    font-weight: 400;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  }
`

function Cup({
  cup,
  pose,
  width,
  height,
  zIndex,
}: {
  cup: CraneCup
  pose: CupPose
  width: number
  height: number
  zIndex: number
}) {
  return (
    <CupBox
      title={cup.name}
      style={{
        left: unit(pose.x - width / 2),
        top: unit(pose.y),
        width: unit(width),
        height: unit(height),
        transform: `rotate(${pose.rotate}deg)`,
        zIndex,
      }}
    >
      <CupBody>
        <CupSleeve style={{ background: cup.color }}>
          <CupName style={{ fontSize: `clamp(9px, ${(width * 0.24).toFixed(2)}cqw, 15px)` }}>{cup.name}</CupName>
        </CupSleeve>
      </CupBody>
      <CupLid />
    </CupBox>
  )
}

export function CraneGame({ plan, label, roleLabel, onFinish }: CraneGameProps) {
  // 부모가 같은 판으로 경로를 다시 만들어도(재조회 등) 연출이 처음부터 다시 시작하지 않게 시작 시각을 따로 둔다
  const startedAtRef = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const handleFinish = useEffectEvent(onFinish)

  useEffect(() => {
    let frameId = 0

    function tick(now: number) {
      startedAtRef.current ??= now
      const time = now - startedAtRef.current

      setElapsed(Math.min(time, plan.duration))

      if (time >= plan.duration) {
        if (!finishedRef.current) {
          finishedRef.current = true
          handleFinish()
        }
        return
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(frameId)
  }, [plan])

  const { layout } = plan
  const frame = getCraneFrame(plan, elapsed)
  const { cupWidth, cupHeight } = layout
  const target = layout.cups.find((cup) => cup.id === plan.targetId)
  const hubHeight = Math.max(2.2, cupWidth * 0.26)
  const clawWidth = cupWidth * 1.3
  const fingerLength = cupHeight * 0.55
  const fingerWidth = Math.max(1, cupWidth * 0.11)
  const pivot = cupWidth * 0.55
  // 활짝 벌리면 30도, 오므리면 손끝이 컵 옆면에 닿게 안쪽으로 8도
  const fingerAngle = 30 - 38 * frame.grip
  const clawTop = frame.clawY - hubHeight
  const chute = layout.chute

  return (
    <Wrap>
      <Head>
        <strong>{label}</strong>
      </Head>
      <Machine>
        <Lights aria-hidden="true">
          {Array.from({ length: LIGHT_COUNT }, (_, index) => (
            <Light key={index} $delay={(index % 3) * 0.45} />
          ))}
        </Lights>
        <Stage
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
          role="img"
          aria-label={label}
        >
          <Floor style={{ top: unit(layout.floorY - 1) }} />
          <ChuteHole
            style={{
              left: unit(chute.left),
              top: unit(chute.topY - 1.4),
              width: unit(chute.right - chute.left),
              height: unit(2.8),
            }}
          />

          {layout.cups.map((cup) => {
            if (cup.id === plan.targetId) {
              return null
            }

            const returning = cup.id === plan.returningId ? frame.returning : null

            return (
              <Cup
                key={cup.id}
                cup={cup}
                pose={returning ?? cup.slot}
                width={cupWidth}
                height={cupHeight}
                zIndex={returning ? 50 : 10 + cup.row}
              />
            )
          })}

          {target ? (
            <Cup
              cup={target}
              pose={target.id === plan.returningId && frame.returning ? frame.returning : frame.target}
              width={cupWidth}
              height={cupHeight}
              zIndex={frame.target.onTop || frame.returning ? 50 : 10 + target.row}
            />
          ) : null}

          <ChuteFront
            style={{
              left: unit(chute.left),
              top: unit(chute.topY),
              width: unit(chute.right - chute.left),
            }}
          >
            출구
          </ChuteFront>

          <Rail style={{ top: unit(layout.railY - 0.7) }} />
          <Carriage
            style={{
              left: unit(frame.clawX - cupWidth * 0.45),
              top: unit(layout.railY - 1.2),
              width: unit(cupWidth * 0.9),
              height: unit(2.4),
            }}
          />
          <Rope style={{ left: unit(frame.clawX), top: unit(layout.railY), height: unit(clawTop - layout.railY) }} />
          <Claw
            style={{
              left: unit(frame.clawX - clawWidth / 2),
              top: unit(clawTop),
              width: unit(clawWidth),
              height: unit(hubHeight + fingerLength),
            }}
          >
            <Finger
              $side="left"
              style={{
                left: unit(clawWidth / 2 - pivot - fingerWidth / 2),
                top: unit(hubHeight * 0.7),
                width: unit(fingerWidth),
                height: unit(fingerLength),
                transform: `rotate(${fingerAngle}deg)`,
              }}
            />
            <Finger
              $side="right"
              style={{
                left: unit(clawWidth / 2 + pivot - fingerWidth / 2),
                top: unit(hubHeight * 0.7),
                width: unit(fingerWidth),
                height: unit(fingerLength),
                transform: `rotate(${-fingerAngle}deg)`,
              }}
            />
            <Hub style={{ height: unit(hubHeight) }} />
          </Claw>

          {frame.isRevealing && target ? (
            <RevealLayer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <RevealCup
                title={target.name}
                initial={{ scale: 0.3, y: '35%' }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15 }}
              >
                <CupBody>
                  <CupSleeve style={{ background: target.color, top: '18%', height: '52%' }} />
                </CupBody>
                <CupLid />
                <RevealText>
                  <span>{roleLabel}</span>
                  <strong>{target.name}</strong>
                </RevealText>
              </RevealCup>
            </RevealLayer>
          ) : null}
        </Stage>
      </Machine>
    </Wrap>
  )
}
