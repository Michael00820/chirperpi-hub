import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation error handler middleware
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// ============================================================================
// Common Validators with Length Limits
// ============================================================================

// Username: 3-32 characters, alphanumeric + underscore
export const validateUsername = body('username')
  .trim()
  .isLength({ min: 3, max: 32 })
  .withMessage('Username must be 3-32 characters')
  .matches(/^[a-zA-Z0-9_]+$/)
  .withMessage('Username can only contain letters, numbers, and underscores');

// Display name: 1-100 characters
export const validateDisplayName = body('displayName')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Display name must be 1-100 characters');

// Bio: 0-500 characters
export const validateBio = body('bio')
  .optional()
  .trim()
  .isLength({ max: 500 })
  .withMessage('Bio must be 500 characters or less');

// Password: minimum 8 characters, must include uppercase, lowercase, number, special char
export const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
  .withMessage('Password must contain uppercase, lowercase, number, and special character');

// Email: valid email format
export const validateEmail = body('email')
  .isEmail()
  .withMessage('Invalid email address')
  .trim()
  .normalizeEmail();

// Post content: 1-280 characters
export const validatePostContent = body('content')
  .trim()
  .isLength({ min: 1, max: 280 })
  .withMessage('Post must be 1-280 characters');

// Post title: 1-100 characters
export const validatePostTitle = body('title')
  .optional()
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Post title must be 1-100 characters');

// Comment content: 1-500 characters
export const validateCommentContent = body('content')
  .trim()
  .isLength({ min: 1, max: 500 })
  .withMessage('Comment must be 1-500 characters');

// Group name: 1-100 characters
export const validateGroupName = body('name')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Group name must be 1-100 characters');

// Group description: 0-1000 characters
export const validateGroupDescription = body('description')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Group description must be 1000 characters or less');

// Hashtag: 1-50 characters
export const validateHashtag = body('hashtag')
  .trim()
  .isLength({ min: 1, max: 50 })
  .withMessage('Hashtag must be 1-50 characters')
  .matches(/^[a-zA-Z0-9_]+$/)
  .withMessage('Hashtag can only contain letters, numbers, and underscores');

// Pi Amount: positive number
export const validatePiAmount = body('amount')
  .isFloat({ min: 0.01, max: 1000 })
  .withMessage('Pi amount must be between 0.01 and 1000');

// Page number: positive integer
export const validatePage = query('page')
  .optional()
  .isInt({ min: 1 })
  .withMessage('Page must be a positive integer')
  .toInt();

// Limit: 1-100
export const validateLimit = query('limit')
  .optional()
  .isInt({ min: 1, max: 100 })
  .withMessage('Limit must be between 1 and 100')
  .toInt();

// Search query: 1-100 characters
export const validateSearchQuery = query('q')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Search query must be 1-100 characters');

// UUID parameter
export const validateUUID = param('id')
  .isUUID(4)
  .withMessage('Invalid ID format');

// ============================================================================
// Validation Chains for Common Routes
// ============================================================================

// User profile update validators
export const userProfileValidators = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Avatar URL must be 500 characters or less'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website URL must be valid')
    .isLength({ max: 500 })
    .withMessage('Website URL must be 500 characters or less')
];

// Post creation validators
export const postCreationValidators = [
  validatePostContent,
  body('mediaUrls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array'),
  body('mediaUrls.*')
    .isURL()
    .withMessage('Invalid media URL'),
  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array')
];

// Group creation validators
export const groupCreationValidators = [
  validateGroupName,
  validateGroupDescription,
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  body('coverImageUrl')
    .optional()
    .isURL()
    .withMessage('Cover image URL must be valid')
];

// Message validators
export const messageValidators = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be 1-5000 characters'),
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required')
];

// Pagination validators
export const paginationValidators = [
  validatePage,
  validateLimit
];

// Search validators
export const searchValidators = [
  validateSearchQuery,
  validatePage,
  validateLimit
];

// Additional parameter and body validators for other routes
export const validateGroupId = param('groupId')
  .isUUID(4)
  .withMessage('Invalid group ID format');

export const validateMemberId = param('memberId')
  .isUUID(4)
  .withMessage('Invalid member ID format');

export const validateProposalId = param('id')
  .isUUID(4)
  .withMessage('Invalid proposal ID format');

export const validateInviteCode = param('inviteCode')
  .trim()
  .isLength({ min: 6, max: 32 })
  .withMessage('Invite code must be 6-32 characters')
  .matches(/^[A-Za-z0-9_-]+$/)
  .withMessage('Invite code may only contain letters, numbers, underscores, and dashes');

export const validateEntityType = body('entityType')
  .trim()
  .isIn(['post', 'user'])
  .withMessage('Entity type must be post or user');

export const validateEntityId = body('entityId')
  .trim()
  .notEmpty()
  .withMessage('Entity ID is required');

export const validateTransactionId = param('transactionId')
  .trim()
  .notEmpty()
  .withMessage('Transaction ID is required');

export const validateConversationId = param('conversationId')
  .trim()
  .notEmpty()
  .withMessage('Conversation ID is required');

export const validateMessageId = param('messageId')
  .trim()
  .notEmpty()
  .withMessage('Message ID is required');

export const validateCommentId = param('commentId')
  .trim()
  .notEmpty()
  .withMessage('Comment ID is required');

export const validateNotificationId = param('notificationId')
  .trim()
  .notEmpty()
  .withMessage('Notification ID is required');

export const validateOffset = query('offset')
  .optional()
  .isInt({ min: 0 })
  .withMessage('Offset must be a non-negative integer')
  .toInt();

export const reactionValidators = [
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
];

export const tipValidators = [
  validateEntityType,
  validateEntityId,
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0')
];

export const unlockPostValidators = [
  body('postId')
    .trim()
    .notEmpty()
    .withMessage('Post ID is required')
];

export const subscriptionValidators = [
  body('subscription')
    .isObject()
    .withMessage('Subscription payload is required'),
  body('subscription.endpoint')
    .isURL()
    .withMessage('Subscription endpoint must be a valid URL'),
  body('subscription.keys.auth')
    .isString()
    .notEmpty()
    .withMessage('Subscription auth key is required'),
  body('subscription.keys.p256dh')
    .isString()
    .notEmpty()
    .withMessage('Subscription p256dh key is required')
];

export const unsubscribeValidators = [
  body('endpoint')
    .isURL()
    .withMessage('Subscription endpoint must be a valid URL')
];

export const notificationSettingsValidators = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications setting must be a boolean'),
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications setting must be a boolean'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications setting must be a boolean')
];

export const proposalCreationValidators = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be 1-200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description is required and must be 1-2000 characters'),
  body('votingOptions')
    .isArray({ min: 2 })
    .withMessage('At least two voting options are required'),
  body('votingOptions.*.label')
    .trim()
    .notEmpty()
    .withMessage('Each voting option must include a label')
];

export const castVoteValidators = [
  body('optionId')
    .trim()
    .notEmpty()
    .withMessage('Option ID is required'),
  body('signature')
    .trim()
    .notEmpty()
    .withMessage('Signature is required')
];

export const createConversationValidators = [
  body('type')
    .trim()
    .isIn(['private', 'group'])
    .withMessage('Conversation type must be private or group'),
  body('participantIds')
    .isArray({ min: 1 })
    .withMessage('At least one participant ID is required'),
  body('participantIds.*')
    .trim()
    .notEmpty()
    .withMessage('Participant ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or less'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL')
];

export const messageSendValidators = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be 1-5000 characters'),
  body('messageType')
    .optional()
    .trim()
    .isIn(['text', 'image', 'video', 'pi'])
    .withMessage('Invalid message type'),
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL'),
  body('piTransaction')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Invalid Pi transaction format'),
  body('piPaymentRequest')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Invalid Pi payment request format'),
  body('replyToMessageId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Reply-to message ID cannot be empty')
];

export const groupJoinValidators = [
  body('inviteCode')
    .optional()
    .trim()
    .isLength({ min: 6, max: 32 })
    .withMessage('Invite code must be 6-32 characters')
];

export const groupMemberRoleValidators = [
  body('role')
    .trim()
    .isIn(['admin', 'moderator', 'member'])
    .withMessage('Invalid role')
];

export const commentValidators = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment content must be 1-500 characters'),
  body('parentCommentId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Parent comment ID cannot be empty')
];
