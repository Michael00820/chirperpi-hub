import api from './api'
import {
  Conversation,
  ConversationListResult,
  MessageListResult,
  Message,
  SendMessageRequest
} from 'shared/auth'

export const listConversations = async (
  page = 1,
  limit = 20
): Promise<ConversationListResult> => {
  const response = await api.get('/messaging/conversations', {
    params: { limit, offset: (page - 1) * limit }
  })
  return response.data
}

export const getConversation = async (conversationId: string): Promise<Conversation> => {
  const response = await api.get(`/messaging/conversations/${conversationId}`)
  return response.data
}

export const getConversationMessages = async (
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<MessageListResult> => {
  const response = await api.get(`/messaging/conversations/${conversationId}/messages`, {
    params: { limit, offset }
  })
  return response.data
}

export const searchConversationMessages = async (
  conversationId: string,
  query: string
): Promise<MessageListResult> => {
  const response = await api.get(`/messaging/conversations/${conversationId}/search`, {
    params: { query }
  })
  return response.data
}

export const sendMessage = async (
  conversationId: string,
  request: SendMessageRequest
): Promise<Message> => {
  const response = await api.post(`/messaging/conversations/${conversationId}/messages`, request)
  return response.data
}

export const addReaction = async (messageId: string, emoji: string): Promise<any> => {
  const response = await api.post(`/messaging/messages/${messageId}/reactions`, { emoji })
  return response.data
}

export const removeReaction = async (messageId: string, emoji: string): Promise<void> => {
  await api.delete(`/messaging/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
}

export const markMessageRead = async (messageId: string): Promise<void> => {
  await api.post(`/messaging/messages/${messageId}/read`)
}
