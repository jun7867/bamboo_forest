import { create } from 'zustand'
import { fetchChatMessages, sendChatMessage } from '../lib/chatMessages'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ChatMessage, SendChatMessageInput } from '../types/chat'

interface ChatStatus {
  tone: 'info' | 'error'
  message: string
}

interface ChatStore {
  isOpen: boolean
  isLoading: boolean
  isSending: boolean
  hasLoaded: boolean
  messages: ChatMessage[]
  status: ChatStatus | null
  setIsOpen: (isOpen: boolean) => void
  clearStatus: () => void
  loadMessages: () => Promise<void>
  sendMessage: (input: SendChatMessageInput) => Promise<{ ok: boolean; message?: string }>
  upsertMessage: (message: ChatMessage) => void
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )
}

export const useChatStore = create<ChatStore>((set, get) => ({
  isOpen: false,
  isLoading: false,
  isSending: false,
  hasLoaded: false,
  messages: [],
  status: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  clearStatus: () => set({ status: null }),
  loadMessages: async () => {
    if (get().hasLoaded) {
      return
    }

    if (!isSupabaseConfigured) {
      set({
        hasLoaded: true,
        status: {
          tone: 'info',
          message: 'Supabase 연결 전이라 실시간 채팅이 비활성화되어 있어요.',
        },
      })
      return
    }

    set({ isLoading: true, status: null })

    try {
      const messages = await fetchChatMessages()

      set({
        messages,
        isLoading: false,
        hasLoaded: true,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '채팅을 불러오지 못했어요.'

      set({
        isLoading: false,
        hasLoaded: true,
        status: {
          tone: 'error',
          message,
        },
      })
    }
  },
  sendMessage: async (input) => {
    if (!isSupabaseConfigured) {
      const message = 'Supabase 연결 후에 채팅을 사용할 수 있어요.'
      set({
        status: {
          tone: 'info',
          message,
        },
      })
      return { ok: false, message }
    }

    set({ isSending: true })

    try {
      const nextMessage = await sendChatMessage(input)

      get().upsertMessage(nextMessage)
      set({
        isSending: false,
        status: null,
      })

      return { ok: true }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '메시지를 보내지 못했어요.'

      set({
        isSending: false,
        status: {
          tone: 'error',
          message,
        },
      })

      return { ok: false, message }
    }
  },
  upsertMessage: (message) =>
    set((state) => {
      const exists = state.messages.some((item) => item.id === message.id)
      const nextMessages = exists
        ? state.messages.map((item) => (item.id === message.id ? message : item))
        : [...state.messages, message]

      return {
        messages: sortMessages(nextMessages),
      }
    }),
}))
