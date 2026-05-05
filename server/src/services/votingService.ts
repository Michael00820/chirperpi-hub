import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export class VotingService {
  /**
   * Verify a Pi wallet signature for voting
   * In a real implementation, this would verify against Pi Network's API
   * For now, we'll implement basic signature validation
   */
  static async verifyVoteSignature(
    voterId: string,
    proposalId: string,
    optionId: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Get user data
      const userResult = await pool.query(`
        SELECT u.username, p.pi_wallet_address
        FROM users u
        JOIN profiles p ON p.id = u.id
        WHERE u.id = $1
      `, [voterId])

      if (userResult.rows.length === 0) {
        return false
      }

      const user = userResult.rows[0]

      // Create the message that was signed
      const message = `Vote on proposal ${proposalId} for option ${optionId} by ${user.username}`

      // In a real Pi Network integration, you would:
      // 1. Call Pi Network's verification API
      // 2. Verify the signature against the user's Pi wallet address
      // 3. Check that the signature matches the message

      // For this implementation, we'll do a basic check
      // In production, replace this with actual Pi Network signature verification

      // Basic signature format check (simplified)
      if (!signature || signature.length < 10) {
        return false
      }

      // Verify signature format (this is a placeholder)
      // Real implementation would use Pi Network's SDK/API
      const isValidFormat = signature.startsWith('pi_') || /^[a-f0-9]{64}$/i.test(signature)

      if (!isValidFormat) {
        return false
      }

      // Additional checks could include:
      // - Verify signature hasn't been used before
      // - Check signature timestamp
      // - Verify against Pi Network API

      return true
    } catch (error) {
      console.error('Signature verification failed:', error)
      return false
    }
  }

  /**
   * Calculate vote weight based on user's Pi balance and verification status
   */
  static async calculateVoteWeight(userId: string): Promise<number> {
    const result = await pool.query(`
      SELECT pi_balance, verification_status
      FROM profiles
      WHERE id = $1
    `, [userId])

    if (result.rows.length === 0) {
      return 0
    }

    const profile = result.rows[0]
    let baseWeight = profile.pi_balance || 0

    // Apply multipliers based on verification status
    const multipliers = {
      'unverified': 1.0,
      'pending': 1.0,
      'verified': 1.5,
      'trusted': 2.0
    }

    const multiplier = multipliers[profile.verification_status] || 1.0
    return baseWeight * multiplier
  }

  /**
   * Check if a proposal has reached quorum
   */
  static async checkQuorum(proposalId: string): Promise<{ reached: boolean; percentage: number }> {
    // Get proposal details
    const proposalResult = await pool.query(`
      SELECT min_pi_balance, total_votes
      FROM proposals
      WHERE id = $1
    `, [proposalId])

    if (proposalResult.rows.length === 0) {
      return { reached: false, percentage: 0 }
    }

    const proposal = proposalResult.rows[0]

    // Get total eligible voters (users with minimum Pi balance)
    const eligibleResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM profiles
      WHERE pi_balance >= $1
    `, [proposal.min_pi_balance])

    const eligibleVoters = parseInt(eligibleResult.rows[0].count)

    if (eligibleVoters === 0) {
      return { reached: false, percentage: 0 }
    }

    const participationPercentage = (proposal.total_votes / eligibleVoters) * 100

    // Quorum is 10% of eligible voters
    const quorumReached = participationPercentage >= 10

    return {
      reached: quorumReached,
      percentage: participationPercentage
    }
  }

  /**
   * Get proposal results with winner determination
   */
  static async getProposalResults(proposalId: string): Promise<any> {
    const results = await pool.query(`
      SELECT
        option_id,
        COUNT(*) as vote_count,
        SUM(vote_weight) as total_weight
      FROM votes
      WHERE proposal_id = $1
      GROUP BY option_id
      ORDER BY total_weight DESC
    `, [proposalId])

    if (results.rows.length === 0) {
      return { winningOption: null, totalVoteWeight: 0, voterCount: 0 }
    }

    const winningOption = results.rows[0]
    const totalVoteWeight = results.rows.reduce((sum: number, row: any) => sum + parseFloat(row.total_weight), 0)
    const voterCount = results.rows.reduce((sum: number, row: any) => sum + parseInt(row.vote_count), 0)

    return {
      winningOption: {
        id: winningOption.option_id,
        voteCount: parseInt(winningOption.vote_count),
        totalWeight: parseFloat(winningOption.total_weight)
      },
      totalVoteWeight,
      voterCount
    }
  }

  /**
   * Finalize proposal results and update status
   */
  static async finalizeProposal(proposalId: string): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Get proposal end time
      const proposalResult = await client.query(`
        SELECT end_time, status FROM proposals WHERE id = $1
      `, [proposalId])

      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found')
      }

      const proposal = proposalResult.rows[0]

      // Only finalize if voting period has ended and proposal is active
      if (new Date() < new Date(proposal.end_time) || proposal.status !== 'active') {
        return
      }

      // Get results
      const results = await this.getProposalResults(proposalId)
      const quorum = await this.checkQuorum(proposalId)

      let newStatus = 'rejected'

      if (quorum.reached && results.winningOption) {
        // Check if winning option has majority (>50% of total weight)
        const majorityThreshold = results.totalVoteWeight * 0.5
        if (results.winningOption.totalWeight > majorityThreshold) {
          newStatus = 'passed'
        }
      }

      // Update proposal status
      await client.query(`
        UPDATE proposals
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [newStatus, proposalId])

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}