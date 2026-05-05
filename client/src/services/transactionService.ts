import { Transaction, TransactionHistoryResult, LeaderboardItem } from 'shared/auth'
import api from './api'

export interface TipRequest {
  entityType: 'post' | 'comment' | 'donation' | 'post_unlock'
  entityId: string
  amount: number
  notes?: string
}

export const tipEntity = async (request: TipRequest): Promise<Transaction> => {
  const response = await api.post('/transactions/tip', request)
  return response.data
}

export const unlockPostWithPi = async (postId: string): Promise<Transaction> => {
  const response = await api.post('/transactions/unlock', { postId })
  return response.data
}

export const getTransactionHistory = async (page = 1, limit = 20): Promise<TransactionHistoryResult> => {
  const response = await api.get('/transactions/history', {
    params: { page, limit }
  })
  return response.data
}

export const getLeaderboard = async (limit = 10): Promise<LeaderboardItem[]> => {
  const response = await api.get('/transactions/leaderboard', {
    params: { limit }
  })
  return response.data.leaderboard
}

export const getTransaction = async (transactionId: string): Promise<Transaction> => {
  const response = await api.get(`/transactions/${transactionId}`)
  return response.data
}
