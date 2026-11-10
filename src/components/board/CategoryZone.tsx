import { useRef } from 'react'
import styled from 'styled-components'
import { BOARD_CATEGORY_META } from '../../constants/board'
import type { BoardSortOption } from '../../constants/board'
import { VIRTUAL_CANVAS } from '../../lib/boardLayout'
import { sortNotesBySharedOrder, sortNotesForList } from '../../lib/boardOrdering'
import type { BoardCategory, BoardDensityMode, BoardNote, BoardPosition } from '../../types/board'
import { IconCollapse, IconExpand, IconPlus } from '../common/Icons'
import { PostItNote } from './PostItNote'

interface CategoryZoneProps {
  category: BoardCategory
  notes: BoardNote[]
  viewMode: BoardDensityMode
  sortOption: BoardSortOption
  isFocused: boolean
  isSearching: boolean
  isReadOnly: boolean
  highlightedNoteId: string | null
  isNewNote: (note: BoardNote) => boolean
  onToggleFocus: () => void
  onCompose: (category: BoardCategory) => void
  onOpenNote: (note: BoardNote) => void
  onOpenMenu: (note: BoardNote, position: { x: number; y: number }) => void
  onToggleLike: (noteId: string) => void
  onMoveNote: (id: string, position: BoardPosition) => Promise<void>
}

const Zone = styled.section`
  display: grid;
  align-content: start;
  gap: 0.85rem;
  min-width: 0;
`

const ZoneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const ZoneTitleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  padding: 0;
  text-align: left;

  span[aria-hidden='true'] {
    font-size: 1.5rem;
  }

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.5rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  &:hover h2 {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.2em;
  }
`

const CountBadge = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.9rem;
  height: 1.9rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}2e`};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.88rem;
  font-weight: 800;
`

const ZoneActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 0.8rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1.05rem;

  &:hover {
    background: #ffffff;
  }
`

const AddButton = styled.button<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2.3rem;
  padding: 0.45rem 0.85rem;
  border-radius: 0.8rem;
  background: ${({ $accent }) => `${$accent}2e`};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.88rem;
  font-weight: 800;

  &:hover {
    background: ${({ $accent }) => `${$accent}44`};
  }
`

const SpreadCanvas = styled.div<{ $softAccent: string; $focused: boolean }>`
  position: relative;
  min-height: ${({ $focused }) => ($focused ? `${VIRTUAL_CANVAS.height}px` : '34rem')};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(80, 115, 61, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.7)),
    ${({ $softAccent }) => $softAccent};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-height: ${({ $focused }) => ($focused ? '44rem' : '24rem')};
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const ListCanvas = styled.div<{ $softAccent: string; $focused: boolean }>`
  display: grid;
  align-content: start;
  gap: 1rem;
  min-height: 12rem;
  max-height: ${({ $focused }) => ($focused ? 'none' : '46rem')};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(80, 115, 61, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.78)),
    ${({ $softAccent }) => $softAccent};
  overflow-y: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    max-height: none;
    padding: 0.75rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const ListSection = styled.section`
  display: grid;
  gap: 0.6rem;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
`

const NoteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
  gap: 0.8rem;
`

const EmptyState = styled.div<{ $overlay: boolean }>`
  ${({ $overlay }) =>
    $overlay
      ? `
    position: absolute;
    inset: 0;
  `
      : ''}
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 2rem 1.2rem;
  text-align: center;
  pointer-events: none;

  span[aria-hidden='true'] {
    font-size: 2.4rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1rem;
  }

  p {
    margin: 0;
    max-width: 18rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.88rem;
    line-height: 1.6;
  }

  button {
    pointer-events: auto;
    margin-top: 0.3rem;
  }
`

export function CategoryZone({
  category,
  notes,
  viewMode,
  sortOption,
  isFocused,
  isSearching,
  isReadOnly,
  highlightedNoteId,
  isNewNote,
  onToggleFocus,
  onCompose,
  onOpenNote,
  onOpenMenu,
  onToggleLike,
  onMoveNote,
}: CategoryZoneProps) {
  const meta = BOARD_CATEGORY_META[category]
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const interactiveProps = isReadOnly
    ? {}
    : { onOpenMenu, onToggleLike, onMove: viewMode === 'spread' ? onMoveNote : undefined }

  function renderNote(note: BoardNote) {
    return (
      <PostItNote
        key={note.id}
        note={note}
        mode={viewMode}
        zoneRef={viewMode === 'spread' ? canvasRef : undefined}
        isHighlighted={note.id === highlightedNoteId}
        isNew={isNewNote(note)}
        onOpen={onOpenNote}
        {...interactiveProps}
      />
    )
  }

  const emptyState =
    notes.length === 0 ? (
      <EmptyState $overlay={viewMode === 'spread'}>
        {isSearching ? (
          <>
            <span aria-hidden="true">🔍</span>
            <strong>검색 결과가 없어요</strong>
          </>
        ) : (
          <>
            <span aria-hidden="true">{meta.emoji}</span>
            <strong>아직 {meta.label} 포스트잇이 없어요</strong>
            <p>{meta.prompt}</p>
            {isReadOnly ? null : (
              <AddButton type="button" $accent={meta.accent} onClick={() => onCompose(category)}>
                <IconPlus />첫 포스트잇 붙이기
              </AddButton>
            )}
          </>
        )}
      </EmptyState>
    ) : null

  const listNotes = viewMode === 'stack' ? sortNotesForList(notes, sortOption) : []
  const pinnedNotes = listNotes.filter((note) => note.isPinned)
  const regularNotes = listNotes.filter((note) => !note.isPinned)

  return (
    <Zone aria-labelledby={`zone-title-${category}`}>
      <ZoneHeader>
        <ZoneTitleButton
          type="button"
          onClick={onToggleFocus}
          title={isFocused ? '전체 보기로 돌아가기' : `${meta.label}만 크게 보기`}
        >
          <span aria-hidden="true">{meta.emoji}</span>
          <h2 id={`zone-title-${category}`}>{meta.label}</h2>
          <CountBadge $accent={meta.accent}>{notes.length}</CountBadge>
        </ZoneTitleButton>

        <ZoneActions>
          <IconButton
            type="button"
            onClick={onToggleFocus}
            aria-label={isFocused ? '전체 보기로 돌아가기' : `${meta.label}만 크게 보기`}
            title={isFocused ? '전체 보기로' : '크게 보기'}
          >
            {isFocused ? <IconCollapse /> : <IconExpand />}
          </IconButton>
          {isReadOnly ? null : (
            <AddButton type="button" $accent={meta.accent} onClick={() => onCompose(category)}>
              <IconPlus />
              붙이기
            </AddButton>
          )}
        </ZoneActions>
      </ZoneHeader>

      {viewMode === 'spread' ? (
        <SpreadCanvas ref={canvasRef} $softAccent={meta.softAccent} $focused={isFocused}>
          {sortNotesBySharedOrder(notes).map(renderNote)}
          {emptyState}
        </SpreadCanvas>
      ) : (
        <ListCanvas $softAccent={meta.softAccent} $focused={isFocused}>
          {emptyState}
          {pinnedNotes.length > 0 ? (
            <ListSection>
              <h3>📌 상단 고정</h3>
              <NoteGrid>{pinnedNotes.map(renderNote)}</NoteGrid>
            </ListSection>
          ) : null}
          {regularNotes.length > 0 ? (
            <ListSection>
              {pinnedNotes.length > 0 ? <h3>모든 포스트잇</h3> : null}
              <NoteGrid>{regularNotes.map(renderNote)}</NoteGrid>
            </ListSection>
          ) : null}
        </ListCanvas>
      )}
    </Zone>
  )
}
