import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
  POST_IT_COLOR_ORDER,
} from '../../constants/board'
import { NOTE_MEDIA_ACCEPT } from '../../lib/noteMedia'
import type { BoardCategory, PostItColor } from '../../types/board'
import { IconCheck, IconClose, IconImage } from '../common/Icons'
import { NoteMedia } from './NoteMedia'

const CounterText = styled.span<{ $warning: boolean }>`
  justify-self: end;
  color: ${({ $warning, theme }) => ($warning ? theme.colors.danger : theme.colors.textSubtle)};
  font-size: 0.8rem;
  font-weight: 600;
`

const CategoryGrid = styled.div<{ $compact: boolean }>`
  display: grid;
  grid-template-columns: repeat(${({ $compact }) => ($compact ? 4 : 2)}, minmax(0, 1fr));
  gap: 0.55rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const CategoryOption = styled.button<{ $active: boolean; $accent: string }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 0.6rem;
  row-gap: 0.1rem;
  min-height: 3.1rem;
  padding: 0.65rem 0.8rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1.5px solid
    ${({ $active, $accent, theme }) => ($active ? $accent : theme.colors.borderStrong)};
  background: ${({ $active, $accent }) =>
    $active ? `${$accent}26` : 'rgba(255, 255, 255, 0.85)'};
  color: ${({ theme }) => theme.colors.textStrong};
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

  &:hover {
    transform: translateY(-1px);
  }

  span[aria-hidden='true'] {
    grid-row: span 2;
    font-size: 1.35rem;
  }

  strong {
    font-size: 0.92rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.75rem;
    line-height: 1.4;
  }
`

const SwatchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`

const SwatchButton = styled.button<{ $background: string; $border: string; $active: boolean }>`
  position: relative;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
  border: 1.5px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 3px rgba(255, 255, 255, 0.95), 0 0 0 5px rgba(78, 141, 84, 0.55)' : 'none'};
  color: rgba(36, 54, 37, 0.8);
  transition: transform 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    transform: translateY(-1px) rotate(-3deg);
  }

  svg {
    position: absolute;
    inset: 0;
    margin: auto;
    font-size: 1.05rem;
  }
`

const ImageActionButton = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: fit-content;
  min-height: 2.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.85rem;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.82);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;

  &[aria-disabled='true'] {
    opacity: 0.6;
    pointer-events: none;
  }

  &:focus-within {
    outline: 2px solid rgba(117, 171, 99, 0.45);
    outline-offset: 2px;
  }

  svg {
    font-size: 1.05rem;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
  }
`

const ImagePreviewWrap = styled.div`
  position: relative;
  width: fit-content;
  max-width: 100%;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
`

const PreviewImage = styled(NoteMedia)`
  display: block;
  max-width: 100%;
  max-height: 12rem;
  object-fit: cover;
`

const RemoveImageButton = styled.button`
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 1rem;
`

export function CharacterCounter({ length, max }: { length: number; max: number }) {
  return (
    <CounterText $warning={length > max * 0.9}>
      {length.toLocaleString()} / {max.toLocaleString()}
    </CounterText>
  )
}

interface CategoryPickerProps {
  value: BoardCategory
  onChange: (category: BoardCategory) => void
  compact?: boolean
}

export function CategoryPicker({ value, onChange, compact = false }: CategoryPickerProps) {
  return (
    <CategoryGrid $compact={compact} role="group" aria-label="카테고리">
      {BOARD_CATEGORY_ORDER.map((category) => {
        const meta = BOARD_CATEGORY_META[category]

        return (
          <CategoryOption
            key={category}
            type="button"
            aria-pressed={value === category}
            $active={value === category}
            $accent={meta.accent}
            onClick={() => onChange(category)}
          >
            <span aria-hidden="true">{meta.emoji}</span>
            <strong>{meta.label}</strong>
            {compact ? null : <small>{meta.description}</small>}
          </CategoryOption>
        )
      })}
    </CategoryGrid>
  )
}

interface ColorPickerProps {
  value: PostItColor
  onChange: (color: PostItColor) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <SwatchRow role="group" aria-label="포스트잇 색상">
      {POST_IT_COLOR_ORDER.map((color) => {
        const meta = POST_IT_COLOR_META[color]
        const isActive = value === color

        return (
          <SwatchButton
            key={color}
            type="button"
            aria-pressed={isActive}
            aria-label={meta.label}
            title={meta.label}
            $background={meta.background}
            $border={meta.border}
            $active={isActive}
            onClick={() => onChange(color)}
          >
            {isActive ? <IconCheck /> : null}
          </SwatchButton>
        )
      })}
    </SwatchRow>
  )
}

interface ImagePickerProps {
  previewUrl: string | null
  isVideo: boolean
  isPreparing: boolean
  disabled?: boolean
  onSelect: (file: File) => void
  onRemove: () => void
}

export function ImagePicker({
  previewUrl,
  isVideo,
  isPreparing,
  disabled = false,
  onSelect,
  onRemove,
}: ImagePickerProps) {
  if (previewUrl) {
    return (
      <ImagePreviewWrap>
        <PreviewImage src={previewUrl} alt="첨부 사진 미리보기" isVideo={isVideo} />
        <RemoveImageButton type="button" onClick={onRemove} aria-label="사진 빼기" disabled={disabled}>
          <IconClose />
        </RemoveImageButton>
      </ImagePreviewWrap>
    )
  }

  return (
    <ImageActionButton aria-disabled={disabled || isPreparing}>
      <IconImage />
      {isPreparing ? '사진 준비 중...' : '사진·영상 붙이기'}
      <input
        type="file"
        accept={NOTE_MEDIA_ACCEPT}
        disabled={disabled || isPreparing}
        onChange={(event) => {
          const nextFile = event.target.files?.[0]
          event.target.value = ''

          if (nextFile) {
            onSelect(nextFile)
          }
        }}
      />
    </ImageActionButton>
  )
}
