import { motion } from 'framer-motion'
import type { RefObject } from 'react'
import styled from 'styled-components'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  BOARD_SORT_OPTION,
  BOARD_SORT_OPTION_LABEL,
} from '../../constants/board'
import type { BoardSortOption } from '../../constants/board'
import type { BoardCategory, BoardDensityMode } from '../../types/board'
import { IconBoard, IconClose, IconList, IconPlus, IconSearch } from '../common/Icons'

interface BoardToolbarProps {
  categoryCounts: Record<BoardCategory, number>
  focusedCategory: BoardCategory | null
  onFocusCategory: (category: BoardCategory | null) => void
  searchQuery: string
  searchResultCount: number
  searchInputRef: RefObject<HTMLInputElement | null>
  onSearchChange: (value: string) => void
  viewMode: BoardDensityMode
  onViewModeChange: (mode: BoardDensityMode) => void
  sortOption: BoardSortOption
  onSortChange: (option: BoardSortOption) => void
  onCompose?: () => void
}

const SORT_OPTIONS = Object.values(BOARD_SORT_OPTION)

const Bar = styled.div`
  position: sticky;
  top: calc(2.75rem + 0.6rem);
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border-radius: 1.35rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 30px rgba(83, 111, 63, 0.12);
  backdrop-filter: saturate(160%) blur(16px);

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    top: calc(2.75rem + 0.35rem);
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 1.1rem;
  }
`

const Segmented = styled.div`
  display: flex;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.25rem;
  border-radius: 1rem;
  background: rgba(80, 115, 61, 0.08);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const SegmentButton = styled.button<{ $active: boolean }>`
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.8rem;
  color: ${({ $active, theme }) => ($active ? theme.colors.textStrong : theme.colors.textMuted)};
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  white-space: nowrap;
`

const SegmentThumb = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: 0.8rem;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(48, 61, 41, 0.12);
`

const SegmentLabel = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: 0.78rem;
    font-weight: 700;
  }
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 0.4rem;
  }
`

const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: clamp(12rem, 22vw, 18rem);
  min-height: 2.6rem;
  padding: 0 0.7rem;
  border-radius: 0.9rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textMuted};

  &:focus-within {
    border-color: rgba(78, 141, 84, 0.55);
    box-shadow: 0 0 0 3px rgba(117, 171, 99, 0.2);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: auto;
    min-width: 0;
    flex: 1;
  }

  svg {
    flex-shrink: 0;
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.92rem;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  &::-webkit-search-cancel-button {
    display: none;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: rgba(80, 115, 61, 0.12);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.8rem;
`

const ShortcutKey = styled.kbd`
  flex-shrink: 0;
  padding: 0.05rem 0.4rem;
  border-radius: 0.35rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.textSubtle};
  font-family: inherit;
  font-size: 0.72rem;

  @media (hover: none) {
    display: none;
  }
`

const ViewToggle = styled.div`
  display: inline-flex;
  padding: 0.2rem;
  border-radius: 0.9rem;
  background: rgba(80, 115, 61, 0.08);
`

const ViewButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2.2rem;
  padding: 0.3rem 0.65rem;
  border-radius: 0.7rem;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? '0 3px 10px rgba(48, 61, 41, 0.12)' : 'none')};
  color: ${({ $active, theme }) => ($active ? theme.colors.textStrong : theme.colors.textMuted)};
  font-size: 0.85rem;
  font-weight: 700;

  svg {
    font-size: 1rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    span {
      display: none;
    }
  }
`

const SortSelect = styled.select`
  min-height: 2.6rem;
  padding: 0 2rem 0 0.8rem;
  border-radius: 0.9rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23587056' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
      no-repeat right 0.75rem center,
    rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  appearance: none;

  option {
    color: ${({ theme }) => theme.colors.textStrong};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-shrink: 0;
    width: 2.6rem;
    padding: 0;
    color: transparent;
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23243625' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4'/%3E%3C/svg%3E")
        no-repeat center,
      rgba(255, 255, 255, 0.92);
  }
`

const ComposeButton = styled.button`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 0.9rem;
    background: ${({ theme }) => theme.gradients.button};
    color: #ffffff;
    font-size: 1.2rem;
  }
`

export function BoardToolbar({
  categoryCounts,
  focusedCategory,
  onFocusCategory,
  searchQuery,
  searchResultCount,
  searchInputRef,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange,
  onCompose,
}: BoardToolbarProps) {
  const totalCount = BOARD_CATEGORY_ORDER.reduce(
    (sum, category) => sum + categoryCounts[category],
    0,
  )
  const segments: Array<{ key: BoardCategory | null; label: string; emoji?: string; count: number }> = [
    { key: null, label: '전체', count: totalCount },
    ...BOARD_CATEGORY_ORDER.map((category) => ({
      key: category,
      label: BOARD_CATEGORY_META[category].label,
      emoji: BOARD_CATEGORY_META[category].emoji,
      count: categoryCounts[category],
    })),
  ]

  return (
    <Bar>
      <Segmented role="group" aria-label="카테고리 고르기">
        {segments.map((segment) => {
          const isActive = focusedCategory === segment.key

          return (
            <SegmentButton
              key={segment.key ?? 'all'}
              type="button"
              aria-pressed={isActive}
              $active={isActive}
              onClick={() => onFocusCategory(segment.key)}
            >
              {isActive ? (
                <SegmentThumb
                  layoutId="board-category-thumb"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <SegmentLabel>
                {segment.emoji ? <span aria-hidden="true">{segment.emoji}</span> : null}
                {segment.label}
                <small>{segment.count}</small>
              </SegmentLabel>
            </SegmentButton>
          )
        })}
      </Segmented>

      <Controls>
        <SearchField>
          <IconSearch />
          <SearchInput
            ref={searchInputRef}
            type="search"
            placeholder="검색"
            title="내용, 닉네임, 댓글에서 찾아요"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onSearchChange('')
                event.currentTarget.blur()
              }
            }}
            aria-label="포스트잇 검색"
          />
          {searchQuery ? (
            <ClearButton type="button" onClick={() => onSearchChange('')} aria-label="검색어 지우기">
              <IconClose />
            </ClearButton>
          ) : (
            <ShortcutKey aria-hidden="true">/</ShortcutKey>
          )}
          <VisuallyHidden aria-live="polite">
            {searchQuery ? `검색 결과 ${searchResultCount}개` : ''}
          </VisuallyHidden>
        </SearchField>

        {viewMode === 'stack' ? (
          <SortSelect
            value={sortOption}
            onChange={(event) => {
              const nextOption = SORT_OPTIONS.find((option) => option === event.target.value)

              if (nextOption) {
                onSortChange(nextOption)
              }
            }}
            aria-label="목록 정렬"
            title={`정렬: ${BOARD_SORT_OPTION_LABEL[sortOption]}`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {BOARD_SORT_OPTION_LABEL[option]}
              </option>
            ))}
          </SortSelect>
        ) : null}

        <ViewToggle role="group" aria-label="보기 방식">
          <ViewButton
            type="button"
            aria-pressed={viewMode === 'spread'}
            $active={viewMode === 'spread'}
            onClick={() => onViewModeChange('spread')}
            title="포스트잇을 자유롭게 붙여 보는 보드"
          >
            <IconBoard />
            <span>보드</span>
          </ViewButton>
          <ViewButton
            type="button"
            aria-pressed={viewMode === 'stack'}
            $active={viewMode === 'stack'}
            onClick={() => onViewModeChange('stack')}
            title="겹치지 않게 정리해서 읽는 목록"
          >
            <IconList />
            <span>목록</span>
          </ViewButton>
        </ViewToggle>

        {onCompose ? (
          <ComposeButton type="button" onClick={onCompose} aria-label="포스트잇 붙이기">
            <IconPlus />
          </ComposeButton>
        ) : null}
      </Controls>
    </Bar>
  )
}
