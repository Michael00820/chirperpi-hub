import { Router, IRouter, Request, Response } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { GroupService } from '../services/groupService'
import {
  handleValidationErrors,
  groupCreationValidators,
  groupJoinValidators,
  groupMemberRoleValidators,
  paginationValidators,
  validateGroupId,
  validateMemberId,
  validateInviteCode,
  validateLimit,
  validateSearchQuery
} from '../middleware/validators'

const router: IRouter = Router()

// Discover groups
router.get('/discover', validateSearchQuery, paginationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || ''
    const category = req.query.category as string
    const sort = (req.query.sort as string) === 'popular' ? 'popular' : 'recent'
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    const result = await GroupService.searchGroups(query, category, sort, page, limit)
    res.json(result)
  } catch (error) {
    console.error('Discover groups error:', error)
    res.status(500).json({ error: 'Failed to discover groups' })
  }
})

// Popular groups
router.get('/popular', validateLimit, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string
    const limit = parseInt(req.query.limit as string) || 10

    const groups = await GroupService.getPopularGroups(category, limit)
    res.json({ groups })
  } catch (error) {
    console.error('Popular groups error:', error)
    res.status(500).json({ error: 'Failed to fetch popular groups' })
  }
})

// Join with invite code
router.post('/join-invite/:inviteCode', authenticateToken, validateInviteCode, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const inviteCode = req.params.inviteCode
    const group = await GroupService.joinByInviteCode(inviteCode, req.user!.userId)
    res.json(group)
  } catch (error) {
    console.error('Join by invite error:', error)
    res.status(400).json({ error: (error as Error).message })
  }
})

// Create a group
router.post('/', authenticateToken, groupCreationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const group = await GroupService.createGroup(req.user!.userId, req.body)
    res.status(201).json(group)
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// Get group
router.get('/:groupId', validateGroupId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const group = await GroupService.getGroupById(req.params.groupId, req.user?.userId)
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }
    res.json(group)
  } catch (error) {
    console.error('Get group error:', error)
    res.status(500).json({ error: 'Failed to fetch group' })
  }
})

// Update group
router.put('/:groupId', authenticateToken, validateGroupId, groupCreationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const group = await GroupService.updateGroup(req.params.groupId, req.body, req.user!.userId)
    res.json(group)
  } catch (error) {
    console.error('Update group error:', error)
    res.status(403).json({ error: (error as Error).message })
  }
})

// Delete group
router.delete('/:groupId', authenticateToken, async (req: Request, res: Response) => {
  try {
    await GroupService.deleteGroup(req.params.groupId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    res.status(403).json({ error: (error as Error).message })
  }
})

// Join group
router.post('/:groupId/join', authenticateToken, validateGroupId, groupJoinValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const inviteCode = req.body.inviteCode as string | undefined
    const group = await GroupService.joinGroup(req.params.groupId, req.user!.userId, inviteCode)
    res.json(group)
  } catch (error) {
    console.error('Join group error:', error)
    res.status(400).json({ error: (error as Error).message })
  }
})

// Leave group
router.post('/:groupId/leave', authenticateToken, async (req: Request, res: Response) => {
  try {
    await GroupService.leaveGroup(req.params.groupId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(400).json({ error: (error as Error).message })
  }
})

// Group members
router.get('/:groupId/members', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const members = await GroupService.getGroupMembers(req.params.groupId, page, limit)
    res.json({ members })
  } catch (error) {
    console.error('Get group members error:', error)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// Manage member roles
router.post('/:groupId/members/:memberId/role', authenticateToken, validateGroupId, validateMemberId, groupMemberRoleValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params
    const { role } = req.body
    const updatedMember = await GroupService.changeMemberRole(req.params.groupId, memberId, role, req.user!.userId)
    res.json(updatedMember)
  } catch (error) {
    console.error('Change role error:', error)
    res.status(403).json({ error: (error as Error).message })
  }
})

// Create invite link
router.post('/:groupId/invite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const invite = await GroupService.createInvite(req.params.groupId, req.user!.userId)
    res.json(invite)
  } catch (error) {
    console.error('Create invite error:', error)
    res.status(403).json({ error: (error as Error).message })
  }
})

// Group feed
router.get('/:groupId/feed', validateGroupId, validateLimit, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string
    const limit = parseInt(req.query.limit as string) || 20
    const feed = await GroupService.getGroupFeed(req.params.groupId, req.user?.userId, cursor, limit)
    res.json(feed)
  } catch (error) {
    console.error('Get group feed error:', error)
    res.status(403).json({ error: (error as Error).message })
  }
})

export { router as groupsRouter }
