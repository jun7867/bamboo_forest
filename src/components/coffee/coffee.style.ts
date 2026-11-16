import styled from 'styled-components'

export const Card = styled.section`
  display: grid;
  gap: 0.9rem;
  align-content: start;
  min-width: 0;
  padding: 1.25rem 1.3rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.gradients.surface};
  box-shadow: ${({ theme }) => theme.shadows.soft};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

export const CardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem 0.8rem;
`

export const CardTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.35rem;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textStrong};
`

export const CardMeta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.88rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 800;
  }
`

export const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.86rem;
  line-height: 1.6;
`

export const StatusMessage = styled.p<{ $tone: 'success' | 'error' }>`
  margin: 0;
  color: ${({ $tone, theme }) => ($tone === 'error' ? theme.colors.danger : theme.colors.primaryDeep)};
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.55;
`

export const EmptyText = styled.p`
  margin: 0;
  padding: 1rem 0.5rem;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: 0.9rem;
  text-align: center;
`

const baseButton = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.9rem;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  font-weight: 800;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const PrimaryButton = styled.button`
  ${baseButton}
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  box-shadow: 0 14px 26px rgba(78, 141, 84, 0.22);
`

export const DarkButton = styled.button`
  ${baseButton}
  background: #243625;
  color: #fff6d8;
  box-shadow: 0 12px 24px rgba(36, 54, 37, 0.22);

  &:hover:not(:disabled) {
    background: #2f4730;
  }
`

export const SecondaryButton = styled.button`
  ${baseButton}
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
`

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    > button {
      flex: 1 1 auto;
    }
  }
`
