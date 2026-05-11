import { Router, IRouter, Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { MessagingService } from '../services/messagingService';
import { pool } from '../infrastructure/clients';
import {
  handleValidationErrors,
  createConversationValidators,
  messageSendValidators,
  reactionValidators,
  validateConversationId,
  validateMessageId,
  validateSearchQuery,
  validateLimit,
  validateOffset
} from '../middleware/validators';

const router: IRouter = Router();

const messagingService = new MessagingService(pool);

router.use(authenticateToken);

// Create a new conversation
router.post('/conversations', createConversationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, participantIds, name, description, avatarUrl } = req.body;

    const conversation = await messagingService.createConversation(userId, {
      type,
      participantIds,
      name,
      description,
      avatarUrl
    });

    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get user's conversations
router.get('/conversations', validateLimit, validateOffset, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await messagingService.listConversations(userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation
router.get('/conversations/:conversationId', validateConversationId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const conversation = await messagingService.getConversation(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', validateConversationId, validateLimit, validateOffset, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await messagingService.getMessages(conversationId, userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', validateConversationId, messageSendValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { content, messageType, mediaUrl, piTransaction, piPaymentRequest, replyToMessageId } = req.body;

    const message = await messagingService.sendMessage(userId, {
      conversationId,
      content,
      messageType,
      mediaUrl,
      piTransaction,
      piPaymentRequest,
      replyToMessageId
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add reaction to a message
router.post('/messages/:messageId/reactions', validateMessageId, reactionValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    const reaction = await messagingService.addReaction(messageId, userId, emoji);
    res.json(reaction);
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from a message
router.delete('/messages/:messageId/reactions/:emoji', validateMessageId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId, emoji } = req.params;

    await messagingService.removeReaction(messageId, userId, decodeURIComponent(emoji));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Get all reactions for a message
router.get('/messages/:messageId/reactions', validateMessageId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const reactions = await messagingService.getMessageReactions(messageId);
    res.json(reactions);
  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// Mark message as read
router.post('/messages/:messageId/read', validateMessageId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messageId } = req.params;
    await messagingService.markAsRead(messageId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Get read receipts for a message
router.get('/messages/:messageId/read-receipts', validateMessageId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const receipts = await messagingService.getReadReceipts(messageId);
    res.json({ readBy: receipts });
  } catch (error) {
    console.error('Error fetching read receipts:', error);
    res.status(500).json({ error: 'Failed to fetch read receipts' })
  }
});

// Search messages in a conversation
router.get('/conversations/:conversationId/search', validateConversationId, validateSearchQuery, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { query } = req.query;

    const messages = await messagingService.searchMessages(
      conversationId,
      query as string,
      userId
    );

    res.json({ messages, total: messages.length });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

export { router as messagingRouter };
