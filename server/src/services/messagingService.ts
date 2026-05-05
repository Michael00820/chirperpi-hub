import { Pool } from 'pg';
import { createClient } from 'redis';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageReaction,
  SendMessageRequest,
  CreateConversationRequest,
  ConversationListResult,
  MessageListResult,
  PiTransactionData,
  PiPaymentRequestData
} from '../../../shared/src/auth';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

export class MessagingService {
  constructor(private pool: Pool) {}

  // Conversation management
  async createConversation(userId: string, request: CreateConversationRequest): Promise<Conversation> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create conversation
      const conversationResult = await client.query(
        `INSERT INTO conversations (type, name, description, avatar_url, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, type, name, description, avatar_url, created_at, updated_at`,
        [request.type, request.name || null, request.description || null, request.avatarUrl || null, userId]
      );

      const conversation = conversationResult.rows[0];

      // Add creator as participant
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role, is_online)
         VALUES ($1, $2, 'admin', true)`,
        [conversation.id, userId]
      );

      // Add other participants
      for (const participantId of request.participantIds) {
        if (participantId !== userId) {
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, is_online)
             VALUES ($1, $2, false)`,
            [conversation.id, participantId]
          );
        }
      }

      await client.query('COMMIT');

      return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        avatarUrl: conversation.avatar_url,
        participants: [],
        unreadCount: 0,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const cacheKey = `conversation:${conversationId}:${userId}`
    const cached = await redisClient.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await this.pool.query(
      `SELECT c.*,
              COALESCE(COUNT(cm.id) FILTER (WHERE cm.is_read = false AND cm.sender_id != $2), 0)::int as unread_count,
              JSON_AGG(JSON_BUILD_OBJECT(
                'userId', cp.user_id,
                'user', JSON_BUILD_OBJECT(
                  'id', u.id,
                  'username', u.username,
                  'displayName', p.display_name,
                  'avatarUrl', p.avatar_url
                ),
                'role', cp.role,
                'joinedAt', cp.joined_at,
                'lastSeenAt', cp.last_seen_at,
                'isOnline', cp.is_online
              )) as participants
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN users u ON cp.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
       WHERE c.id = $1 AND $2 IN (SELECT user_id FROM conversation_participants WHERE conversation_id = $1)
       GROUP BY c.id`,
      [conversationId, userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const lastMessageResult = await this.pool.query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [conversationId]
    );

    const conversation = {
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatar_url,
      participants: row.participants || [],
      lastMessage: lastMessageResult.rows[0] ? this.formatMessage(lastMessageResult.rows[0]) : undefined,
      unreadCount: row.unread_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    await redisClient.setEx(cacheKey, 120, JSON.stringify(conversation))
    return conversation;
  }

  async listConversations(userId: string, limit: number = 20, offset: number = 0): Promise<ConversationListResult> {
    const result = await this.pool.query(
      `SELECT c.*, 
              COALESCE(COUNT(cm.id) FILTER (WHERE cm.is_read = false AND cm.sender_id != $1), 0)::int as unread_count,
              MAX(cm.created_at) as last_message_time
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
       WHERE $1 IN (SELECT user_id FROM conversation_participants WHERE conversation_id = c.id)
       GROUP BY c.id
       ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(DISTINCT c.id) as total
       FROM conversations c
       WHERE $1 IN (SELECT user_id FROM conversation_participants WHERE conversation_id = c.id)`,
      [userId]
    );

    const conversations = await Promise.all(
      result.rows.map(async (row) => {
        const conv = await this.getConversation(row.id, userId);
        return conv!;
      })
    );

    return {
      conversations,
      total: parseInt(totalResult.rows[0].total),
      hasMore: (offset + limit) < parseInt(totalResult.rows[0].total)
    };
  }

  // Message operations
  async sendMessage(userId: string, request: SendMessageRequest): Promise<Message> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create message
      const messageResult = await client.query(
        `INSERT INTO conversation_messages
         (conversation_id, sender_id, content, message_type, media_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conversation_id, sender_id, content, message_type, media_url, created_at, updated_at`,
        [request.conversationId, userId, request.content, request.messageType, request.mediaUrl || null]
      );

      const message = messageResult.rows[0];

      // Handle Pi transaction data
      if (request.piTransaction && request.messageType === 'pi_transaction') {
        await client.query(
          `INSERT INTO message_pi_transactions
           (message_id, transaction_id, amount, from_user_id, to_user_id, status, explorer_url, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            message.id,
            request.piTransaction.transactionId,
            request.piTransaction.amount,
            request.piTransaction.fromUserId,
            request.piTransaction.toUserId,
            request.piTransaction.status,
            request.piTransaction.explorerUrl || null,
            request.piTransaction.notes || null
          ]
        );
      }

      // Handle Pi payment request data
      if (request.piPaymentRequest && request.messageType === 'pi_payment_request') {
        await client.query(
          `INSERT INTO message_payment_requests
           (message_id, amount, description, requester_id, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            message.id,
            request.piPaymentRequest.amount,
            request.piPaymentRequest.description,
            request.piPaymentRequest.requesterId,
            request.piPaymentRequest.status,
            request.piPaymentRequest.expiresAt
          ]
        );
      }

      // Update conversation updated_at
      await client.query(
        `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
        [request.conversationId]
      );

      // Invalidate conversation caches
      await redisClient.del(`conversation:${request.conversationId}:*`)
      await redisClient.del(`conversations:list:*`)

      // Store in Redis cache for quick access
      await redisClient.publish(`messages:${request.conversationId}`, JSON.stringify({
        type: 'new_message',
        data: message
      }));

      await client.query('COMMIT');

      return this.formatMessage(message);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

        [request.conversationId]
      );

      // Store in Redis cache for quick access
      await redisClient.publish(`messages:${request.conversationId}`, JSON.stringify({
        type: 'new_message',
        data: message
      }));

      await client.query('COMMIT');

      return this.formatMessage(message);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMessages(conversationId: string, userId: string, limit: number = 50, offset: number = 0): Promise<MessageListResult> {
    const cacheKey = `messages:${conversationId}:${limit}:${offset}`
    const cached = await redisClient.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Verify user is participant
    const participantCheck = await this.pool.query(
      `SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      throw new Error('User is not a participant in this conversation');
    }

    const result = await this.pool.query(
      `SELECT * FROM conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM conversation_messages WHERE conversation_id = $1`,
      [conversationId]
    );

    const messages = await Promise.all(
      result.rows.map(row => this.formatMessage(row))
    );

    const resultData = {
      messages: messages.reverse(),
      total: parseInt(totalResult.rows[0].total),
      hasMore: (offset + limit) < parseInt(totalResult.rows[0].total)
    };

    await redisClient.setEx(cacheKey, 30, JSON.stringify(resultData))
    return resultData;
  }

  // Reactions
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const result = await this.pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO UPDATE SET created_at = NOW()
       RETURNING *`,
      [messageId, userId, emoji]
    );

    const reaction = result.rows[0];
    return {
      id: reaction.id,
      messageId: reaction.message_id,
      userId: reaction.user_id,
      user: { id: userId, username: '', displayName: '', avatarUrl: '' },
      emoji: reaction.emoji,
      createdAt: reaction.created_at
    };
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji]
    );
  }

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const result = await this.pool.query(
      `SELECT mr.*, u.id, u.username, p.display_name, p.avatar_url
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE mr.message_id = $1`,
      [messageId]
    );

    return result.rows.map(row => ({
      id: row.id,
      messageId: row.message_id,
      userId: row.user_id,
      user: {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      },
      emoji: row.emoji,
      createdAt: row.created_at
    }));
  }

  // Read receipts
  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO message_read_receipts (message_id, user_id) VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );

    // Update message read status if this is the current user
    await this.pool.query(
      `UPDATE conversation_messages SET is_read = true WHERE id = $1 AND sender_id != $2`,
      [messageId, userId]
    );

    // Invalidate conversation cache
    const conversationResult = await this.pool.query(
      `SELECT conversation_id FROM conversation_messages WHERE id = $1`,
      [messageId]
    );
    if (conversationResult.rows.length > 0) {
      await redisClient.del(`conversation:${conversationResult.rows[0].conversation_id}:*`);
    }
  }

  async getReadReceipts(messageId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT user_id FROM message_read_receipts WHERE message_id = $1`,
      [messageId]
    );

    return result.rows.map(row => row.user_id);
  }

  // Typing indicators
  async setTypingIndicator(conversationId: string, userId: string): Promise<void> {
    // Store in Redis with expiration
    await redisClient.setEx(
      `typing:${conversationId}:${userId}`,
      3, // 3 seconds expiration
      JSON.stringify({ userId, timestamp: new Date().toISOString() })
    );

    // Publish to subscribers
    await redisClient.publish(`typing:${conversationId}`, JSON.stringify({
      userId,
      timestamp: new Date().toISOString()
    }));
  }

  async clearTypingIndicator(conversationId: string, userId: string): Promise<void> {
    await redisClient.del(`typing:${conversationId}:${userId}`);
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const keys = await redisClient.keys(`typing:${conversationId}:*`);
    return keys.map(key => key.split(':').pop()!).filter(Boolean);
  }

  // Online status
  async setUserOnline(userId: string): Promise<void> {
    await redisClient.setEx(`user:online:${userId}`, 24 * 60 * 60, 'true');

    // Update all user's conversation participants
    const conversations = await this.pool.query(
      `UPDATE conversation_participants SET is_online = true WHERE user_id = $1`,
      [userId]
    );
  }

  async setUserOffline(userId: string): Promise<void> {
    await redisClient.del(`user:online:${userId}`);

    // Update all user's conversation participants
    await this.pool.query(
      `UPDATE conversation_participants SET is_online = false, last_seen_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }

  // Search
  async searchMessages(conversationId: string, query: string, userId: string): Promise<Message[]> {
    const result = await this.pool.query(
      `SELECT * FROM conversation_messages
       WHERE conversation_id = $1 
       AND $2 IN (SELECT user_id FROM conversation_participants WHERE conversation_id = $1)
       AND (content ILIKE $3 OR message_type ILIKE $3)
       ORDER BY created_at DESC
       LIMIT 100`,
      [conversationId, userId, `%${query}%`]
    );

    return Promise.all(result.rows.map(row => this.formatMessage(row)));
  }

  // Helper to format message with all related data
  private async formatMessage(row: any): Promise<Message> {
    const reactions = await this.getMessageReactions(row.id);
    const readBy = await this.getReadReceipts(row.id);

    let piTransaction: PiTransactionData | undefined;
    let piPaymentRequest: PiPaymentRequestData | undefined;

    if (row.message_type === 'pi_transaction') {
      const txResult = await this.pool.query(
        `SELECT * FROM message_pi_transactions WHERE message_id = $1`,
        [row.id]
      );
      if (txResult.rows.length > 0) {
        const tx = txResult.rows[0];
        piTransaction = {
          transactionId: tx.transaction_id,
          amount: tx.amount,
          currency: 'PI',
          fromUserId: tx.from_user_id,
          toUserId: tx.to_user_id,
          status: tx.status,
          explorerUrl: tx.explorer_url,
          notes: tx.notes
        };
      }
    }

    if (row.message_type === 'pi_payment_request') {
      const prResult = await this.pool.query(
        `SELECT * FROM message_payment_requests WHERE message_id = $1`,
        [row.id]
      );
      if (prResult.rows.length > 0) {
        const pr = prResult.rows[0];
        piPaymentRequest = {
          amount: pr.amount,
          currency: 'PI',
          description: pr.description,
          requesterId: pr.requester_id,
          status: pr.status,
          expiresAt: pr.expires_at
        };
      }
    }

    // Get sender info
    const senderResult = await this.pool.query(
      `SELECT u.id, u.username, p.display_name, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [row.sender_id]
    );

    const sender = senderResult.rows[0] || { id: row.sender_id, username: 'Unknown' };

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      sender: {
        id: sender.id,
        username: sender.username,
        displayName: sender.display_name,
        avatarUrl: sender.avatar_url
      },
      content: row.content,
      messageType: row.message_type,
      mediaUrl: row.media_url,
      piTransaction,
      piPaymentRequest,
      reactions,
      isEdited: row.is_edited,
      editedAt: row.edited_at,
      isRead: row.is_read,
      readBy,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
