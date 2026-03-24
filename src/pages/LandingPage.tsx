import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { BambooIllustration } from '../components/landing/BambooIllustration'

const Page = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
`

const HeroCard = styled.section`
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
  align-items: center;
  gap: 2rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.hero};
  background: ${({ theme }) => theme.gradients.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
  position: relative;
  overflow: hidden;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  &::before {
    inset: auto auto -4.5rem -3rem;
    width: 13rem;
    height: 13rem;
    background: rgba(181, 215, 152, 0.22);
    filter: blur(10px);
  }

  &::after {
    inset: -4rem -2rem auto auto;
    width: 11rem;
    height: 11rem;
    background: rgba(255, 218, 160, 0.24);
    filter: blur(12px);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`

const CopyBlock = styled(motion.div)`
  display: grid;
  gap: 1rem;
`

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primaryDeep};
  font-size: 0.92rem;
  font-weight: 700;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin: 0 auto;
  }
`

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 44px;
  line-height: 0.98;
  color: ${({ theme }) => theme.colors.textStrong};
`

const Description = styled.p`
  margin: 0;
  max-width: 31rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1.05rem;
  line-height: 1.8;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    max-width: none;
  }
`

const HighlightRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    justify-content: center;
  }
`

const HighlightChip = styled.span`
  padding: 0.6rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(87, 117, 66, 0.14);
  background: rgba(255, 255, 255, 0.72);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.95rem;
  font-weight: 600;
`

const EnterButton = styled(motion(Link))`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 3.4rem;
  padding: 0.95rem 1.45rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 18px 28px rgba(74, 122, 71, 0.24);

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    margin: 0 auto;
  }
`

const VisualBlock = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
`

export function LandingPage() {
  return (
    <Page>
      <HeroCard>
        <CopyBlock
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <Eyebrow>채용혁신 개발팀! 대나무숲!</Eyebrow>
          <Title>
            말하기 어려운 마음도
            <br />
            편하게 남기는 곳
            <br />
          
          </Title>
          <div style={{fontSize: '60px', fontWeight: '700'}}>
          (제작자 남준영)
          </div>
          <Description>
            익명으로도, 이름을 적고도 팀의 의견을 모을 수 있는 대나무숲입니다.
            칭찬, 건의, 질문, 하고 싶은 말을 한 곳에서 자연스럽게 모으고 정리할 수
            있도록 준비했어요.
          </Description>

          <HighlightRow>
            <HighlightChip>익명 의견 수집</HighlightChip>
            <HighlightChip>카테고리 보드</HighlightChip>
            <HighlightChip>실시간 소통 확장 예정</HighlightChip>
          </HighlightRow>

          <EnterButton
            to="/board"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            대나무숲 입장하기
          </EnterButton>
        </CopyBlock>

        <VisualBlock
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
        >
          <BambooIllustration />
        </VisualBlock>
      </HeroCard>
    </Page>
  )
}
