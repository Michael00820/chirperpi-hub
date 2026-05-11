import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { Pool } from 'pg';
import { MessagingService } from './services/messagingService';
import { AuthService } from './services/authService';
import { ServerToClientEvents, ClientToServerEvents, TypingIndicator, SendMessageRequest } from '../../shared/src/auth';
import { redisClient } from './infrastructure/clients';

// Store user socket IDs for targeting specific users
const userSockets = new Map<string, Set<string>>();
const conversationRooms = new Map<string, Set<string>>();

export function initializeSocketIO(io: Server, pool: Pool) {
  const messagingService = new MessagingService(pool);

  // Middleware for authentication
  io.use((socket: Socket<ClientToServerEvents, ServerToClientEvents>, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const payload = AuthService.verifyJWT(token);
      socket.data.userId = payload.userId;
      next();
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    const userId = socket.data.userId as string;

    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join the user's private notification room
    socket.join(`user:${userId}`);

    // Set user online
    await messagingService.setUserOnline(userId);
    io.emit('userOnline', { userId, isOnline: true });

    // Handle joining a conversation
    socket.on('joinConversation', async (conversationId: string) => {
      console.log(`User ${userId} joining conversation ${conversationId}`);

      // Join the room
      socket.join(`conversation:${conversationId}`);

      // Track in conversations
      if (!conversationRooms.has(conversationId)) {
        conversationRooms.set(conversationId, new Set());
      }
      conversationRooms.get(conversationId)!.add(userId);

      // Get conversation with latest messages
      const conversation = await messagingService.getConversation(conversationId, userId);
      if (conversation) {
        socket.emit('conversationLoaded', conversation);

        // Notify others in the conversation
        socket.to(`conversation:${conversationId}`).emit('userJoined', {
          conversationId,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle leaving a conversation
    socket.on('leaveConversation', async (conversationId: string) => {
      console.log(`User ${userId} leaving conversation ${conversationId}`);

      socket.leave(`conversation:${conversationId}`);

      const users = conversationRooms.get(conversationId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          conversationRooms.delete(conversationId);
        }
      }

      // Clear typing indicator when leaving
      await messagingService.clearTypingIndicator(conversationId, userId);

      socket.to(`conversation:${conversationId}`).emit('userLeft', {
        conversationId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle sending a message
    socket.on('sendMessage', async (messageRequest: SendMessageRequest) => {
      try {
        console.log(`Message from ${userId} in ${messageRequest.conversationId}`);

        // Save message
        const message = await messagingService.sendMessage(userId, messageRequest);

        // Clear typing indicator
        await messagingService.clearTypingIndicator(messageRequest.conversationId, userId);

        // Broadcast to conversation room
        io.to(`conversation:${messageRequest.conversationId}`).emit('message', message);

        // Publish to Redis for cross-instance delivery
        await redisClient.publish(
          `messages:${messageRequest.conversationId}`,
          JSON.stringify({ type: 'new_message', data: message })
        );
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error' as any, { message: 'Failed to send message' });
      }
    });

    // Handle message reactions
    socket.on('addReaction', async (data: { messageId: string; emoji: string }) => {
      try {
        const reaction = await messagingService.addReaction(data.messageId, userId, data.emoji);

        // Get the message to find its conversation
        const messageResult = await pool.query(
          `SELECT conversation_id FROM conversation_messages WHERE id = $1`,
          [data.messageId]
        );

        if (messageResult.rows.length > 0) {
          const conversationId = messageResult.rows[0].conversation_id;
          io.to(`conversation:${conversationId}`).emit('messageReaction', reaction);

          // Publish to Redis
          await redisClient.publish(
            `reactions:${conversationId}`,
            JSON.stringify({ type: 'reaction_added', data: reaction })
          );
        }
      } catch (error) {
        console.error('Error adding reaction:', error);
        socket.emit('error' as any, { message: 'Failed to add reaction' });
      }
    });

    // Handle removing reactions
    socket.on('removeReaction', async (data: { messageId: string; emoji: string }) => {
      try {
        await messagingService.removeReaction(data.messageId, userId, data.emoji);

        // Get the message to find its conversation
        const messageResult = await pool.query(
          `SELECT conversation_id FROM conversation_messages WHERE id = $1`,
          [data.messageId]
        );

        if (messageResult.rows.length > 0) {
          const conversationId = messageResult.rows[0].conversation_id;
          io.to(`conversation:${conversationId}`).emit('messageReaction', {
            messageId: data.messageId,
            userId,
            emoji: null // null indicates removal
          });
        }
      } catch (error) {
        console.error('Error removing reaction:', error);
        socket.emit('error' as any, { message: 'Failed to remove reaction' });
      }
    });

    // Handle typing indicators
    socket.on('typingStart', async (conversationId: string) => {
      try {
        await messagingService.setTypingIndicator(conversationId, userId);

        // Get sender info
        const userResult = await pool.query(
          `SELECT u.id, u.username, p.display_name, p.avatar_url
           FROM users u
           LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.id = $1`,
          [userId]
        );

        const user = userResult.rows[0];
        const typingIndicator: TypingIndicator = {
          conversationId,
          userId,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url
          },
          timestamp: new Date().toISOString()
        };

        socket.to(`conversation:${conversationId}`).emit('typingStart', typingIndicator);
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    });

    // Handle typing stop
    socket.on('typingStop', async (conversationId: string) => {
      try {
        await messagingService.clearTypingIndicator(conversationId, userId);

        socket.to(`conversation:${conversationId}`).emit('typingStop', {
          conversationId,
          userId,
          user: { id: userId, username: '' }
        });
      } catch (error) {
        console.error('Error clearing typing indicator:', error);
      }
    });

    // Handle marking messages as read
    socket.on('markAsRead', async (data: { messageId: string; conversationId: string }) => {
      try {
        await messagingService.markAsRead(data.messageId, userId);

        io.to(`conversation:${data.conversationId}`).emit('messageRead', {
          messageId: data.messageId,
          userId,
          conversationId: data.conversationId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle user going online
    socket.on('goOnline', async () => {
      console.log(`User ${userId} going online`);
      await messagingService.setUserOnline(userId);
      io.emit('userOnline', { userId, isOnline: true });
    });

    // Handle user going offline
    socket.on('goOffline', async () => {
      console.log(`User ${userId} going offline`);
      await messagingService.setUserOffline(userId);
      io.emit('userOffline', { userId, isOnline: false });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);

      // Remove socket from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // User has no more active connections
          await messagingService.setUserOffline(userId);
          io.emit('userOffline', { userId, isOnline: false });
        }
      }

      // Remove from all conversation rooms
      for (const [conversationId, users] of conversationRooms.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          if (users.size === 0) {
            conversationRooms.delete(conversationId);
          }
          socket.to(`conversation:${conversationId}`).emit('userLeft', {
            conversationId,
            userId,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  // Subscribe to Redis for external updates
  const redisSub = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisSub.connect().catch(console.error);

  redisSub.pSubscribe('messages:*', (message: string, channel: string) => {
    console.log(`Received message on channel ${channel}: ${message}`);
    const parts = channel.split(':');
    if (parts[0] === 'messages' && parts[1]) {
      io.to(`conversation:${parts[1]}`).emit('message', JSON.parse(message).data);
    }
  });

  redisSub.pSubscribe('reactions:*', (message: string, channel: string) => {
    console.log(`Received reaction on channel ${channel}: ${message}`);
    const parts = channel.split(':');
    if (parts[0] === 'reactions' && parts[1]) {
      io.to(`conversation:${parts[1]}`).emit('messageReaction', JSON.parse(message).data);
    }
  });

  redisSub.pSubscribe('typing:*', (message: string, channel: string) => {
    console.log(`Received typing update on channel ${channel}: ${message}`);
    const parts = channel.split(':');
    if (parts[0] === 'typing' && parts[1]) {
      const data = JSON.parse(message);
      io.to(`conversation:${parts[1]}`).emit('typingStart', data);
    }
  });

  redisSub.pSubscribe('notifications:*', (message: string, channel: string) => {
    console.log(`Received notification on channel ${channel}: ${message}`);
    const parts = channel.split(':');
    if (parts[0] === 'notifications' && parts[1]) {
      io.to(`user:${parts[1]}`).emit('notification', JSON.parse(message));
    }
  });
}
