import { Router, IRouter, Request, Response } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { CommentService } from '../services/commentService'
import { handleValidationErrors, commentValidators, paginationValidators, validateCommentId } from '../middleware/validators'

const router: IRouter = Router({ mergeParams: true })

// Get comments for a post
router.get('/', paginationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const comments = await CommentService.getComments(postId, page, limit)
    res.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

// Add comment to post
router.post('/', authenticateToken, commentValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params
    const { content, parentCommentId } = req.body

    const comment = await CommentService.addComment(postId, req.user!.userId, content, parentCommentId)
    res.status(201).json(comment)
  } catch (error) {
    console.error('Add comment error:', error)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Delete comment
router.delete('/:commentId', authenticateToken, validateCommentId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params

    await CommentService.deleteComment(commentId)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete comment error:', error)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
})

// Like comment
router.post('/:commentId/like', authenticateToken, validateCommentId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params

    await CommentService.likeComment(commentId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Like comment error:', error)
    res.status(500).json({ error: 'Failed to like comment' })
  }
})

// Unlike comment
router.delete('/:commentId/like', authenticateToken, validateCommentId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params

    await CommentService.unlikeComment(commentId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Unlike comment error:', error)
    res.status(500).json({ error: 'Failed to unlike comment' })
  }
})

export { router as commentsRouter }