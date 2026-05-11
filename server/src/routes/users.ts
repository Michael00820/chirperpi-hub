import { Router, IRouter, Request, Response } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { getUserByUsername, getUserProfile, updateUserProfile, getUserPosts, followUser, unfollowUser, searchUsers } from '../services/userService'
import { handleValidationErrors, paginationValidators, searchValidators, userProfileValidators } from '../middleware/validators'

const router: IRouter = Router()

// Search users
router.get('/search', searchValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await searchUsers(query, page, limit)
    res.json(result)
  } catch (error) {
    console.error('Search users error:', error)
    res.status(500).json({ error: 'Failed to search users' })
  }
})

// Get user's posts
router.get('/:username/posts', paginationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { username } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const user = await getUserByUsername(username)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const posts = await getUserPosts(user.id, page, limit)
    res.json({ posts })
  } catch (error) {
    console.error('Get user posts error:', error)
    res.status(500).json({ error: 'Failed to get posts' })
  }
})

// Get user profile by username
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params
    const profile = await getUserProfile(username, req.user?.userId)

    if (!profile) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(profile)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// Update user profile
router.put('/profile', authenticateToken, userProfileValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const updateData = req.body

    const updatedProfile = await updateUserProfile(userId, updateData)
    res.json(updatedProfile)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Follow user
router.post('/:userId/follow', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = req.user!.userId
    const followingId = req.params.userId

    await followUser(followerId, followingId)
    res.json({ success: true })
  } catch (error) {
    console.error('Follow user error:', error)
    res.status(500).json({ error: 'Failed to follow user' })
  }
})

// Unfollow user
router.delete('/:userId/follow', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followerId = req.user!.userId
    const followingId = req.params.userId

    await unfollowUser(followerId, followingId)
    res.json({ success: true })
  } catch (error) {
    console.error('Unfollow user error:', error)
    res.status(500).json({ error: 'Failed to unfollow user' })
  }
})

export { router as usersRouter }