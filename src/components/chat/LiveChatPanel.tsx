import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { subscribeToChatMessages } from '../../lib/chatMessages'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useChatStore } from '../../store/useChatStore'

const FloatingWrap = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 70;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    right: 0.75rem;
    left: 0.75rem;
    bottom: 0.75rem;
  }
`

const TriggerButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 3.4rem;
  padding: 0.9rem 1.15rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 18px 34px rgba(78, 141, 84, 0.28);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: center;
  }
`

const Panel = styled(motion.section)`
  width: min(33rem, calc(100vw - 2rem));
  height: min(42rem, calc(100dvh - 2rem));
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 42px rgba(54, 86, 46, 0.2);
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    height: min(78dvh, calc(100dvh - 1.5rem));
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 1rem 1rem 0.9rem;
  background: linear-gradient(180deg, rgba(237, 247, 228, 0.98), rgba(255, 255, 255, 0.92));
  border-bottom: 1px solid ${({ theme }) => theme.colors.borderSoft};
`

const HeaderTitleWrap = styled.div`
  display: grid;
  gap: 0.25rem;
`

const HeaderTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.45rem;
  color: ${({ theme }) => theme.colors.textStrong};
`

const HeaderSub = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.84rem;
`

const StatusDot = styled.span<{ $active: boolean }>`
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? '#6FB56B' : '#D7B25A')};
  box-shadow: ${({ $active }) =>
    $active ? '0 0 0 6px rgba(111, 181, 107, 0.14)' : '0 0 0 6px rgba(215, 178, 90, 0.14)'};
`

const HeaderActions = styled.div`
  display: flex;
  gap: 0.45rem;
`

const IconButton = styled.button`
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.88);
  color: ${({ theme }) => theme.colors.textStrong};
  font-size: 1rem;
`

const StatusNotice = styled.div<{ $tone: 'info' | 'error' }>`
  margin: 0.7rem 0.8rem 0;
  padding: 0.7rem 0.8rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $tone }) =>
    $tone === 'error'
      ? 'rgba(255, 241, 241, 0.92)'
      : 'rgba(242, 249, 236, 0.92)'};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.86rem;
  line-height: 1.6;
`

const MessageList = styled.div`
  min-height: 0;
  padding: 1rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  gap: 0.75rem;
  background:
    radial-gradient(circle at 1px 1px, rgba(80, 115, 61, 0.1) 1px, transparent 0),
    linear-gradient(180deg, rgba(250, 251, 246, 0.96), rgba(245, 242, 235, 0.96));
  background-size: 18px 18px, 100% 100%;
  -webkit-overflow-scrolling: touch;
`

const MessageRow = styled.div<{ $isMine: boolean }>`
  display: flex;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
`

const MessageStack = styled.div<{ $isMine: boolean }>`
  max-width: min(84%, 25rem);
  display: grid;
  gap: 0.28rem;
  justify-items: ${({ $isMine }) => ($isMine ? 'end' : 'start')};
`

const MessageAuthor = styled.div<{ $isMine: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.2rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.77rem;
  justify-content: ${({ $isMine }) => ($isMine ? 'flex-end' : 'flex-start')};
`

const AuthorDot = styled.span<{ $isMine: boolean }>`
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 999px;
  background: ${({ $isMine }) => ($isMine ? '#6FB56B' : '#E0C15A')};
  box-shadow: ${({ $isMine }) =>
    $isMine ? '0 0 0 5px rgba(111, 181, 107, 0.12)' : '0 0 0 5px rgba(224, 193, 90, 0.12)'};
`

const MessageBubble = styled.div<{ $isMine: boolean }>`
  position: relative;
  width: fit-content;
  max-width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 1.2rem;
  background: ${({ $isMine }) =>
    $isMine
      ? 'linear-gradient(180deg, rgba(113, 180, 106, 0.98), rgba(86, 153, 83, 0.98))'
      : 'rgba(255, 255, 255, 0.96)'};
  color: ${({ $isMine, theme }) => ($isMine ? '#ffffff' : theme.colors.textStrong)};
  border: 1px solid
    ${({ $isMine, theme }) => ($isMine ? 'rgba(84, 142, 80, 0.8)' : theme.colors.borderStrong)};
  border-top-right-radius: ${({ $isMine }) => ($isMine ? '0.45rem' : '1.2rem')};
  border-top-left-radius: ${({ $isMine }) => ($isMine ? '1.2rem' : '0.45rem')};
  box-shadow: ${({ $isMine }) =>
    $isMine
      ? '0 14px 26px rgba(86, 153, 83, 0.22)'
      : '0 12px 24px rgba(96, 86, 58, 0.12)'};

  &::after {
    content: '';
    position: absolute;
    top: 0.78rem;
    ${({ $isMine }) => ($isMine ? 'right: -0.4rem;' : 'left: -0.4rem;')}
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 0.2rem;
    transform: rotate(45deg);
    background: ${({ $isMine }) =>
      $isMine ? 'rgba(95, 161, 91, 0.98)' : 'rgba(255, 255, 255, 0.96)'};
    border: 1px solid
      ${({ $isMine, theme }) =>
        $isMine ? 'rgba(84, 142, 80, 0.8)' : theme.colors.borderStrong};
    z-index: -1;
  }
`

const MessageTime = styled.span<{ $isMine: boolean }>`
  color: ${({ $isMine, theme }) =>
    $isMine ? 'rgba(255, 255, 255, 0.82)' : theme.colors.textSubtle};
  font-size: 0.74rem;
`

const MessageText = styled.p<{ $isMine: boolean }>`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ $isMine, theme }) => ($isMine ? '#ffffff' : theme.colors.textStrong)};
`

const EmptyState = styled.div`
  align-self: center;
  justify-self: center;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.92rem;
  line-height: 1.7;
  padding: 1.5rem;
`

const Composer = styled.form`
  display: grid;
  gap: 0.7rem;
  padding: 0.85rem;
  border-top: 1px solid ${({ theme }) => theme.colors.borderSoft};
  background: rgba(255, 255, 255, 0.95);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0.8rem;
  }
`

const AliasRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.82rem;
`

const DraftRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`

const DraftTextarea = styled.textarea`
  min-height: 3.25rem;
  max-height: 8rem;
  padding: 0.85rem 0.95rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.textStrong};
  resize: vertical;
  font: inherit;
  line-height: 1.5;

  &:focus {
    outline: 2px solid rgba(117, 171, 99, 0.28);
    outline-offset: 2px;
  }
`

const SendButton = styled.button`
  min-width: 5.2rem;
  min-height: 3rem;
  padding: 0 1rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.gradients.button};
  color: #ffffff;
  font-weight: 700;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`

function generateAlias() {
  return `익명 ${Math.floor(100 + Math.random() * 900)}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function LiveChatPanel() {
  const isOpen = useChatStore((state) => state.isOpen)
  const isLoading = useChatStore((state) => state.isLoading)
  const isSending = useChatStore((state) => state.isSending)
  const hasLoaded = useChatStore((state) => state.hasLoaded)
  const messages = useChatStore((state) => state.messages)
  const status = useChatStore((state) => state.status)
  const setIsOpen = useChatStore((state) => state.setIsOpen)
  const clearStatus = useChatStore((state) => state.clearStatus)
  const loadMessages = useChatStore((state) => state.loadMessages)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const upsertMessage = useChatStore((state) => state.upsertMessage)

  const [draft, setDraft] = useState('')
  const [alias] = useState(() => {
    if (typeof window === 'undefined') {
      return '익명'
    }

    const storageKey = 'bamboo-chat-alias'
    const savedAlias = window.sessionStorage.getItem(storageKey)
    const nextAlias = savedAlias || generateAlias()

    window.sessionStorage.setItem(storageKey, nextAlias)
    return nextAlias
  })
  const messageListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const unsubscribe = subscribeToChatMessages((message) => {
      upsertMessage(message)
    })

    return unsubscribe
  }, [upsertMessage])

  useEffect(() => {
    const node = messageListRef.current

    if (!node) {
      return
    }

    node.scrollTop = node.scrollHeight
  }, [messages.length, isOpen])

  const helperText = useMemo(() => {
    if (!isSupabaseConfigured) {
      return 'Supabase 연결 후 실시간 채팅이 활성화됩니다.'
    }

    return `현재 닉네임: ${alias}`
  }, [alias])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = draft.trim()

    if (!trimmed) {
      return
    }

    const result = await sendMessage({
      alias,
      message: trimmed,
    })

    if (result.ok) {
      setDraft('')
    }
  }

  return (
    <FloatingWrap>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <Panel
            key="chat-panel"
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Header>
              <HeaderTitleWrap>
                <HeaderTitle>실시간 대숲 채팅</HeaderTitle>
                <HeaderSub>
                  <StatusDot $active={isSupabaseConfigured} />
                  <span>{isSupabaseConfigured ? 'Realtime 연결됨' : '연결 대기 중'}</span>
                </HeaderSub>
              </HeaderTitleWrap>

              <HeaderActions>
                <IconButton type="button" onClick={() => setIsOpen(false)} aria-label="채팅 닫기">
                  ×
                </IconButton>
              </HeaderActions>
            </Header>

            {status ? (
              <StatusNotice $tone={status.tone}>
                <div>{status.message}</div>
              </StatusNotice>
            ) : null}

            <MessageList ref={messageListRef}>
              {isLoading && !hasLoaded ? (
                <EmptyState>채팅을 불러오는 중이에요...</EmptyState>
              ) : null}

              {!isLoading && messages.length === 0 ? (
                <EmptyState>
                  아직 대화가 없어요.
                  <br />
                  첫 메시지를 남겨보세요.
                </EmptyState>
              ) : null}

              {messages.map((message) => {
                const isMine = message.alias === alias

                return (
                  <MessageRow key={message.id} $isMine={isMine}>
                    <MessageStack $isMine={isMine}>
                      <MessageAuthor $isMine={isMine}>
                        {!isMine ? <AuthorDot $isMine={false} /> : null}
                        <strong>{isMine ? '나' : message.alias}</strong>
                        <MessageTime $isMine={isMine}>{formatTime(message.createdAt)}</MessageTime>
                        {isMine ? <AuthorDot $isMine /> : null}
                      </MessageAuthor>

                      <MessageBubble $isMine={isMine}>
                        <MessageText $isMine={isMine}>{message.message}</MessageText>
                      </MessageBubble>
                    </MessageStack>
                  </MessageRow>
                )
              })}
            </MessageList>

            <Composer onSubmit={handleSubmit}>
              <AliasRow>
                <span>{helperText}</span>
                {status ? (
                  <button type="button" onClick={clearStatus}>
                    닫기
                  </button>
                ) : null}
              </AliasRow>

              <DraftRow>
                <DraftTextarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="익명으로 한마디 남겨보세요"
                  maxLength={300}
                  disabled={!isSupabaseConfigured || isSending}
                  rows={2}
                />
                <SendButton type="submit" disabled={!isSupabaseConfigured || isSending}>
                  {isSending ? '전송 중' : '보내기'}
                </SendButton>
              </DraftRow>
            </Composer>
          </Panel>
        ) : (
          <TriggerButton
            key="chat-trigger"
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
          >
            <span>실시간 채팅</span>
            <span>{messages.length}</span>
          </TriggerButton>
        )}
      </AnimatePresence>
    </FloatingWrap>
  )
}
