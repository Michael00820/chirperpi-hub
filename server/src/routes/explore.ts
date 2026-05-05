import { Router, Request, Response } from 'express'
import { ExploreService } from '../services/exploreService'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const summary = await ExploreService.getSummary(req.user?.userId)
    res.json(summary)
  } catch (error) {
    console.error('Explore summary error:', error)
    res.status(500).json({ error: 'Failed to load explore dashboard' })
  }
})

router.get('/topics/:topic', async (req: Request, res: Response) => {
  try {
    const topic = req.params.topic
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const posts = await ExploreService.getTopicPosts(topic, page, limit, req.user?.userId)
    res.json(posts)
  } catch (error) {
    console.error('Topic posts error:', error)
    res.status(500).json({ error: 'Failed to load topic posts' })
  }
})

export { router as exploreRouter }
