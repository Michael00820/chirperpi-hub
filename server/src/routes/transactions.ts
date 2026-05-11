import express, { IRouter, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import crypto from 'crypto'
import { authenticateToken } from '../middleware/authMiddleware'
import { TransactionService } from '../services/transactionService'
import {} from '../middleware/validators'

const router: IRouter = express.Router()

const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many payment requests. Please try again in a minute.'
})

const verifyWebhookSignature = (req: Request) => {
  const signature = req.headers['x-pi-signature'] as string | undefined
  const secret = process.env.PI_WEBHOOK_SECRET
  if (!signature || !secret || !req.body) {
    return false
  }

  const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body))
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))
  } catch {
    return false
  }
}

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSignature(req)) {
      return res.status(403).json({ error: 'Invalid webhook signature' })
    }

    const payload = JSON.parse(req.body.toString('utf-8'))
    await TransactionService.handleWebhook(payload)
    res.json({ success: true })
  } catch (error) {
    console.error('Transaction webhook error:', error)
    res.status(500).json({ error: 'Failed to process webhook' })
  }
})

router.use(transactionLimiter)

router.post('/tip', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, amount } = req.body
    const transaction = await TransactionService.createTipTransaction(
      req.user!.userId,
      entityType,
      entityId,
      Number(amount),
      req.body.notes
    )
    res.status(201).json(transaction)
  } catch (error: any) {
    console.error('Create tip error:', error)
    res.status(400).json({ error: error?.message || 'Failed to create tip' })
  }
})

router.post('/unlock', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.body
    const transaction = await TransactionService.unlockPostWithPi(req.user!.userId, postId)
    res.status(201).json(transaction)
  } catch (error: any) {
    console.error('Unlock post error:', error)
    res.status(400).json({ error: error?.message || 'Failed to unlock post' })
  }
})

router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const history = await TransactionService.getTransactionHistory(req.user!.userId, page, limit)
    res.json(history)
  } catch (error) {
    console.error('Get transaction history error:', error)
    res.status(500).json({ error: 'Failed to fetch transaction history' })
  }
})

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const leaderboard = await TransactionService.getLeaderboard(limit)
    res.json({ leaderboard })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

router.get('/:transactionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const transaction = await TransactionService.getTransactionById(req.params.transactionId)
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json(transaction)
  } catch (error) {
    console.error('Get transaction error:', error)
    res.status(500).json({ error: 'Failed to fetch transaction' })
  }
})

export { router as transactionsRouter }
