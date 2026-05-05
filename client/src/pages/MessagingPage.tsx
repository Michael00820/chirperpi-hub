import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Search, Send, Loader2 } from 'lucide-react'
import { createMessagingSocket } from '../services/socketService'
import {
  addReaction,
  getConversation,
  getConversationMessages,
  listConversations,
  markMessageRead,
  removeReaction,
  searchConversationMessages
} from '../services/messagingService'
import type {
  Conversation,
  Message,
  TypingIndicator
} from 'shared/auth'

const DEFAULT_REACTIONS = ['❤️', '💚', '🚀', '🎉', '👏']

function parseJwt(token: string | null) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

const MessagingPage = () => {
  const { conversationId: routeConversationId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('authToken')
  const currentUserId = useMemo(() => parseJwt(token)?.userId as string | undefined, [token])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef<any>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const getCurrentConversationParticipants = useCallback(() => {
    if (!currentConversation) return []
    return currentConversation.participants.filter((participant) => participant.userId !== currentUserId)
  }, [currentConversation, currentUserId])

  const activeTypingUsers = useMemo(() => {
    return typingUsers.filter((indicator) => indicator.conversationId === currentConversation?.id)
  }, [typingUsers, currentConversation])

  const updateConversationPreview = useCallback((conversationId: string, update: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, ...update } : conversation
      )
    )
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true)
      const result = await listConversations()
      setConversations(result.conversations)
    } catch (error) {
      console.error('Failed to load conversations', error)
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUserId) return
      setLoadingMessages(true)
      try {
        const conversation = await getConversation(conversationId)
        if (currentConversation?.id && currentConversation.id !== conversationId) {
          socketRef.current?.emit('leaveConversation', currentConversation.id)
        }

        setCurrentConversation(conversation)
        activeConversationIdRef.current = conversationId
        navigate(`/messages/${conversationId}`, { replace: true })

        const messagesResult = await getConversationMessages(conversationId)
        setMessages(messagesResult.messages)
        setSearchResults([])
        setSearchQuery('')

        socketRef.current?.emit('joinConversation', conversationId)

        const unreadMessageIds = messagesResult.messages
          .filter((message) => message.senderId !== currentUserId && !message.readBy.includes(currentUserId))
          .map((message) => message.id)

        await Promise.all(unreadMessageIds.map((messageId) => markMessageRead(messageId)))

        updateConversationPreview(conversationId, {
          unreadCount: 0,
          lastMessage: messagesResult.messages[messagesResult.messages.length - 1] || conversation.lastMessage
        })
      } catch (error) {
        console.error('Failed to load conversation', error)
      } finally {
        setLoadingMessages(false)
      }
    },
    [currentConversation, currentUserId, navigate, updateConversationPreview]
  )

  useEffect(() => {
    if (!currentUserId) return
    loadConversations()
  }, [currentUserId, loadConversations])

  useEffect(() => {
    if (!currentUserId) return

    const socket = createMessagingSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      if (activeConversationIdRef.current) {
        socket.emit('joinConversation', activeConversationIdRef.current)
      }
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('message', (message: Message) => {
      if (message.conversationId === activeConversationIdRef.current) {
        setMessages((prev) => [...prev, message])
      }

      updateConversationPreview(message.conversationId, {
        lastMessage: message,
        unreadCount:
          activeConversationIdRef.current === message.conversationId
            ? 0
            : (conversations.find((c) => c.id === message.conversationId)?.unreadCount || 0) + 1
      })
    })

    socket.on('typingStart', (indicator: TypingIndicator) => {
      if (indicator.userId === currentUserId) return
      setTypingUsers((prev) => [...prev.filter((item) => item.userId !== indicator.userId), indicator])
    })

    socket.on('typingStop', ({ conversationId, userId }) => {
      setTypingUsers((prev) => prev.filter((item) => item.userId !== userId || item.conversationId !== conversationId))
    })

    socket.on('messageReaction', (reaction) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== reaction.messageId) {
            return message
          }

          if (reaction.emoji === null) {
            return {
              ...message,
              reactions: message.reactions.filter((existing) => existing.userId !== reaction.userId)
            }
          }

          const updatedReactions = message.reactions.filter((existing) => existing.id !== reaction.id)
          return {
            ...message,
            reactions: [...updatedReactions, reaction]
          }
        })
      )
    })

    socket.on('messageRead', ({ messageId, userId, conversationId }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                isRead: true,
                readBy: Array.from(new Set([...message.readBy, userId]))
              }
            : message
        )
      )

      if (activeConversationIdRef.current === conversationId) {
        updateConversationPreview(conversationId, { unreadCount: 0 })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [currentUserId, updateConversationPreview, conversations])

  useEffect(() => {
    if (!routeConversationId || conversations.length === 0) return
    const foundConversation = conversations.find((conversation) => conversation.id === routeConversationId)
    if (foundConversation) {
      loadConversation(routeConversationId)
    }
  }, [routeConversationId, conversations, loadConversation])

  useEffect(() => {
    if (!routeConversationId && conversations.length > 0 && !currentConversation) {
      loadConversation(conversations[0].id)
    }
  }, [routeConversationId, conversations, currentConversation, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, searchResults])

  const handleSendMessage = async () => {
    if (!messageDraft.trim() || !currentConversation) return
    socketRef.current?.emit('sendMessage', {
      conversationId: currentConversation.id,
      content: messageDraft.trim(),
      messageType: 'text'
    })
    setMessageDraft('')
    handleTypingStop()
  }

  const handleTypingStart = () => {
    if (!currentConversation) return
    socketRef.current?.emit('typingStart', currentConversation.id)
  }

  const handleTypingStop = () => {
    if (!currentConversation) return
    socketRef.current?.emit('typingStop', currentConversation.id)
  }

  const handleSearchMessages = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentConversation || !searchQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await searchConversationMessages(currentConversation.id, searchQuery.trim())
      setSearchResults(result.messages)
    } catch (error) {
      console.error('Search failed', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleReactionClick = async (message: Message, emoji: string) => {
    const existingReaction = message.reactions.find(
      (reaction) => reaction.userId === currentUserId && reaction.emoji === emoji
    )

    try {
      if (existingReaction) {
        await removeReaction(message.id, emoji)
      } else {
        await addReaction(message.id, emoji)
      }
    } catch (error) {
      console.error('Failed to update reaction', error)
    }
  }

  if (!currentUserId) {
    return (
      <div className="p-8 text-center text-gray-700">
        Please log in to access your messages.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
            <p className="mt-1 text-sm text-slate-500">Real-time chat, search, reactions, and typing presence.</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700">
            {socketConnected ? 'Connected' : 'Offline'}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {conversations.length}
              </span>
            </div>
            <div className="space-y-3">
              {loadingConversations ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500">Loading conversations…</div>
              ) : conversations.length === 0 ? (
                <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">
                  No conversations yet. Start a message or wait for someone to reach out.
                </div>
              ) : (
                conversations.map((conversation) => {
                  const isActive = currentConversation?.id === conversation.id
                  const otherUser = conversation.participants.find((participant) => participant.userId !== currentUserId)
                  const title = conversation.type === 'direct'
                    ? otherUser?.user.displayName || otherUser?.user.username || 'Direct Chat'
                    : conversation.name || 'Group Chat'
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => loadConversation(conversation.id)}
                      className={`w-full rounded-3xl p-4 text-left transition focus:outline-none ${
                        isActive ? 'bg-slate-100 border border-slate-200' : 'bg-white border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {conversation.lastMessage?.content.slice(0, 40) || 'No messages yet'}
                          </div>
                        </div>
                        <div className="text-right">
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex rounded-full bg-blue-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {currentConversation
                      ? currentConversation.type === 'direct'
                        ? getCurrentConversationParticipants().map((participant) => participant.user.displayName || participant.user.username).join(', ')
                        : currentConversation.name || 'Group chat'
                      : 'Select a conversation'}
                  </h2>
                  {currentConversation?.type === 'direct' && (
                    <p className="text-sm text-slate-500">
                      {getCurrentConversationParticipants()[0]?.isOnline ? 'Online' : 'Last seen recently'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-wide text-slate-600">
                    {socketConnected ? 'Live chat' : 'Reconnect to see updates'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <form onSubmit={handleSearchMessages} className="flex gap-2">
                <label className="sr-only" htmlFor="message-search">Search messages</label>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="message-search"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Search messages in this conversation"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </button>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 min-h-[420px]">
                {loadingMessages ? (
                  <div className="flex h-96 items-center justify-center text-sm text-slate-500">Loading messages…</div>
                ) : !currentConversation ? (
                  <div className="flex h-96 items-center justify-center text-sm text-slate-500">
                    Select a conversation to start messaging.
                  </div>
                ) : (searchQuery.trim() && searchResults.length === 0 ? (
                  <div className="flex h-96 items-center justify-center text-sm text-slate-500">No messages found for "{searchQuery}".</div>
                ) : (
                  <div className="space-y-4">
                    {(searchQuery.trim() ? searchResults : messages).map((message) => {
                      const isOwnMessage = message.senderId === currentUserId
                      const senderLabel = message.sender.displayName || message.sender.username
                      const ownReaction = message.reactions.find((reaction) => reaction.userId === currentUserId)

                      return (
                        <div
                          key={message.id}
                          className={`rounded-3xl p-4 ${isOwnMessage ? 'bg-blue-50 self-end' : 'bg-white'} shadow-sm`}
                        >
                          <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                            <span>{senderLabel}</span>
                            <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{message.content}</div>
                          {message.reactions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-sm">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(
                                  message.reactions.reduce((map, reaction) => {
                                    map[reaction.emoji] = (map[reaction.emoji] || 0) + 1
                                    return map
                                  }, {} as Record<string, number>)
                                ).map(([emoji, count]) => (
                                  <span key={emoji} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                    {emoji} {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {ownReaction ? (
                              <button
                                type="button"
                                className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200"
                                onClick={() => handleReactionClick(message, ownReaction.emoji)}
                              >
                                Remove {ownReaction.emoji}
                              </button>
                            ) : (
                              DEFAULT_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200"
                                  onClick={() => handleReactionClick(message, emoji)}
                                >
                                  {emoji}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {activeTypingUsers.length > 0 && (
                      <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-600">
                        {activeTypingUsers.map((indicator) => indicator.user.displayName || indicator.user.username).join(', ')} typing...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                <textarea
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onFocus={handleTypingStart}
                  onBlur={handleTypingStop}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="min-h-[120px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Write a message..."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Press Enter to send, Shift + Enter for a new line.</span>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                    Send message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessagingPage
