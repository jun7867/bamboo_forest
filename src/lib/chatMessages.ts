import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'
import type { ChatMessage, SendChatMessageInput } from '../types/chat'

interface ChatMessageRow {
  id: string
  alias: string
  message: string
  created_at: string
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    alias: row.alias,
    message: row.message,
    createdAt: row.created_at,
  }
}

export async function fetchChatMessages(limit = 80) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('chat_messages')
    .select('id, alias, message, created_at')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error('채팅 내역을 불러오지 못했어요.')
  }

  return (data ?? []).map(mapChatMessage)
}

export async function sendChatMessage(input: SendChatMessageInput) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('chat_messages')
    .insert({
      alias: input.alias.trim(),
      message: input.message.trim(),
    })
    .select('id, alias, message, created_at')
    .single()

  if (error || !data) {
    throw new Error('메시지를 보내지 못했어요.')
  }

  return mapChatMessage(data)
}

export function subscribeToChatMessages(onInsert: (message: ChatMessage) => void) {
  const client = getSupabaseClient()
  const channel: RealtimeChannel = client
    .channel('public:chat_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        onInsert(mapChatMessage(payload.new as ChatMessageRow))
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
