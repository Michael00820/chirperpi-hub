# Security Validators - Implementation Guide

## Quick Start

### 1. Import Validators and Handler

```typescript
import { Router } from 'express';
import { 
  validatePostContent, 
  handleValidationErrors,
  validateLimit,
  validatePage,
  paginationValidators,
  postCreationValidators
} from '../middleware/validators';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
```

### 2. Basic Route with Validation

```typescript
// GET endpoint with query validation
router.get('/search', paginationValidators, handleValidationErrors, async (req, res) => {
  // req.query.page and req.query.limit are validated and converted to integers
  const { page, limit } = req.query;
  res.json({ page, limit });
});

// POST endpoint with body validation
router.post('/', 
  authenticateToken,
  validatePostContent,
  handleValidationErrors,
  async (req, res) => {
    // req.body.content is validated (1-280 chars) and sanitized
    const { content } = req.body;
    res.json({ success: true, content });
  }
);
```

---

## Validator Reference

### Individual Field Validators

#### Username
```typescript
router.post('/register', [
  validateUsername, // 3-32 chars, alphanumeric + underscore
  handleValidationErrors
], async (req, res) => {
  const { username } = req.body; // Guaranteed valid
});
```

#### Password
```typescript
router.post('/change-password', [
  validatePassword, // 8-128 chars, must include uppercase/lowercase/number/special
  handleValidationErrors
], async (req, res) => {
  const { password } = req.body;
});
```

#### Email
```typescript
router.post('/add-email', [
  validateEmail, // Valid email format, normalized
  handleValidationErrors
], async (req, res) => {
  const { email } = req.body;
});
```

#### Display Name
```typescript
router.put('/profile', authenticateToken, [
  validateDisplayName, // 1-100 chars
  handleValidationErrors
], async (req, res) => {
  const { displayName } = req.body;
});
```

#### Bio
```typescript
router.put('/profile', authenticateToken, [
  validateBio, // 0-500 chars, optional
  handleValidationErrors
], async (req, res) => {
  const { bio } = req.body;
});
```

#### Post Content
```typescript
router.post('/', authenticateToken, [
  validatePostContent, // 1-280 chars
  handleValidationErrors
], async (req, res) => {
  const { content } = req.body;
});
```

#### Comment Content
```typescript
router.post('/:postId/comments', authenticateToken, [
  validateCommentContent, // 1-500 chars
  handleValidationErrors
], async (req, res) => {
  const { content } = req.body;
});
```

#### Pi Amount
```typescript
router.post('/transfer', authenticateToken, [
  validatePiAmount, // 0.01-1000 Pi
  handleValidationErrors
], async (req, res) => {
  const { amount } = req.body;
});
```

#### Pagination (Page & Limit)
```typescript
router.get('/list', [
  validatePage,   // Positive integer
  validateLimit,  // 1-100
  handleValidationErrors
], async (req, res) => {
  const { page, limit } = req.query;
});
```

#### Search Query
```typescript
router.get('/search', [
  validateSearchQuery, // 1-100 chars
  handleValidationErrors
], async (req, res) => {
  const { q } = req.query;
});
```

#### Group Name
```typescript
router.post('/groups', authenticateToken, [
  validateGroupName, // 1-100 chars
  handleValidationErrors
], async (req, res) => {
  const { name } = req.body;
});
```

#### Group Description
```typescript
router.post('/groups', authenticateToken, [
  validateGroupDescription, // 0-1000 chars
  handleValidationErrors
], async (req, res) => {
  const { description } = req.body;
});
```

#### Hashtag
```typescript
router.post('/hashtags', authenticateToken, [
  validateHashtag, // 1-50 chars, alphanumeric + underscore
  handleValidationErrors
], async (req, res) => {
  const { hashtag } = req.body;
});
```

#### UUID Parameter
```typescript
router.get('/:id', [
  validateUUID, // Must be valid UUID v4
  handleValidationErrors
], async (req, res) => {
  const { id } = req.params; // Guaranteed valid UUID
});
```

---

## Validator Chains (Pre-built)

### User Profile Update
```typescript
import { userProfileValidators } from '../middleware/validators';

router.put('/profile', authenticateToken, [
  ...userProfileValidators,
  handleValidationErrors
], async (req, res) => {
  // Validates: displayName, bio, avatarUrl, website
  const { displayName, bio, avatarUrl, website } = req.body;
});
```

**Fields Validated**:
- displayName (1-100 chars)
- bio (0-500 chars)
- avatarUrl (valid URL, 0-500 chars)
- website (valid URL, 0-500 chars)

### Post Creation
```typescript
import { postCreationValidators } from '../middleware/validators';

router.post('/', authenticateToken, [
  ...postCreationValidators,
  handleValidationErrors
], async (req, res) => {
  // Validates: content, mediaUrls, hashtags
  const { content, mediaUrls, hashtags } = req.body;
});
```

**Fields Validated**:
- content (1-280 chars, required)
- mediaUrls (array of valid URLs, optional)
- hashtags (array, optional)

### Group Creation
```typescript
import { groupCreationValidators } from '../middleware/validators';

router.post('/', authenticateToken, [
  ...groupCreationValidators,
  handleValidationErrors
], async (req, res) => {
  // Validates: name, description, isPrivate, coverImageUrl
  const { name, description, isPrivate, coverImageUrl } = req.body;
});
```

**Fields Validated**:
- name (1-100 chars, required)
- description (0-1000 chars, optional)
- isPrivate (boolean, optional)
- coverImageUrl (valid URL, optional)

### Messaging
```typescript
import { messageValidators } from '../middleware/validators';

router.post('/send', authenticateToken, [
  ...messageValidators,
  handleValidationErrors
], async (req, res) => {
  // Validates: content, recipientId
  const { content, recipientId } = req.body;
});
```

**Fields Validated**:
- content (1-5000 chars)
- recipientId (required, not empty)

### Pagination
```typescript
import { paginationValidators } from '../middleware/validators';

router.get('/list', [
  ...paginationValidators,
  handleValidationErrors
], async (req, res) => {
  // Query params: page (positive int), limit (1-100)
  const { page, limit } = req.query;
});
```

### Search
```typescript
import { searchValidators } from '../middleware/validators';

router.get('/search', [
  ...searchValidators,
  handleValidationErrors
], async (req, res) => {
  // Query params: q (search query), page, limit
  const { q, page, limit } = req.query;
});
```

---

## Complete Route Examples

### Example 1: User Search
```typescript
import { Router } from 'express';
import { searchValidators, handleValidationErrors } from '../middleware/validators';
import { searchUsers } from '../services/userService';

const router = Router();

router.get('/search', searchValidators, handleValidationErrors, async (req, res) => {
  try {
    const { q, page, limit } = req.query;
    // q: validated 1-100 chars
    // page: validated positive integer
    // limit: validated 1-100
    
    const results = await searchUsers(q as string, page as number, limit as number);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export { router };
```

### Example 2: Create Post
```typescript
import { Router } from 'express';
import { postCreationValidators, handleValidationErrors } from '../middleware/validators';
import { authenticateToken } from '../middleware/authMiddleware';
import { PostService } from '../services/postService';

const router = Router();

router.post('/', 
  authenticateToken,
  postCreationValidators,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { content, mediaUrls, hashtags } = req.body;
      // All fields validated and sanitized automatically
      
      const post = await PostService.createPost(userId, {
        content,
        mediaUrls,
        hashtags
      });
      
      res.status(201).json(post);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

export { router };
```

### Example 3: Update Profile
```typescript
import { Router } from 'express';
import { userProfileValidators, handleValidationErrors } from '../middleware/validators';
import { authenticateToken } from '../middleware/authMiddleware';
import { updateUserProfile } from '../services/userService';

const router = Router();

router.put('/profile',
  authenticateToken,
  userProfileValidators,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { displayName, bio, avatarUrl, website } = req.body;
      // All fields validated: displayName (1-100), bio (0-500), URLs valid
      
      const profile = await updateUserProfile(userId, {
        displayName,
        bio,
        avatarUrl,
        website
      });
      
      res.json(profile);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export { router };
```

### Example 4: Complex Validation
```typescript
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { handleValidationErrors } from '../middleware/validators';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/transfer', 
  authenticateToken,
  [
    body('recipientId')
      .notEmpty()
      .withMessage('Recipient ID required'),
    body('amount')
      .isFloat({ min: 0.01, max: 1000 })
      .withMessage('Amount must be 0.01-1000 Pi'),
    body('memo')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Memo must be 500 chars or less')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { recipientId, amount, memo } = req.body;
      
      // All fields validated before reaching this point
      const transaction = await TransactionService.transfer(
        userId,
        recipientId,
        amount,
        memo
      );
      
      res.json(transaction);
    } catch (error) {
      console.error('Transfer error:', error);
      res.status(500).json({ error: 'Transfer failed' });
    }
  }
);

export { router };
```

---

## Error Responses

### Validation Error Response
```json
{
  "error": "Validation failed",
  "details": [
    {
      "value": "",
      "msg": "Username must be 3-32 characters",
      "param": "username",
      "location": "body"
    },
    {
      "value": "user@",
      "msg": "Invalid email address",
      "param": "email",
      "location": "body"
    }
  ]
}
```

**Status Code**: 400

---

## Best Practices

### ✅ DO:
- Use validator chains for common operations
- Always call `handleValidationErrors` after validators
- Validate both request body and query parameters
- Use appropriate type validators (email, UUID, etc.)
- Document field constraints in comments

### ❌ DON'T:
- Skip validation on user inputs
- Mix validated and unvalidated data
- Use untrimmed or unsanitized data from request
- Assume API clients provide correct data types
- Store invalid data in database

---

## Adding Custom Validators

### Create a Custom Validator
```typescript
import { body, param } from 'express-validator';

export const validateCustomField = body('customField')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Custom field must be 1-100 characters')
  .matches(/^[a-z0-9-]+$/)
  .withMessage('Custom field can only contain lowercase letters, numbers, and hyphens');

// Use it
router.post('/custom', [
  validateCustomField,
  handleValidationErrors
], async (req, res) => {
  // req.body.customField is validated
});
```

### Custom Validation Logic
```typescript
import { body } from 'express-validator';

export const validateAge = body('age')
  .isInt({ min: 18, max: 150 })
  .withMessage('Age must be between 18 and 150')
  .custom(async (value) => {
    // Custom async validation
    if (value === 100) {
      throw new Error('Invalid age value');
    }
    return true;
  });
```

---

## Migration Guide

### Before (Unvalidated):
```typescript
router.post('/', async (req, res) => {
  const { username, email, bio } = req.body;
  // No validation - dangerous!
  await createUser(username, email, bio);
});
```

### After (Validated):
```typescript
import { validateUsername, validateEmail, validateBio, handleValidationErrors } from '../middleware/validators';

router.post('/', [
  validateUsername,
  validateEmail,
  validateBio,
  handleValidationErrors
], async (req, res) => {
  const { username, email, bio } = req.body;
  // All inputs validated and sanitized
  await createUser(username, email, bio);
});
```

---

## Summary

- **Always use validators** on user-provided data
- **Use pre-built chains** for common operations
- **Call handleValidationErrors** immediately after validators
- **Trust validated data** to be safe for processing
- **Reference .md** for complete validator list
- **Test with invalid data** to ensure validation catches errors

