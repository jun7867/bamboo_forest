import styled, { keyframes } from 'styled-components'

const marqueeMove = keyframes`
  0% {
    transform: translateX(100%);
  }

  100% {
    transform: translateX(-100%);
  }
`

const Banner = styled.div`
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 120;
  height: 2.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: linear-gradient(90deg, rgba(36, 54, 37, 0.92), rgba(54, 93, 56, 0.94));
  box-shadow: 0 14px 28px rgba(41, 59, 39, 0.14);
  overflow: hidden;
  backdrop-filter: blur(10px);
`

const Track = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  white-space: nowrap;
`

const Message = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2rem;
  padding-right: 2rem;
  color: rgba(255, 251, 241, 0.96);
  font-size: 0.93rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  animation: ${marqueeMove} 18s linear infinite;

  span {
    opacity: 0.92;
  }

  strong {
    color: #fff6d8;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 0.84rem;
    animation-duration: 15s;
  }
`

export function TopMarqueeBanner() {
  return (
    <Banner aria-label="제작자 후원 안내">
      <Track>
        <Message>
          <span>(njy1213@midasin.com) 제작자에게 커피 한잔은 큰 힘이 됩니다.</span>
          <strong>뉴 채용혁신개발팀 대나무숲</strong>
        </Message>
        <Message aria-hidden="true">
          <span>(njy1213@midasin.com) 제작자에게 커피 한잔은 큰 힘이 됩니다.</span>
          <strong>뉴 채용혁신개발팀 대나무숲</strong>
        </Message>
      </Track>
    </Banner>
  )
}
