import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { NoteComposer } from '../components/board/NoteComposer'
import { NoteEditorDialog } from '../components/board/NoteEditorDialog'
import { PostItNote } from '../components/board/PostItNote'
import { LiveChatPanel } from '../components/chat/LiveChatPanel'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
} from '../constants/board'
import { useBoardStore } from '../store/useBoardStore'
import type { BoardCategory, PostItColor } from '../types/board'

const Page = styled.main`
  min-height: 100dvh;
  padding: 1.6rem 1.4rem 2.2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1rem 0.85rem 1.8rem;
  }
`

const Shell = styled.div`
  width: min(1500px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
`

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.3rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.74);
  box-shadow: ${({ theme }) => theme.shadows.soft};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`

const TitleBlock = styled.div`
  display: grid;
  gap: 0.45rem;
`

const Eyebrow = styled.span`
  display: inline-flex;
  width: fit-content;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primaryDeep};
  font-size: 0.85rem;
  font-weight: 700;
`

const PageTitle = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2rem, 4.6vw, 3.4rem);
  line-height: 1.05;
  color: ${({ theme }) => theme.colors.textStrong};
`

const Description = styled.p`
  margin: 0;
  max-width: 44rem;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.7;
`

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
`

const PrimaryButton = styled.button`
  min-height: 3rem;
  padding: 0.85rem 1.2rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(78, 141, 84, 0.24);
`

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0.85rem 1.05rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  color: ${({ theme }) => theme.colors.textStrong};
  text-decoration: none;
  font-weight: 700;
`

const StatusBanner = styled.div<{ $tone: 'info' | 'error' }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid
    ${({ $tone }) => ($tone === 'error' ? 'rgba(182, 77, 77, 0.2)' : 'rgba(99, 145, 92, 0.18)')};
  background: ${({ $tone }) =>
    $tone === 'error'
      ? 'rgba(255, 241, 241, 0.92)'
      : 'rgba(242, 249, 236, 0.92)'};
  color: ${({ theme }) => theme.colors.textStrong};
  line-height: 1.65;
`

const StatusClose = styled.button`
  min-width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.7);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1rem;
`

const Workspace = styled.section`
  display: grid;
  grid-template-columns: minmax(220px, 250px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`

const Toolbox = styled.aside`
  display: grid;
  gap: 0.9rem;
  position: sticky;
  top: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    position: static;
  }
`

const ToolboxCard = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.86);
  box-shadow: ${({ theme }) => theme.shadows.soft};
`

const ToolboxTitle = styled.h2`
  margin: 0 0 0.75rem;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.35rem;
  color: ${({ theme }) => theme.colors.textStrong};
`

const ToolboxText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.65;
  font-size: 0.94rem;
`

const PaletteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.85rem;
`

const SwatchButton = styled.button<{ $background: string; $border: string }>`
  aspect-ratio: 1;
  border-radius: 0.55rem;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $background }) => $background};
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transition: transform 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 10px 18px rgba(93, 106, 70, 0.14);
  }
`

const CategoryList = styled.div`
  display: grid;
  gap: 0.65rem;
  margin-top: 0.85rem;
`

const CategoryRow = styled.button<{ $accent: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  width: 100%;
  padding: 0.75rem 0.8rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.84);
  text-align: left;

  span:last-child {
    min-width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${({ $accent }) => `${$accent}22`};
    color: ${({ theme }) => theme.colors.textStrong};
    font-weight: 700;
  }
`

const CategoryLabel = styled.div`
  display: grid;
  gap: 0.2rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 0.96rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`

const BoardSurface = styled.div`
  padding: 1.15rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background:
    radial-gradient(circle at 1px 1px, rgba(80, 115, 61, 0.14) 1px, transparent 0),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 244, 236, 0.96));
  background-size: 18px 18px, 100% 100%;
  box-shadow: ${({ theme }) => theme.shadows.card};
`

const BoardGrid = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: ${({ $expanded }) =>
    $expanded ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'};
  gap: 1.25rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`

const ZoneCard = styled.section<{ $expanded: boolean }>`
  display: grid;
  gap: 0.8rem;
  min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 15rem)' : 'auto')};
`

const ZoneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
`

const ZoneTitleWrap = styled.div`
  display: grid;
  gap: 0.18rem;
`

const ZoneTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.55rem;
  color: ${({ theme }) => theme.colors.textStrong};
`

const ZoneDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`

const ZoneHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
`

const ZoneBadge = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}22`};
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const FocusButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ $active }) =>
    $active ? 'rgba(117, 171, 99, 0.18)' : 'rgba(255, 255, 255, 0.9)'};
  color: ${({ theme }) => theme.colors.textStrong};
`

const FocusIcon = styled.svg`
  width: 1.15rem;
  height: 1.15rem;
  display: block;
`

const ZoneCanvas = styled.div<{ $softAccent: string; $expanded: boolean }>`
  position: relative;
  min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 20rem)' : '31rem')};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(80, 115, 61, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.7)),
    ${({ $softAccent }) => $softAccent};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 17rem)' : '24rem')};
  }
`

const EmptyHint = styled.div`
  position: absolute;
  inset: auto 1rem 1rem auto;
  padding: 0.7rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.78);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.86rem;
  box-shadow: ${({ theme }) => theme.shadows.soft};
`

const MiniAddButton = styled.button<{ $accent: string }>`
  min-height: 2.5rem;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  background: ${({ $accent }) => `${$accent}22`};
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
`

const FooterNote = styled.div`
  padding: 0.95rem 1.05rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.82);
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.65;
  font-size: 0.92rem;
`

const LoadingText = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.7);
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  font-weight: 600;
`

export function BoardPage() {
  const notes = useBoardStore((state) => state.notes)
  const isComposerOpen = useBoardStore((state) => state.isComposerOpen)
  const composerCategory = useBoardStore((state) => state.composerCategory)
  const composerColor = useBoardStore((state) => state.composerColor)
  const isLoading = useBoardStore((state) => state.isLoading)
  const status = useBoardStore((state) => state.status)
  const openComposer = useBoardStore((state) => state.openComposer)
  const closeComposer = useBoardStore((state) => state.closeComposer)
  const clearStatus = useBoardStore((state) => state.clearStatus)
  const loadNotes = useBoardStore((state) => state.loadNotes)
  const addNote = useBoardStore((state) => state.addNote)
  const addComment = useBoardStore((state) => state.addComment)
  const updateNote = useBoardStore((state) => state.updateNote)
  const deleteNote = useBoardStore((state) => state.deleteNote)
  const moveNote = useBoardStore((state) => state.moveNote)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<BoardCategory | null>(null)

  const praiseRef = useRef<HTMLDivElement | null>(null)
  const suggestionRef = useRef<HTMLDivElement | null>(null)
  const freeTalkRef = useRef<HTMLDivElement | null>(null)
  const questionRef = useRef<HTMLDivElement | null>(null)

  const zoneRefs: Record<BoardCategory, RefObject<HTMLDivElement | null>> = {
    praise: praiseRef,
    suggestion: suggestionRef,
    freeTalk: freeTalkRef,
    question: questionRef,
  }

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  useEffect(() => {
    const pollingId = window.setInterval(() => {
      void loadNotes(true)
    }, 30000)

    return () => window.clearInterval(pollingId)
  }, [loadNotes])

  const visibleCategories = expandedCategory
    ? BOARD_CATEGORY_ORDER.filter((category) => category === expandedCategory)
    : BOARD_CATEGORY_ORDER

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  function handlePaletteCreate(color: PostItColor) {
    openComposer(expandedCategory ?? 'freeTalk', color)
  }

  return (
    <Page>
      <Shell>
        <Header>
          <TitleBlock>
            <Eyebrow>채용혁신개발팀</Eyebrow>
            <PageTitle>하고싶은거 다 말해~</PageTitle>
            <Description>제작자 남준영 v.0.0.4</Description>
          </TitleBlock>

          <HeaderActions>
            <PrimaryButton type="button" onClick={() => openComposer(expandedCategory ?? undefined)}>
              포스트잇 추가
            </PrimaryButton>
            <SecondaryLink to="/">홈으로</SecondaryLink>
          </HeaderActions>
        </Header>

        {status ? (
          <StatusBanner $tone={status.tone}>
            <div>{status.message}</div>
            <StatusClose type="button" onClick={clearStatus} aria-label="상태 닫기">
              ×
            </StatusClose>
          </StatusBanner>
        ) : null}

        <Workspace>
          <Toolbox>
            <ToolboxCard>
              <ToolboxTitle>포스트잇 서랍</ToolboxTitle>
              <ToolboxText>
                색을 고르고 메모를 붙인 뒤, 원하는 위치로 끌어다 놓아보세요.
              </ToolboxText>

              <PaletteGrid>
                {Object.entries(POST_IT_COLOR_META).map(([key, meta]) => (
                  <SwatchButton
                    key={key}
                    type="button"
                    $background={meta.background}
                    $border={meta.border}
                    title={`${meta.label} 포스트잇 만들기`}
                    aria-label={`${meta.label} 포스트잇 만들기`}
                    onClick={() => handlePaletteCreate(key as PostItColor)}
                  />
                ))}
              </PaletteGrid>
            </ToolboxCard>

            <ToolboxCard>
              <ToolboxTitle>카테고리 바로가기</ToolboxTitle>
              <CategoryList>
                {BOARD_CATEGORY_ORDER.map((category) => {
                  const meta = BOARD_CATEGORY_META[category]
                  const count = notes.filter((note) => note.category === category).length

                  return (
                    <CategoryRow
                      key={category}
                      type="button"
                      $accent={meta.accent}
                      onClick={() => openComposer(category)}
                    >
                      <CategoryLabel>
                        <strong>{meta.label}</strong>
                        <small>{meta.description}</small>
                      </CategoryLabel>
                      <span>{count}</span>
                    </CategoryRow>
                  )
                })}
              </CategoryList>
            </ToolboxCard>

            <FooterNote>
              포스트잇을 클릭하면 수정/삭제 모달이 열립니다. 위치 이동은 비밀번호 없이
              저장되고, 내용 변경과 삭제는 비밀번호가 필요해요.
            </FooterNote>
          </Toolbox>

          <BoardSurface>
            {isLoading ? <LoadingText>보드를 불러오는 중이에요...</LoadingText> : null}

            <BoardGrid $expanded={expandedCategory !== null}>
              {visibleCategories.map((category) => {
                const meta = BOARD_CATEGORY_META[category]
                const categoryNotes = notes.filter((note) => note.category === category)
                const zoneRef = zoneRefs[category]
                const isExpanded = expandedCategory === category

                return (
                  <ZoneCard key={category} $expanded={isExpanded}>
                    <ZoneHeader>
                      <ZoneTitleWrap>
                        <ZoneTitle>{meta.label}</ZoneTitle>
                        <ZoneDescription>{meta.description}</ZoneDescription>
                      </ZoneTitleWrap>

                      <ZoneHeaderActions>
                        <FocusButton
                          type="button"
                          $active={isExpanded}
                          aria-label={isExpanded ? `${meta.label} 크게보기 닫기` : `${meta.label} 크게보기`}
                          title={isExpanded ? '기본 보기로' : '이 섹션만 크게 보기'}
                          onClick={() =>
                            setExpandedCategory((current) =>
                              current === category ? null : category,
                            )
                          }
                        >
                          {isExpanded ? (
                            <FocusIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M7 7l10 10" />
                              <path d="M17 7L7 17" />
                            </FocusIcon>
                          ) : (
                            <FocusIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M9 3H3v6" />
                              <path d="M15 3h6v6" />
                              <path d="M21 15v6h-6" />
                              <path d="M3 15v6h6" />
                              <path d="M8 8L3 3" />
                              <path d="M16 8l5-5" />
                              <path d="M16 16l5 5" />
                              <path d="M8 16l-5 5" />
                            </FocusIcon>
                          )}
                        </FocusButton>
                        <ZoneBadge $accent={meta.accent}>{categoryNotes.length}</ZoneBadge>
                        <MiniAddButton
                          type="button"
                          $accent={meta.accent}
                          onClick={() => openComposer(category)}
                        >
                          + 추가
                        </MiniAddButton>
                      </ZoneHeaderActions>
                    </ZoneHeader>

                    <ZoneCanvas ref={zoneRef} $softAccent={meta.softAccent} $expanded={isExpanded}>
                      {categoryNotes.map((note) => (
                        <PostItNote
                          key={note.id}
                          note={note}
                          zoneRef={zoneRef}
                          onMove={moveNote}
                          onOpen={(openedNote) => setSelectedNoteId(openedNote.id)}
                        />
                      ))}

                      {categoryNotes.length === 0 ? (
                        <EmptyHint>첫 포스트잇을 붙여보세요.</EmptyHint>
                      ) : null}
                    </ZoneCanvas>
                  </ZoneCard>
                )
              })}
            </BoardGrid>
          </BoardSurface>
        </Workspace>
      </Shell>

      <AnimatePresence>
        {isComposerOpen ? (
          <NoteComposer
            key={`${composerCategory}-${composerColor}`}
            initialCategory={composerCategory}
            initialColor={composerColor}
            onClose={closeComposer}
            onSubmit={addNote}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNote ? (
          <NoteEditorDialog
            key={selectedNote.id}
            note={selectedNote}
            onClose={() => setSelectedNoteId(null)}
            onAddComment={addComment}
            onSave={updateNote}
            onDelete={deleteNote}
          />
        ) : null}
      </AnimatePresence>

      {expandedCategory ? null : <LiveChatPanel />}
    </Page>
  )
}
