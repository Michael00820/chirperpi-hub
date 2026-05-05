import { Router, Request, Response } from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/authMiddleware'
import { handleValidationErrors, postCreationValidators, searchValidators, validateLimit } from '../middleware/validators'
import { PostService } from '../services/postService'
import { uploadToPinata } from '../services/mediaService'
import { commentsRouter } from './comments'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Mount comments router
router.use('/:postId/comments', commentsRouter)

// Create a post
router.post('/', authenticateToken, postCreationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const post = await PostService.createPost(userId, req.body)

    res.status(201).json(post)
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

// Post search
router.get('/search', searchValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await PostService.searchPosts(query, page, limit, req.user?.userId)
    res.json(result)
  } catch (error) {
    console.error('Search posts error:', error)
    res.status(500).json({ error: 'Failed to search posts' })
  }
})

// Get trending posts
router.get('/trending', validateLimit, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const posts = await PostService.getTrendingPosts(limit)

    res.json({ posts })
  } catch (error) {
    console.error('Get trending error:', error)
    res.status(500).json({ error: 'Failed to get trending posts' })
  }
})

// Get post by ID
router.get('/:postId', async (req: Request, res: Response) => {
  try {
    const post = await PostService.getPost(req.params.postId, req.user?.userId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json(post)
  } catch (error) {
    console.error('Get post error:', error)
    res.status(500).json({ error: 'Failed to get post' })
  }
})

// Get timeline
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || 'latest'
    const cursor = req.query.cursor as string

    const timeline = await PostService.getTimeline(filter as any, cursor, req.user?.userId)

    res.json(timeline)
  } catch (error) {
    console.error('Get timeline error:', error)
    res.status(500).json({ error: 'Failed to get timeline' })
  }
})

// Update a post
router.put('/:postId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const post = await PostService.getPost(req.params.postId, req.user?.userId)

    if (!post || post.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const updated = await PostService.updatePost(req.params.postId, req.body)
    res.json(updated)
  } catch (error) {
    console.error('Update post error:', error)
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// Delete a post
router.delete('/:postId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const post = await PostService.getPost(req.params.postId, req.user?.userId)

    if (!post || post.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await PostService.deletePost(req.params.postId)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// React to post
router.post('/:postId/react', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reactionType } = req.body

    if (!['like', 'love', 'care', 'celebrate', 'support', 'rocket'].includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' })
    }

    await PostService.reactToPost(req.params.postId, req.user!.userId, reactionType)
    res.json({ success: true })
  } catch (error) {
    console.error('React error:', error)
    res.status(500).json({ error: 'Failed to react to post' })
  }
})

// Remove reaction from post
router.delete('/:postId/react', authenticateToken, async (req: Request, res: Response) => {
  try {
    await PostService.removeReaction(req.params.postId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Remove reaction error:', error)
    res.status(500).json({ error: 'Failed to remove reaction' })
  }
})

// Pin post (admin only)
router.post('/:postId/pin', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const post = await PostService.getPost(req.params.postId, req.user?.userId)

    if (!post || post.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await PostService.pinPost(req.params.postId)
    res.json({ success: true })
  } catch (error) {
    console.error('Pin post error:', error)
    res.status(500).json({ error: 'Failed to pin post' })
  }
})

// Unpin post
router.post('/:postId/unpin', authenticateToken, async (req: Request, res: Response) => {
  try {
    const post = await PostService.getPost(req.params.postId, req.user?.userId)

    if (!post || post.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await PostService.unpinPost(req.params.postId)
    res.json({ success: true })
  } catch (error) {
    console.error('Unpin post error:', error)
    res.status(500).json({ error: 'Failed to unpin post' })
  }
})

// Upload media
router.post('/media/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const url = await uploadToPinata(req.file.buffer, req.file.originalname)
    res.json({ url })
  } catch (error) {
    console.error('Media upload error:', error)
    res.status(500).json({ error: 'Failed to upload media' })
  }
})

export { router as postsRouter }