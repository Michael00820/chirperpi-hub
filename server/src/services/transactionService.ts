import axios from 'axios'
import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { CommentService } from './commentService'
import { NotificationService } from './notificationService'
import { getUserById, updateProfileBalanceCache } from './userService'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const PI_API_BASE_URL = process.env.PI_API_BASE_URL || 'https://api.minepi.com'
const PI_API_KEY = process.env.PI_API_KEY
const PI_EXPLORER_URL = process.env.PI_EXPLORER_URL || 'https://explorer.minepi.com/tx/'

const piClient = axios.create({
  baseURL: PI_API_BASE_URL,
  headers: {
    Authorization: PI_API_KEY ? `Bearer ${PI_API_KEY}` : ''
  },
  timeout: 12000
})

export class TransactionService {
  static async createTipTransaction(
    senderId: string,
    entityType: 'post' | 'comment' | 'donation' | 'post_unlock',
    entityId: string,
    amount: number,
    notes?: string
  ) {
    if (amount <= 0) {
      throw new Error('Tip amount must be greater than zero')
    }

    const sender = await getUserById(senderId)
    if (!sender) {
      throw new Error('Sender not found')
    }

    const receiverId = await this.resolveReceiverId(entityType, entityId)
    if (receiverId === senderId) {
      throw new Error('You cannot tip yourself')
    }

    const receiver = await getUserById(receiverId)
    if (!receiver) {
      throw new Error('Receiver not found')
    }

    const senderProfile = await pool.query('SELECT pi_balance_cache FROM profiles WHERE user_id = $1', [senderId])
    const currentBalance = parseFloat(senderProfile.rows[0]?.pi_balance_cache || 0)
    if (currentBalance < amount) {
      throw new Error('Insufficient Pi balance in cache')
    }

    const transactionId = uuidv4()
    await pool.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, entity_type, entity_id, amount, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())`,
      [transactionId, senderId, receiverId, entityType, entityId, amount, notes || null]
    )

    try {
      const paymentResult = await this.sendPiPayment(
        sender.pi_wallet_address,
        receiver.pi_wallet_address,
        amount,
        `${entityType} tip for ${entityId}`
      )

      const status = paymentResult.status as 'pending' | 'completed' | 'failed'
      const explorerUrl = paymentResult.explorerUrl || `${PI_EXPLORER_URL}${paymentResult.externalTransactionId}`

      await pool.query(
        `UPDATE transactions SET status = $1, external_transaction_id = $2, explorer_url = $3, updated_at = NOW() WHERE id = $4`,
        [status, paymentResult.externalTransactionId, explorerUrl, transactionId]
      )

      if (status === 'completed') {
        await this.finalizeTransaction(transactionId)
      }

      return this.getTransactionById(transactionId)
    } catch (error: any) {
      await pool.query(
        `UPDATE transactions SET status = 'failed', notes = $1, updated_at = NOW() WHERE id = $2`,
        [error?.message || 'Payment failed', transactionId]
      )
      throw new Error(error?.message || 'Failed to process Pi payment')
    }
  }

  static async unlockPostWithPi(userId: string, postId: string) {
    const postResult = await pool.query(
      'SELECT user_id, is_pi_locked, pi_unlock_amount FROM posts WHERE id = $1',
      [postId]
    )

    if (postResult.rows.length === 0) {
      throw new Error('Post not found')
    }

    const post = postResult.rows[0]
    if (!post.is_pi_locked) {
      throw new Error('This post is not gated for Pi access')
    }

    const amount = parseFloat(post.pi_unlock_amount || 0)
    if (amount <= 0) {
      throw new Error('Unlock amount is not configured for this post')
    }

    return this.createTipTransaction(userId, 'post_unlock', postId, amount, 'Unlock premium post')
  }

  static async handleWebhook(payload: any) {
    const transactionId = payload.transaction_id || payload.external_transaction_id || payload.id
    const status = payload.status
    const explorerUrl = payload.explorer_url || payload.explorerUrl

    if (!transactionId || !status) {
      throw new Error('Invalid webhook payload')
    }

    const transaction = await this.getTransactionByExternalId(transactionId)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    await pool.query(
      `UPDATE transactions SET status = $1, explorer_url = $2, updated_at = NOW() WHERE id = $3`,
      [status, explorerUrl, transaction.id]
    )

    if (status === 'completed') {
      await this.finalizeTransaction(transaction.id)
    }

    return transaction
  }

  static async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit
    const result = await pool.query(
      `SELECT t.*, s.username AS sender_username, s.avatar_url AS sender_avatar_url,
              r.username AS receiver_username, r.avatar_url AS receiver_avatar_url
       FROM transactions t
       JOIN users s ON t.sender_id = s.id
       JOIN users r ON t.receiver_id = r.id
       WHERE t.sender_id = $1 OR t.receiver_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE sender_id = $1 OR receiver_id = $1',
      [userId]
    )

    return {
      transactions: result.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        sender: {
          id: row.sender_id,
          username: row.sender_username,
          avatarUrl: row.sender_avatar_url
        },
        receiver: {
          id: row.receiver_id,
          username: row.receiver_username,
          avatarUrl: row.receiver_avatar_url
        },
        entityType: row.entity_type,
        entityId: row.entity_id,
        amount: parseFloat(row.amount),
        status: row.status,
        externalTransactionId: row.external_transaction_id,
        explorerUrl: row.explorer_url,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total: parseInt(countResult.rows[0].total, 10),
      hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total, 10)
    }
  }

  static async getLeaderboard(limit = 10) {
    const result = await pool.query(
      `SELECT s.id AS user_id, s.username, s.display_name, s.avatar_url, SUM(t.amount) AS total_support_given
       FROM transactions t
       JOIN users s ON t.sender_id = s.id
       WHERE t.status = 'completed'
       GROUP BY s.id, s.username, s.display_name, s.avatar_url
       ORDER BY total_support_given DESC
       LIMIT $1`,
      [limit]
    )

    return result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      totalSupportGiven: parseFloat(row.total_support_given || 0)
    }))
  }

  static async getTransactionById(transactionId: string) {
    const result = await pool.query(
      `SELECT t.*, s.username AS sender_username, s.avatar_url AS sender_avatar_url,
              r.username AS receiver_username, r.avatar_url AS receiver_avatar_url
       FROM transactions t
       JOIN users s ON t.sender_id = s.id
       JOIN users r ON t.receiver_id = r.id
       WHERE t.id = $1`,
      [transactionId]
    )

    if (result.rows.length === 0) return null
    const row = result.rows[0]
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      sender: {
        id: row.sender_id,
        username: row.sender_username,
        avatarUrl: row.sender_avatar_url
      },
      receiver: {
        id: row.receiver_id,
        username: row.receiver_username,
        avatarUrl: row.receiver_avatar_url
      },
      entityType: row.entity_type,
      entityId: row.entity_id,
      amount: parseFloat(row.amount),
      status: row.status,
      externalTransactionId: row.external_transaction_id,
      explorerUrl: row.explorer_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  static async getTransactionByExternalId(externalTransactionId: string) {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE external_transaction_id = $1',
      [externalTransactionId]
    )
    return result.rows[0] || null
  }

  private static async resolveReceiverId(entityType: string, entityId: string) {
    if (!entityId) {
      throw new Error('Entity ID is required')
    }

    if (entityType === 'comment') {
      const comment = await CommentService.getCommentById(entityId)
      if (!comment) {
        throw new Error('Comment not found')
      }
      return comment.user.id
    }

    const result = await pool.query('SELECT user_id FROM posts WHERE id = $1', [entityId])
    if (result.rows.length === 0) {
      throw new Error('Referenced post not found')
    }

    return result.rows[0].user_id
  }

  private static async sendPiPayment(senderWallet: string, receiverWallet: string, amount: number, memo: string) {
    if (!PI_API_KEY) {
      throw new Error('Pi API key is not configured')
    }

    if (!senderWallet || !receiverWallet) {
      throw new Error('Sender or receiver Pi wallet address is not configured')
    }

    const response = await piClient.post('/payments', {
      sender_wallet_address: senderWallet,
      receiver_wallet_address: receiverWallet,
      amount,
      currency: 'PI',
      memo
    })

    return {
      externalTransactionId: response.data?.transaction_id || response.data?.id,
      status: response.data?.status || 'pending',
      explorerUrl: response.data?.explorer_url || response.data?.explorerUrl
    }
  }

  private static async finalizeTransaction(transactionId: string) {
    const transaction = await this.getTransactionById(transactionId)
    if (!transaction) {
      return
    }

    const amount = transaction.amount
    await updateProfileBalanceCache(transaction.senderId, -amount)
    await updateProfileBalanceCache(transaction.receiverId, amount)

    if (transaction.entityType === 'post_unlock' && transaction.entityId) {
      await pool.query(
        `INSERT INTO pi_access (user_id, post_id, unlocked_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, post_id) DO NOTHING`,
        [transaction.senderId, transaction.entityId]
      )
    }

    if (transaction.entityType === 'donation' && transaction.entityId) {
      await pool.query(
        `UPDATE posts SET donation_received = donation_received + $1 WHERE id = $2`,
        [amount, transaction.entityId]
      )
    }

    await NotificationService.createNotification(
      transaction.receiverId,
      transaction.senderId,
      'pi_transaction',
      transaction.entityType,
      transaction.entityId
    )
  }
}
