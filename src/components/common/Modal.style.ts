import styled from 'styled-components'

export const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.1rem;
`

export const ModalTitle = styled.div`
  display: grid;
  gap: 0.3rem;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.7rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.92rem;
    line-height: 1.6;
  }
`

export const ModalCloseButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.85);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.1rem;

  &:hover {
    background: #ffffff;
  }
`
