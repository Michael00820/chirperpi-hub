import { Router, IRouter, Request, Response } from 'express'
import { authenticateToken } from '../middleware/authMiddleware'
import { NotificationService } from '../services/notificationService'
import {
  handleValidationErrors,
  paginationValidators,
  notificationSettingsValidators,
  subscriptionValidators,
  unsubscribeValidators,
  validateNotificationId
} from '../middleware/validators'

const router: IRouter = Router()

router.get('/', authenticateToken, paginationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const notifications = await NotificationService.getNotifications(req.user!.userId, page, limit)
    res.json(notifications)
  } catch (error) {
    console.error('Notifications fetch error:', error)
    res.status(500).json({ error: 'Failed to load notifications' })
  }
})

router.get('/count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.userId)
    res.json({ count })
  } catch (error) {
    console.error('Unread count error:', error)
    res.status(500).json({ error: 'Failed to load notification count' })
  }
})

router.put('/:notificationId/read', authenticateToken, validateNotificationId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    await NotificationService.markAsRead(req.params.notificationId, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

router.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    await NotificationService.markAllAsRead(req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({ error: 'Failed to mark all notifications as read' })
  }
})

router.get('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const settings = await NotificationService.getPreferences(req.user!.userId)
    res.json(settings)
  } catch (error) {
    console.error('Notification settings fetch error:', error)
    res.status(500).json({ error: 'Failed to load notification settings' })
  }
})

router.put('/settings', authenticateToken, notificationSettingsValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const settings = await NotificationService.updatePreferences(req.user!.userId, req.body)
    res.json(settings)
  } catch (error) {
    console.error('Notification settings update error:', error)
    res.status(500).json({ error: 'Failed to update notification settings' })
  }
})

router.post('/subscribe', authenticateToken, subscriptionValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const subscription = req.body.subscription
    await NotificationService.savePushSubscription(req.user!.userId, subscription)
    res.json({ success: true })
  } catch (error) {
    console.error('Push subscription error:', error)
    res.status(500).json({ error: 'Failed to save push subscription' })
  }
})

router.delete('/subscribe', authenticateToken, unsubscribeValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body
    await NotificationService.removePushSubscription(req.user!.userId, endpoint)
    res.json({ success: true })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    res.status(500).json({ error: 'Failed to remove push subscription' })
  }
})

export { router as notificationsRouter }
