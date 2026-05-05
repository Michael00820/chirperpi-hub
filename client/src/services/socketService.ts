import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from 'shared/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const createMessagingSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
  const token = localStorage.getItem('authToken')
  return io(API_URL, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket']
  })
}
