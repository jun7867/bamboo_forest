import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { BambooIllustration } from '../components/landing/BambooIllustration'
import { APP_VERSION_LABEL } from '../config/appVersion'
import { RELEASE_NOTES } from '../config/releaseNotes'

const Page = styled.main`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1rem 0.85rem 1.2rem;
    align-items: stretch;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 1.25rem;
    padding: 1.15rem 1rem 1.25rem;
    border-radius: ${({ theme }) => theme.radii.xl};
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 2.1rem;
    line-height: 1.04;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 0.95rem;
    line-height: 1.7;
  }
`

const VersionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    justify-content: center;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: grid;
    gap: 0.55rem;
  }
`

const VersionText = styled(Description)`
  max-width: none;
`

const PatchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.6rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.86);
  color: ${({ theme }) => theme.colors.textStrong};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  font-size: 0.92rem;
  font-weight: 700;
`

const PatchIcon = styled.svg`
  width: 1.2rem;
  height: 1.2rem;
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
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(87, 117, 66, 0.14);
  background: rgba(255, 255, 255, 0.72);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.95rem;
  font-weight: 600;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: center;
    font-size: 0.9rem;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    min-height: 3.15rem;
  }
`

const VisualBlock = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-width: 18rem;
    margin: 0 auto;
  }
`

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  background: rgba(41, 54, 39, 0.34);
  backdrop-filter: blur(10px);
`

const PatchDialog = styled(motion.div)`
  width: min(34rem, 100%);
  max-height: min(42rem, calc(100dvh - 2rem));
  overflow-y: auto;
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(249, 246, 238, 0.98));
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1rem;
    max-height: calc(100dvh - 1.2rem);
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const PatchHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  h2 {
    margin: 0 0 0.25rem;
    font-family: ${({ theme }) => theme.fonts.heading};
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.75rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.6;
  }
`

const CloseButton = styled.button`
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.15rem;
`

const PatchList = styled.ul`
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.75rem;
  color: ${({ theme }) => theme.colors.textStrong};
  line-height: 1.7;
`

export function LandingPage() {
  const [isPatchOpen, setIsPatchOpen] = useState(false)

  return (
    <Page>
      <HeroCard>
        <CopyBlock
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <Eyebrow>뉴 채용혁신개발팀! 대나무숲!</Eyebrow>
          <Title>
            말하기 어려운 마음도
            <br />
            편하게 남기는 곳
            <br />
          
          </Title>
          <div style={{ fontSize: '60px', fontWeight: '700' }}>(제작자 남준영)</div>
          <VersionRow>
            <VersionText>제작자 남준영 v.{APP_VERSION_LABEL}</VersionText>
            <PatchButton
              type="button"
              aria-label="패치 노트 보기"
              title="패치 노트 보기"
              onClick={() => setIsPatchOpen(true)}
            >
              <PatchIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
                <circle cx="12" cy="12" r="8" opacity="0.18" />
              </PatchIcon>
              <span>패치노트</span>
            </PatchButton>
          </VersionRow>
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

      <AnimatePresence>
        {isPatchOpen ? (
          <Backdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPatchOpen(false)}
          >
            <PatchDialog
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <PatchHeader>
                <div>
                  <h2>패치 노트</h2>
                  <p>v.{APP_VERSION_LABEL}까지 반영된 주요 개발 항목이에요.</p>
                </div>

                <CloseButton type="button" onClick={() => setIsPatchOpen(false)} aria-label="닫기">
                  ×
                </CloseButton>
              </PatchHeader>

              <PatchList>
                {RELEASE_NOTES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </PatchList>
            </PatchDialog>
          </Backdrop>
        ) : null}
      </AnimatePresence>
    </Page>
  )
}
