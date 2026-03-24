export interface ChatMessage {
  id: string
  alias: string
  message: string
  createdAt: string
}

export interface SendChatMessageInput {
  alias: string
  message: string
}
