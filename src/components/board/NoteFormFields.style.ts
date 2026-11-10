import styled from 'styled-components'

export const FieldLabel = styled.span`
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.9rem;
  font-weight: 700;
`

export const FieldHint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.84rem;
  line-height: 1.55;
`

export const FieldError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.55;
`

export const TextField = styled.input`
  width: 100%;
  min-height: 2.9rem;
  padding: 0 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.32);
    outline-offset: 2px;
  }
`

export const TextAreaField = styled.textarea`
  width: 100%;
  min-height: 8.5rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.94);
  color: ${({ theme }) => theme.colors.textStrong};
  resize: vertical;
  line-height: 1.7;

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.32);
    outline-offset: 2px;
  }
`
