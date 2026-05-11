import express, { IRouter, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateToken } from '../middleware/authMiddleware'
import { ProposalService } from '../services/proposalService'
import { VotingService } from '../services/votingService'
import { CreateProposalRequest, CastVoteRequest } from '../../../shared/src/auth'
import { handleValidationErrors, proposalCreationValidators, castVoteValidators, validateProposalId } from '../middleware/validators'

const router: IRouter = express.Router()

const proposalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many proposal requests. Please try again in a minute.'
})

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 votes per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many voting requests. Please try again in a minute.'
})

// Apply rate limiting to all routes
router.use(proposalLimiter)

// Create a new proposal
router.post('/', authenticateToken, proposalCreationValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const data: CreateProposalRequest = req.body

    const proposal = await ProposalService.createProposal(userId, data)
    res.json({ success: true, proposal })
  } catch (error) {
    console.error('Create proposal error:', error)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

// Get all proposals with optional filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, category, limit = '20', offset = '0' } = req.query

    const result = await ProposalService.getProposals(
      status as string,
      category as string,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json(result)
  } catch (error) {
    console.error('Get proposals error:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// Get a specific proposal
router.get('/:id', authenticateToken, validateProposalId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const proposal = await ProposalService.getProposalById(id)

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    res.json({ proposal })
  } catch (error) {
    console.error('Get proposal error:', error)
    res.status(500).json({ error: 'Failed to fetch proposal' })
  }
})

// Cast a vote on a proposal
router.post('/:id/vote', authenticateToken, voteLimiter, validateProposalId, castVoteValidators, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params
    const data: CastVoteRequest = req.body

    const isValidSignature = await VotingService.verifyVoteSignature(
      userId,
      id,
      data.optionId,
      data.signature
    )

    if (!isValidSignature) {
      return res.status(400).json({ error: 'Invalid vote signature' })
    }

    const vote = await ProposalService.castVote(userId, data)
    res.json({ success: true, vote })
  } catch (error) {
    console.error('Cast vote error:', error)

    if ((error as Error).message === 'User cannot vote on this proposal') {
      return res.status(403).json({ error: (error as Error).message })
    }

    res.status(500).json({ error: 'Failed to cast vote' })
  }
})

// Execute a passed proposal (admin only)
router.post('/:id/execute', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params

    // TODO: Add admin check here
    // For now, allow any authenticated user to execute

    await ProposalService.executeProposal(id, userId)
    res.json({ success: true, message: 'Proposal executed successfully' })
  } catch (error) {
    console.error('Execute proposal error:', error)

    if ((error as Error).message.includes('cannot be executed')) {
      return res.status(400).json({ error: (error as Error).message })
    }

    res.status(500).json({ error: 'Failed to execute proposal' })
  }
})

// Get proposal results
router.get('/:id/results', authenticateToken, validateProposalId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const results = await VotingService.getProposalResults(id)
    const quorum = await VotingService.checkQuorum(id)

    res.json({
      results,
      quorum
    })
  } catch (error) {
    console.error('Get proposal results error:', error)
    res.status(500).json({ error: 'Failed to fetch proposal results' })
  }
})

// Finalize proposal (called by cron job or admin)
router.post('/:id/finalize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await VotingService.finalizeProposal(id)
    res.json({ success: true, message: 'Proposal finalized' })
  } catch (error) {
    console.error('Finalize proposal error:', error)
    res.status(500).json({ error: 'Failed to finalize proposal' })
  }
})

export default router