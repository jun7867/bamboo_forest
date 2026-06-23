import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { BirthdayCelebrationModal } from '../components/board/BirthdayCelebrationModal'
import { NoteActionMenu } from '../components/board/NoteActionMenu'
import { NoteComposer } from '../components/board/NoteComposer'
import { NoteEditorDialog } from '../components/board/NoteEditorDialog'
import { PostItNote } from '../components/board/PostItNote'
import { LiveChatPanel } from '../components/chat/LiveChatPanel'
import { APP_VERSION_LABEL } from '../config/appVersion'
import { ARCHIVE_BOARDS, V2_CUTOFF_DATE, V3_CUTOFF_DATE } from '../config/boardVersion'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  BOARD_CATEGORY_META,
  BOARD_CATEGORY_ORDER,
  POST_IT_COLOR_META,
} from '../constants/board'
import { applyNotePriorityAction, sortNotesBySharedOrder } from '../lib/boardOrdering'
import { getBoardInsights } from '../lib/boardInsights'
import { useBoardStore } from '../store/useBoardStore'
import type { BoardCategory, BoardNote, PostItColor } from '../types/board'

const MENU_WIDTH = 220
const MENU_HEIGHT = 272
type BoardSortOption = 'manual' | 'latest' | 'oldest' | 'comments'

const Page = styled.main`
  min-height: 100dvh;
  padding: 1.6rem 1.4rem 2.2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.85rem 0.75rem 1.4rem;
  }
`

const Shell = styled.div`
  width: min(1680px, 100%);
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
    padding: 1rem;
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

const EyebrowRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
`

const todayEventPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 122, 89, 0.55), 0 6px 14px rgba(255, 122, 89, 0.28);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 122, 89, 0), 0 6px 14px rgba(255, 122, 89, 0.32);
  }
`

const TodayEventChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #ff7a59 0%, #ffb454 100%);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.01em;
  animation: ${todayEventPulse} 2.4s ease-in-out infinite;
  transition: transform 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  span[aria-hidden='true'] {
    font-size: 0.95rem;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }
`

const SortControl = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 3rem;
  padding: 0.45rem 0.55rem 0.45rem 0.95rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.92rem;
  font-weight: 700;

  span {
    white-space: nowrap;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: space-between;
  }
`

const SortSelect = styled.select`
  min-height: 2.15rem;
  padding: 0 2rem 0 0.75rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.94);
  color: ${({ theme }) => theme.colors.textStrong};
  font: inherit;
  appearance: none;
`

const PrimaryButton = styled.button`
  min-height: 3rem;
  padding: 0.85rem 1.2rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(78, 141, 84, 0.24);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.85rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.45rem;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.7rem;
  }

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
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background:
    radial-gradient(circle at 1px 1px, rgba(80, 115, 61, 0.14) 1px, transparent 0),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 244, 236, 0.96));
  background-size: 18px 18px, 100% 100%;
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.85rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const BoardGrid = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: ${({ $expanded }) =>
    $expanded ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'};
  gap: 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 1rem;
  }
`

const ZoneCard = styled.section<{ $expanded: boolean }>`
  display: grid;
  gap: 1rem;
  min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 9rem)' : 'auto')};
`

const ZoneHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
  }
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

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: 1.35rem;
  }
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
  justify-content: flex-end;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: space-between;
  }
`

const DensityToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.22rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
`

const DensityOption = styled.button<{ $active: boolean }>`
  min-height: 2rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? 'rgba(117, 171, 99, 0.18)' : 'transparent'};
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.82rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
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

const ZoneCanvas = styled.div<{
  $softAccent: string
  $expanded: boolean
  $expandedHeight: number
}>`
  position: relative;
  min-height: ${({ $expanded, $expandedHeight }) =>
    $expanded ? `${$expandedHeight}px` : '36rem'};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(80, 115, 61, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.7)),
    ${({ $softAccent }) => $softAccent};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-height: ${({ $expanded, $expandedHeight }) =>
      $expanded ? `${Math.max(760, $expandedHeight - 120)}px` : '24rem'};
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const StackCanvas = styled.div<{ $softAccent: string; $expanded: boolean }>`
  display: grid;
  align-content: start;
  gap: 1rem;
  min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 19rem)' : '36rem')};
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid rgba(80, 115, 61, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.78)),
    ${({ $softAccent }) => $softAccent};
  overflow: auto;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-height: ${({ $expanded }) => ($expanded ? 'calc(100dvh - 17rem)' : '28rem')};
  }
`

const StackSection = styled.section`
  display: grid;
  gap: 0.7rem;
`

const StackSectionTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.88rem;
  font-weight: 800;
`

const StackList = styled.div`
  display: grid;
  gap: 0.75rem;
`

const EmptyHint = styled.div`
  padding: 0.7rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.78);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.86rem;
  box-shadow: ${({ theme }) => theme.shadows.soft};
`

const SpreadEmptyHint = styled(EmptyHint)`
  position: absolute;
  inset: auto 1rem 1rem auto;
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

const InsightCard = styled(ToolboxCard)`
  display: grid;
  gap: 0.9rem;
`

const InsightHero = styled.div`
  display: grid;
  gap: 0.25rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.88rem;
    line-height: 1.55;
  }
`

const InsightSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
`

const InsightMetric = styled.div`
  padding: 0.8rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.2rem;
    margin-bottom: 0.18rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.82rem;
  }
`

const InsightList = styled.div`
  display: grid;
  gap: 0.65rem;
`

const InsightRow = styled.div`
  display: grid;
  gap: 0.35rem;
`

const InsightLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 0.9rem;
  font-weight: 700;

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 600;
  }
`

const InsightBar = styled.div`
  height: 0.6rem;
  border-radius: 999px;
  background: rgba(92, 128, 74, 0.12);
  overflow: hidden;
`

const InsightFill = styled.div<{ $width: number }>`
  width: ${({ $width }) => `${Math.max(8, Math.round($width * 100))}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #79af63 0%, #4e8d54 100%);
`

const LoadingText = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.7);
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  font-weight: 600;
`

const StatsSection = styled.section`
  display: grid;
  gap: 1rem;
`

const StatsHeader = styled.div`
  display: grid;
  gap: 0.3rem;
  padding: 1.3rem 1.35rem 0;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.7rem, 3vw, 2.35rem);
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.7;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.7rem 0.2rem 0;
  }
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`

const StatsCard = styled.section<{ $span?: number }>`
  grid-column: span ${({ $span = 4 }) => $span};
  display: grid;
  gap: 1rem;
  padding: 1.15rem 1.2rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  box-shadow: ${({ theme }) => theme.shadows.soft};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-column: span 1;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 0.8rem;
    padding: 0.95rem;
    border-radius: ${({ theme }) => theme.radii.lg};
  }
`

const StatsCardHeader = styled.div`
  display: grid;
  gap: 0.28rem;

  h3 {
    margin: 0;
    font-size: 1.08rem;
    color: ${({ theme }) => theme.colors.textStrong};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
    line-height: 1.6;
  }
`

const BigMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`

const BigMetric = styled.div`
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(180deg, rgba(243, 249, 238, 0.96), rgba(255, 255, 255, 0.9));
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};

  strong {
    display: block;
    font-size: clamp(1.65rem, 3vw, 2.2rem);
    line-height: 1;
    color: ${({ theme }) => theme.colors.textStrong};
    margin-bottom: 0.28rem;
  }

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.88rem;
    line-height: 1.5;
  }
`

const CategoryStatList = styled.div`
  display: grid;
  gap: 0.75rem;
`

const CategoryStatRow = styled.div`
  display: grid;
  gap: 0.42rem;
`

const CategoryStatLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 0.95rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.84rem;
    font-weight: 700;
  }
`

const CategoryBar = styled.div`
  height: 0.72rem;
  border-radius: 999px;
  background: rgba(92, 128, 74, 0.1);
  overflow: hidden;
`

const CategoryBarFill = styled.div<{ $width: number; $accent: string }>`
  width: ${({ $width }) => `${Math.max(6, Math.round($width * 100))}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ $accent }) => `linear-gradient(135deg, ${$accent}99 0%, ${$accent} 100%)`};
`

const RankingList = styled.div`
  display: grid;
  gap: 0.75rem;
`

const RankingItem = styled.div`
  display: grid;
  gap: 0.3rem;
  padding: 0.85rem 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(248, 250, 245, 0.95);
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
`

const RankingMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.82rem;

  strong {
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 0.9rem;
  }
`

const RankingContent = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textStrong};
  line-height: 1.58;
  font-size: 0.92rem;
`

const KeywordCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`

const KeywordChip = styled.div<{ $weight: number }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.62rem 0.82rem;
  border-radius: 999px;
  background: rgba(121, 175, 99, 0.12);
  border: 1px solid rgba(121, 175, 99, 0.2);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: ${({ $weight }) => `${0.82 + $weight * 0.06}rem`};
  font-weight: 700;

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.78rem;
    font-weight: 700;
  }
`

const EmptyStats = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(247, 248, 244, 0.92);
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.6;
  text-align: center;
`

const TrendGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`

const TrendCard = styled.div`
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(255, 255, 255, 0.96);

  strong {
    display: block;
    margin-bottom: 0.24rem;
    color: ${({ theme }) => theme.colors.textStrong};
    font-size: 1.35rem;
  }

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.86rem;
  }
`

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.65rem 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: ${({ theme }) => theme.shadows.soft};
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  background: transparent;
  font: inherit;
  font-size: 0.93rem;
  color: ${({ theme }) => theme.colors.textStrong};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`

const SearchCount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
`

const SearchClearButton = styled.button`
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.8);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1rem;
  flex-shrink: 0;
`

const ArchiveNoticeBanner = styled.div`
  padding: 0.9rem 1.1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid rgba(168, 139, 76, 0.22);
  background: rgba(255, 251, 228, 0.94);
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.92rem;
  line-height: 1.6;
`

const ArchiveDropdownWrap = styled.div`
  position: relative;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`

const ArchiveDropdownTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.85rem 1.05rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  color: ${({ theme }) => theme.colors.textStrong};
  font-weight: 700;
  white-space: nowrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: space-between;
  }
`

const ArchiveDropdownChevron = styled.svg<{ $open: boolean }>`
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  transition: transform 0.18s ease;
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'none')};
`

const ArchiveDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 50;
  min-width: 13rem;
  padding: 0.35rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.98);
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    left: 0;
    right: auto;
  }
`

const ArchiveDropdownItem = styled(Link)`
  display: grid;
  gap: 0.12rem;
  padding: 0.72rem 0.85rem;
  border-radius: 0.65rem;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textStrong};
  transition: background 0.14s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primarySoft};
  }

  strong {
    font-size: 0.9rem;
  }

  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`

interface NoteMenuState {
  noteId: string
  x: number
  y: number
}

function clampMenuPosition(position: { x: number; y: number }) {
  if (typeof window === 'undefined') {
    return position
  }

  return {
    x: Math.max(12, Math.min(position.x, window.innerWidth - MENU_WIDTH - 12)),
    y: Math.max(12, Math.min(position.y, window.innerHeight - MENU_HEIGHT - 12)),
  }
}

function getCategoryMap(notes: BoardNote[]) {
  return BOARD_CATEGORY_ORDER.reduce<Record<BoardCategory, BoardNote[]>>(
    (accumulator, category) => {
      accumulator[category] = notes.filter((note) => note.category === category)
      return accumulator
    },
    {
      praise: [],
      suggestion: [],
      freeTalk: [],
      question: [],
    },
  )
}

function getNotePreview(content: string) {
  return content.length > 56 ? `${content.slice(0, 56)}...` : content
}

function getExpandedCanvasHeight(notePositions: Array<{ x: number; y: number }>) {
  const NOTE_HEIGHT = 220
  const BASE_HEIGHT = 980
  const BOTTOM_PADDING = 120

  const maxBottom = notePositions.reduce((currentMax, position) => {
    return Math.max(currentMax, position.y + NOTE_HEIGHT)
  }, 0)

  return Math.max(BASE_HEIGHT, maxBottom + BOTTOM_PADDING)
}

function sortBoardNotes(notes: BoardNote[], sortOption: BoardSortOption) {
  if (sortOption === 'manual') {
    return notes
  }

  const sortedNotes = [...notes]

  if (sortOption === 'comments') {
    sortedNotes.sort(
      (left, right) => (right.comments?.length ?? 0) - (left.comments?.length ?? 0),
    )
    return sortedNotes
  }

  sortedNotes.sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? 0).getTime()
    const rightTime = new Date(right.createdAt ?? 0).getTime()

    return sortOption === 'latest' ? rightTime - leftTime : leftTime - rightTime
  })

  return sortedNotes
}

interface BoardPageProps {
  version?: 'v1' | 'v2' | 'v3'
}

export function BoardPage({ version = 'v3' }: BoardPageProps) {
  const notes = useBoardStore((state) => state.notes)
  const densityByCategory = useBoardStore((state) => state.densityByCategory)
  const isComposerOpen = useBoardStore((state) => state.isComposerOpen)
  const composerCategory = useBoardStore((state) => state.composerCategory)
  const composerColor = useBoardStore((state) => state.composerColor)
  const isLoading = useBoardStore((state) => state.isLoading)
  const status = useBoardStore((state) => state.status)
  const openComposer = useBoardStore((state) => state.openComposer)
  const closeComposer = useBoardStore((state) => state.closeComposer)
  const clearStatus = useBoardStore((state) => state.clearStatus)
  const setDensityMode = useBoardStore((state) => state.setDensityMode)
  const loadNotes = useBoardStore((state) => state.loadNotes)
  const addNote = useBoardStore((state) => state.addNote)
  const addComment = useBoardStore((state) => state.addComment)
  const toggleLike = useBoardStore((state) => state.toggleLike)
  const updateNote = useBoardStore((state) => state.updateNote)
  const deleteNote = useBoardStore((state) => state.deleteNote)
  const moveNote = useBoardStore((state) => state.moveNote)
  const reorderNotes = useBoardStore((state) => state.reorderNotes)

  const isArchive = version !== 'v3'

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<BoardCategory | null>(null)
  const [menuState, setMenuState] = useState<NoteMenuState | null>(null)
  const [sortOption, setSortOption] = useState<BoardSortOption>('manual')
  const [isArchiveMenuOpen, setIsArchiveMenuOpen] = useState(false)
  const [isBirthdayOpen, setIsBirthdayOpen] = useState(false)
  const archiveMenuRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    if (isArchive) return

    const client = supabase

    if (!isSupabaseConfigured || !client) {
      const pollingId = window.setInterval(() => void loadNotes(true), 30000)
      return () => window.clearInterval(pollingId)
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    function scheduleReload() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => void loadNotes(true), 400)
    }

    const channel = client
      .channel('board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_notes' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_note_comments' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_note_likes' }, scheduleReload)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void client.removeChannel(channel)
    }
  }, [loadNotes, isArchive])

  useEffect(() => {
    if (!isArchiveMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (archiveMenuRef.current && !archiveMenuRef.current.contains(event.target as Node)) {
        setIsArchiveMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isArchiveMenuOpen])

  const visibleCategories = expandedCategory
    ? BOARD_CATEGORY_ORDER.filter((category) => category === expandedCategory)
    : BOARD_CATEGORY_ORDER

  const filteredNotes = useMemo(() => {
    if (version === 'v1') {
      return notes.filter((note) => new Date(note.createdAt ?? 0) < V2_CUTOFF_DATE)
    }
    if (version === 'v2') {
      return notes.filter((note) => {
        const createdAt = new Date(note.createdAt ?? 0)
        return createdAt >= V2_CUTOFF_DATE && createdAt < V3_CUTOFF_DATE
      })
    }
    return notes.filter((note) => new Date(note.createdAt ?? 0) >= V3_CUTOFF_DATE)
  }, [notes, version])

  const searchedNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredNotes
    return filteredNotes.filter(
      (note) =>
        note.content.toLowerCase().includes(q) ||
        (note.author ?? '').toLowerCase().includes(q),
    )
  }, [filteredNotes, searchQuery])

  const notesByCategory = useMemo(() => getCategoryMap(searchedNotes), [searchedNotes])

  const selectedNote = useMemo(
    () => filteredNotes.find((note) => note.id === selectedNoteId) ?? null,
    [filteredNotes, selectedNoteId],
  )
  const menuNote = useMemo(
    () => filteredNotes.find((note) => note.id === menuState?.noteId) ?? null,
    [menuState?.noteId, filteredNotes],
  )
  const insights = useMemo(() => getBoardInsights(filteredNotes), [filteredNotes])

  function handlePaletteCreate(color: PostItColor) {
    openComposer(expandedCategory ?? 'freeTalk', color)
  }

  function handleOpenNote(note: BoardNote) {
    setSelectedNoteId(note.id)
    setMenuState(null)
  }

  function handleOpenMenu(note: BoardNote, position: { x: number; y: number }) {
    setMenuState({
      noteId: note.id,
      ...clampMenuPosition(position),
    })
  }

  function handleCloseMenu() {
    setMenuState(null)
  }

  function handleSelectPriorityAction(action: Parameters<typeof applyNotePriorityAction>[2]) {
    if (!menuNote) {
      return
    }

    const categoryNotes = notesByCategory[menuNote.category]
    const nextItems = applyNotePriorityAction(categoryNotes, menuNote.id, action)

    handleCloseMenu()
    void reorderNotes(menuNote.category, nextItems)
  }

  return (
    <Page>
      <Shell>
        <Header>
          <TitleBlock>
            <EyebrowRow>
              <Eyebrow>{isArchive ? '아카이브' : '뉴 채용혁신개발팀'}</Eyebrow>
              {!isArchive && (
                <TodayEventChip
                  type="button"
                  onClick={() => setIsBirthdayOpen(true)}
                  aria-label="오늘의 이벤트 열기 - 이상민의 생일 축하"
                >
                  <span aria-hidden="true">🎂</span>
                  오늘의 이벤트
                </TodayEventChip>
              )}
            </EyebrowRow>
            <PageTitle>{isArchive ? '지난 대나무숲' : '하고싶은거 다 말해~'}</PageTitle>
            <Description>제작자 남준영 v.{APP_VERSION_LABEL}</Description>
          </TitleBlock>

          <HeaderActions>
            {!isArchive && (
              <ArchiveDropdownWrap ref={archiveMenuRef}>
                <ArchiveDropdownTrigger
                  type="button"
                  onClick={() => setIsArchiveMenuOpen((prev) => !prev)}
                >
                  지난 대나무숲 다시보기
                  <ArchiveDropdownChevron
                    $open={isArchiveMenuOpen}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </ArchiveDropdownChevron>
                </ArchiveDropdownTrigger>
                {isArchiveMenuOpen && (
                  <ArchiveDropdownMenu>
                    {ARCHIVE_BOARDS.map((board) => (
                      <ArchiveDropdownItem
                        key={board.id}
                        to={board.path}
                        onClick={() => setIsArchiveMenuOpen(false)}
                      >
                        <strong>{board.label}</strong>
                        <small>{board.period}</small>
                      </ArchiveDropdownItem>
                    ))}
                  </ArchiveDropdownMenu>
                )}
              </ArchiveDropdownWrap>
            )}
            <SortControl>
              <span>정렬</span>
              <SortSelect
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as BoardSortOption)}
                aria-label="포스트잇 정렬"
              >
                <option value="manual">자유배치</option>
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="comments">댓글 많은순</option>
              </SortSelect>
            </SortControl>
            {!isArchive && (
              <PrimaryButton type="button" onClick={() => openComposer(expandedCategory ?? undefined)}>
                포스트잇 추가
              </PrimaryButton>
            )}
            {isArchive ? (
              <SecondaryLink to="/board">현재 대나무숲으로</SecondaryLink>
            ) : (
              <SecondaryLink to="/">홈으로</SecondaryLink>
            )}
          </HeaderActions>
        </Header>

        <SearchBar>
          <svg
            width="1rem"
            height="1rem"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            style={{ flexShrink: 0, opacity: 0.5 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <SearchInput
            type="search"
            placeholder="포스트잇 내용이나 작성자로 검색..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="포스트잇 검색"
          />
          {searchQuery && (
            <SearchCount>{searchedNotes.length}개 검색됨</SearchCount>
          )}
          {searchQuery && (
            <SearchClearButton
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="검색 초기화"
            >
              ×
            </SearchClearButton>
          )}
        </SearchBar>

        {status ? (
          <StatusBanner $tone={status.tone}>
            <div>{status.message}</div>
            <StatusClose type="button" onClick={clearStatus} aria-label="상태 닫기">
              ×
            </StatusClose>
          </StatusBanner>
        ) : null}

        {isArchive && (
          <ArchiveNoticeBanner>
            이 페이지는 읽기 전용 아카이브예요. 새 포스트잇을 추가하거나 수정·삭제할 수 없어요.
          </ArchiveNoticeBanner>
        )}

        <Workspace>
          <Toolbox>
            <ToolboxCard>
              <ToolboxTitle>포스트잇 서랍</ToolboxTitle>
              <ToolboxText>
                색을 고르고 메모를 붙인 뒤, 자세히 보기에서는 끌어 놓고 한눈에 보기에서는
                겹치지 않게 정리해서 읽어보세요.
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
                    onClick={isArchive ? undefined : () => handlePaletteCreate(key as PostItColor)}
                  />
                ))}
              </PaletteGrid>
            </ToolboxCard>

            <ToolboxCard>
              <ToolboxTitle>카테고리 바로가기</ToolboxTitle>
              <CategoryList>
                {BOARD_CATEGORY_ORDER.map((category) => {
                  const meta = BOARD_CATEGORY_META[category]
                  const count = notesByCategory[category].length

                  return (
                    <CategoryRow
                      key={category}
                      type="button"
                      $accent={meta.accent}
                      onClick={isArchive ? undefined : () => openComposer(category)}
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

            <InsightCard>
              <ToolboxTitle>의견 통계</ToolboxTitle>
              <InsightHero>
                <strong>
                  총 {insights.totalNotes}개의 의견 중 가장 많은 건{' '}
                  {insights.mostDiscussedCategory?.label ?? '없음'}
                </strong>
                <span>건의사항은 내용 기반으로 세부 주제를 자동 분류해서 보여줘요.</span>
              </InsightHero>

              <InsightSummaryGrid>
                <InsightMetric>
                  <strong>{insights.categoryCounts.suggestion}</strong>
                  <span>건의하기 수</span>
                </InsightMetric>
                <InsightMetric>
                  <strong>{insights.suggestionTopicStats[0]?.label ?? '없음'}</strong>
                  <span>가장 많은 세부 이슈</span>
                </InsightMetric>
              </InsightSummaryGrid>

              <InsightList>
                {insights.suggestionTopicStats.length > 0 ? (
                  insights.suggestionTopicStats.map((item) => (
                    <InsightRow key={item.key}>
                      <InsightLabelRow>
                        <span>{item.label}</span>
                        <small>{item.count}건</small>
                      </InsightLabelRow>
                      <InsightBar>
                        <InsightFill $width={item.ratio} />
                      </InsightBar>
                    </InsightRow>
                  ))
                ) : (
                  <FooterNote>건의사항이 쌓이면 세부 분류 통계가 여기에 표시돼요.</FooterNote>
                )}
              </InsightList>
            </InsightCard>

            <FooterNote>
              포스트잇을 클릭하면 수정/삭제 모달이 열립니다. 데스크톱에서는 우클릭, 모바일에서는
              `⋯` 버튼으로 공용 정렬과 상단 고정을 바꿀 수 있어요.
            </FooterNote>
          </Toolbox>

          <BoardSurface>
            {isLoading ? <LoadingText>보드를 불러오는 중이에요...</LoadingText> : null}

            <BoardGrid $expanded={expandedCategory !== null}>
              {visibleCategories.map((category) => {
                const meta = BOARD_CATEGORY_META[category]
                const baseCategoryNotes = notesByCategory[category]
                const spreadNotes = sortBoardNotes(baseCategoryNotes, sortOption)
                const orderedNotes = sortNotesBySharedOrder(baseCategoryNotes)
                const pinnedNotes = orderedNotes.filter((note) => note.isPinned)
                const regularNotes = orderedNotes.filter((note) => !note.isPinned)
                const densityMode = densityByCategory[category] ?? 'spread'
                const zoneRef = zoneRefs[category]
                const isExpanded = expandedCategory === category
                const expandedCanvasHeight = getExpandedCanvasHeight(
                  baseCategoryNotes.map((note) => note.position),
                )

                return (
                  <ZoneCard key={category} $expanded={isExpanded}>
                    <ZoneHeader>
                      <ZoneTitleWrap>
                        <ZoneTitle>{meta.label}</ZoneTitle>
                        <ZoneDescription>{meta.description}</ZoneDescription>
                      </ZoneTitleWrap>

                      <ZoneHeaderActions>
                        <DensityToggle aria-label={`${meta.label} 보기 모드`}>
                          <DensityOption
                            type="button"
                            $active={densityMode === 'spread'}
                            onClick={() => setDensityMode(category, 'spread')}
                          >
                            자세히 보기
                          </DensityOption>
                          <DensityOption
                            type="button"
                            $active={densityMode === 'stack'}
                            onClick={() => setDensityMode(category, 'stack')}
                          >
                            한눈에 보기
                          </DensityOption>
                        </DensityToggle>
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
                        <ZoneBadge $accent={meta.accent}>{baseCategoryNotes.length}</ZoneBadge>
                        <MiniAddButton
                          type="button"
                          $accent={meta.accent}
                          onClick={isArchive ? undefined : () => openComposer(category)}
                        >
                          + 추가
                        </MiniAddButton>
                      </ZoneHeaderActions>
                    </ZoneHeader>

                    {densityMode === 'spread' ? (
                      <ZoneCanvas
                        ref={zoneRef}
                        $softAccent={meta.softAccent}
                        $expanded={isExpanded}
                        $expandedHeight={expandedCanvasHeight}
                      >
                        {spreadNotes.map((note) => (
                          <PostItNote
                            key={note.id}
                            note={note}
                            mode="spread"
                            zoneRef={zoneRef}
                            virtualCanvasHeight={expandedCanvasHeight}
                            onMove={isArchive ? async () => {} : moveNote}
                            onOpen={isArchive ? () => {} : handleOpenNote}
                            onOpenMenu={isArchive ? () => {} : handleOpenMenu}
                            onToggleLike={isArchive ? async () => {} : async (noteId) => {
                              await toggleLike({ noteId })
                            }}
                          />
                        ))}

                        {baseCategoryNotes.length === 0 ? (
                          <SpreadEmptyHint>첫 포스트잇을 붙여보세요.</SpreadEmptyHint>
                        ) : null}
                      </ZoneCanvas>
                    ) : (
                      <StackCanvas $softAccent={meta.softAccent} $expanded={isExpanded}>
                        {baseCategoryNotes.length === 0 ? (
                          <EmptyHint>첫 포스트잇을 붙여보세요.</EmptyHint>
                        ) : (
                          <>
                            {pinnedNotes.length > 0 ? (
                              <StackSection>
                                <StackSectionTitle>상단 고정</StackSectionTitle>
                                <StackList>
                                  {pinnedNotes.map((note) => (
                                    <PostItNote
                                      key={note.id}
                                      note={note}
                                      mode="stack"
                                      onOpen={isArchive ? () => {} : handleOpenNote}
                                      onOpenMenu={isArchive ? () => {} : handleOpenMenu}
                                      onToggleLike={isArchive ? async () => {} : async (noteId) => {
                                        await toggleLike({ noteId })
                                      }}
                                    />
                                  ))}
                                </StackList>
                              </StackSection>
                            ) : null}

                            {regularNotes.length > 0 ? (
                              <StackSection>
                                <StackSectionTitle>전체 포스트잇</StackSectionTitle>
                                <StackList>
                                  {regularNotes.map((note) => (
                                    <PostItNote
                                      key={note.id}
                                      note={note}
                                      mode="stack"
                                      onOpen={isArchive ? () => {} : handleOpenNote}
                                      onOpenMenu={isArchive ? () => {} : handleOpenMenu}
                                      onToggleLike={isArchive ? async () => {} : async (noteId) => {
                                        await toggleLike({ noteId })
                                      }}
                                    />
                                  ))}
                                </StackList>
                              </StackSection>
                            ) : null}
                          </>
                        )}
                      </StackCanvas>
                    )}
                  </ZoneCard>
                )
              })}
            </BoardGrid>
          </BoardSurface>
        </Workspace>

        <StatsSection>
          <StatsHeader>
            <h2>한눈에 보는 대나무숲 통계</h2>
            <p>
              포스트잇 하단에서 전체 흐름, 카테고리 분포, 많이 반응한 글과 자주 나온
              키워드를 빠르게 확인할 수 있어요.
            </p>
          </StatsHeader>

          <StatsGrid>
            <StatsCard $span={12}>
              <StatsCardHeader>
                <h3>전체 흐름 요약</h3>
                <p>지금까지 쌓인 의견 수와 최근 반응을 가장 먼저 보여줘요.</p>
              </StatsCardHeader>

              <BigMetricGrid>
                <BigMetric>
                  <strong>{insights.totalNotes}</strong>
                  <span>전체 포스트잇 수</span>
                </BigMetric>
                <BigMetric>
                  <strong>{insights.recentTrend.last7Days}</strong>
                  <span>최근 7일 등록</span>
                </BigMetric>
                <BigMetric>
                  <strong>{insights.recentTrend.last30Days}</strong>
                  <span>최근 30일 등록</span>
                </BigMetric>
              </BigMetricGrid>
            </StatsCard>

            <StatsCard $span={5}>
              <StatsCardHeader>
                <h3>4개 카테고리 분포</h3>
                <p>어떤 성격의 글이 많이 쌓였는지 비율과 건수를 함께 보여줍니다.</p>
              </StatsCardHeader>

              <CategoryStatList>
                {BOARD_CATEGORY_ORDER.map((category) => {
                  const meta = BOARD_CATEGORY_META[category]
                  const count = insights.categoryCounts[category]
                  const ratio = insights.totalNotes > 0 ? count / insights.totalNotes : 0

                  return (
                    <CategoryStatRow key={category}>
                      <CategoryStatLabel>
                        <strong>{meta.label}</strong>
                        <span>{count}건</span>
                      </CategoryStatLabel>
                      <CategoryBar>
                        <CategoryBarFill $width={ratio} $accent={meta.accent} />
                      </CategoryBar>
                    </CategoryStatRow>
                  )
                })}
              </CategoryStatList>
            </StatsCard>

            <StatsCard $span={7}>
              <StatsCardHeader>
                <h3>건의사항 세부 분류</h3>
                <p>건의하기에 적힌 내용을 기준으로 자동 분류한 주제 비율입니다.</p>
              </StatsCardHeader>

              <InsightList>
                {insights.suggestionTopicStats.length > 0 ? (
                  insights.suggestionTopicStats.map((item) => (
                    <InsightRow key={item.key}>
                      <InsightLabelRow>
                        <span>{item.label}</span>
                        <small>
                          {item.count}건 · {Math.round(item.ratio * 100)}%
                        </small>
                      </InsightLabelRow>
                      <InsightBar>
                        <InsightFill $width={item.ratio} />
                      </InsightBar>
                    </InsightRow>
                  ))
                ) : (
                  <EmptyStats>건의사항이 더 모이면 세부 이슈 비율이 여기에 표시돼요.</EmptyStats>
                )}
              </InsightList>
            </StatsCard>

            <StatsCard $span={6}>
              <StatsCardHeader>
                <h3>좋아요 많은 글 TOP 5</h3>
                <p>공감이 많이 모인 포스트잇을 순서대로 확인할 수 있어요.</p>
              </StatsCardHeader>

              <RankingList>
                {insights.topLikedNotes.length > 0 ? (
                  insights.topLikedNotes.map((note, index) => (
                    <RankingItem key={note.id}>
                      <RankingMeta>
                        <strong>
                          {index + 1}. {BOARD_CATEGORY_META[note.category].label}
                        </strong>
                        <span>좋아요 {note.likesCount}</span>
                      </RankingMeta>
                      <RankingContent>{getNotePreview(note.content)}</RankingContent>
                    </RankingItem>
                  ))
                ) : (
                  <EmptyStats>좋아요가 쌓이면 반응 많은 글을 여기서 볼 수 있어요.</EmptyStats>
                )}
              </RankingList>
            </StatsCard>

            <StatsCard $span={6}>
              <StatsCardHeader>
                <h3>댓글 많은 글 TOP 5</h3>
                <p>대화가 많이 붙은 포스트잇을 빠르게 살펴볼 수 있어요.</p>
              </StatsCardHeader>

              <RankingList>
                {insights.topCommentedNotes.length > 0 ? (
                  insights.topCommentedNotes.map((note, index) => (
                    <RankingItem key={note.id}>
                      <RankingMeta>
                        <strong>
                          {index + 1}. {BOARD_CATEGORY_META[note.category].label}
                        </strong>
                        <span>댓글 {note.commentsCount}</span>
                      </RankingMeta>
                      <RankingContent>{getNotePreview(note.content)}</RankingContent>
                    </RankingItem>
                  ))
                ) : (
                  <EmptyStats>댓글이 달리기 시작하면 대화가 많은 글을 보여드릴게요.</EmptyStats>
                )}
              </RankingList>
            </StatsCard>

            <StatsCard $span={4}>
              <StatsCardHeader>
                <h3>최근 등록 추이</h3>
                <p>최근 일주일과 한 달 동안 얼마나 의견이 올라왔는지 확인해요.</p>
              </StatsCardHeader>

              <TrendGrid>
                <TrendCard>
                  <strong>{insights.recentTrend.last7Days}</strong>
                  <span>최근 7일</span>
                </TrendCard>
                <TrendCard>
                  <strong>{insights.recentTrend.last30Days}</strong>
                  <span>최근 30일</span>
                </TrendCard>
              </TrendGrid>
            </StatsCard>

            <StatsCard $span={8}>
              <StatsCardHeader>
                <h3>자주 나온 키워드</h3>
                <p>포스트잇 내용에 반복해서 등장한 단어를 많이 나온 순서대로 보여줘요.</p>
              </StatsCardHeader>

              {insights.keywordStats.length > 0 ? (
                <KeywordCloud>
                  {insights.keywordStats.map((item, index) => (
                    <KeywordChip key={item.keyword} $weight={Math.max(1, 8 - index)}>
                      {item.keyword}
                      <small>{item.count}</small>
                    </KeywordChip>
                  ))}
                </KeywordCloud>
              ) : (
                <EmptyStats>키워드를 추릴 만큼 글이 쌓이면 여기에 표시돼요.</EmptyStats>
              )}
            </StatsCard>
          </StatsGrid>
        </StatsSection>
      </Shell>

      {!isArchive && (
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
      )}

      {!isArchive && (
        <AnimatePresence>
          {selectedNote ? (
            <NoteEditorDialog
              key={selectedNote.id}
              note={selectedNote}
              onClose={() => setSelectedNoteId(null)}
              onAddComment={addComment}
              onToggleLike={async (noteId) => toggleLike({ noteId })}
              onSave={updateNote}
              onDelete={deleteNote}
            />
          ) : null}
        </AnimatePresence>
      )}

      {!isArchive && menuState && menuNote ? (
        <NoteActionMenu
          note={menuNote}
          position={{ x: menuState.x, y: menuState.y }}
          onClose={handleCloseMenu}
          onSelect={handleSelectPriorityAction}
        />
      ) : null}

      {!isArchive && (expandedCategory ? null : <LiveChatPanel />)}

      {!isArchive && (
        <AnimatePresence>
          {isBirthdayOpen ? (
            <BirthdayCelebrationModal
              key="birthday-sangmin"
              onClose={() => setIsBirthdayOpen(false)}
            />
          ) : null}
        </AnimatePresence>
      )}
    </Page>
  )
}
