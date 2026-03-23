import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { BOARD_CATEGORY_META, BOARD_CATEGORY_ORDER } from '../constants/board'

const Page = styled.main`
  min-height: 100dvh;
  padding: 2rem 1.5rem 2.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.25rem 1rem 2rem;
  }
`

const Shell = styled.div`
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1.25rem;
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.gradients.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    padding: 1.2rem;
  }
`

const TitleBlock = styled.div`
  display: grid;
  gap: 0.45rem;
`

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`

const PageTitle = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.05;
  color: ${({ theme }) => theme.colors.textStrong};
`

const PageDescription = styled.p`
  margin: 0;
  max-width: 40rem;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.7;
`

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
`

const NavButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.76);
  color: ${({ theme }) => theme.colors.textStrong};
  text-decoration: none;
  font-weight: 600;
`

const InfoPill = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primaryDeep};
  font-size: 0.95rem;
  font-weight: 700;
`

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`

const CategoryCard = styled(motion.article)<{ $softAccent: string }>`
  min-height: 16rem;
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(87, 117, 66, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 251, 243, 0.92)),
    ${({ $softAccent }) => $softAccent};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: auto -2rem -2.5rem auto;
    width: 8rem;
    height: 8rem;
    border-radius: 999px;
    background: ${({ $softAccent }) => $softAccent};
    filter: blur(8px);
  }

  h2 {
    margin: 0 0 0.55rem;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.7rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    max-width: 24rem;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.65;
  }
`

const AccentBar = styled.div<{ $accent: string }>`
  width: 5.25rem;
  height: 0.45rem;
  margin-bottom: 1.05rem;
  border-radius: 999px;
  background: ${({ $accent }) => $accent};
`

const PlaceholderNote = styled.div`
  margin-top: 1.4rem;
  padding: 1rem 1.05rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.62);
  color: ${({ theme }) => theme.colors.textSubtle};
  line-height: 1.65;
`

const BottomRow = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
  gap: 1.1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`

const PlaceholderPanel = styled.div`
  padding: 1.4rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.gradients.surface};
  box-shadow: ${({ theme }) => theme.shadows.soft};
`

const PanelTitle = styled.h3`
  margin: 0 0 0.55rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.45rem;
  color: ${({ theme }) => theme.colors.textStrong};
`

const PanelText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.7;
`

export function BoardPage() {
  return (
    <Page>
      <Shell>
        <Header>
          <TitleBlock>
            <Eyebrow>채용혁신 개발팀 전용 보드 준비 중</Eyebrow>
            <PageTitle>대나무숲 메인 보드</PageTitle>
            <PageDescription>
              2단계에서 이 공간이 포스트잇 드래그 앤 드롭 보드로 확장됩니다. 지금은
              카테고리 레이아웃과 반응형 셸을 먼저 맞춰둔 상태예요.
            </PageDescription>
          </TitleBlock>

          <HeaderActions>
            <InfoPill>다음 단계: 포스트잇 보드 UI</InfoPill>
            <NavButton to="/">랜딩으로 돌아가기</NavButton>
          </HeaderActions>
        </Header>

        <Grid>
          {BOARD_CATEGORY_ORDER.map((category, index) => {
            const meta = BOARD_CATEGORY_META[category]

            return (
              <CategoryCard
                key={category}
                $softAccent={meta.softAccent}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <AccentBar $accent={meta.accent} />
                <h2>{meta.label}</h2>
                <p>{meta.description}</p>
                <PlaceholderNote>
                  곧 여기에 포스트잇 카드와 카테고리별 드롭 영역이 연결됩니다.
                </PlaceholderNote>
              </CategoryCard>
            )
          })}
        </Grid>

        <BottomRow>
          <PlaceholderPanel>
            <PanelTitle>운영 메모</PanelTitle>
            <PanelText>
              3단계에서 Supabase를 붙여 익명 의견이 저장되고, 비밀번호 검증으로 수정과
              삭제가 가능해질 예정입니다.
            </PanelText>
          </PlaceholderPanel>

          <PlaceholderPanel>
            <PanelTitle>실시간 채팅 자리</PanelTitle>
            <PanelText>
              4단계에서 우측 하단 팝업형 채팅 패널과 Realtime 구독 로직이 이 영역을
              기준으로 추가됩니다.
            </PanelText>
          </PlaceholderPanel>
        </BottomRow>
      </Shell>
    </Page>
  )
}
