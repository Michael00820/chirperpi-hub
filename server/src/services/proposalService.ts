import { v4 as uuidv4 } from 'uuid'
import { CreateProposalRequest, Proposal, Vote, CastVoteRequest, ProposalListResult } from '../../../shared/src/auth'
import { NotificationService } from './notificationService'
import { pool } from '../infrastructure/clients'

export class ProposalService {
  static async createProposal(creatorId: string, data: CreateProposalRequest): Promise<Proposal> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Validate voting options
      if (!data.votingOptions || data.votingOptions.length < 2) {
        throw new Error('Proposal must have at least 2 voting options')
      }

      if (data.votingOptions.length > 10) {
        throw new Error('Proposal cannot have more than 10 voting options')
      }

      // Generate IDs for voting options
      const votingOptions = data.votingOptions.map(option => ({
        id: uuidv4().substring(0, 8),
        label: option.label,
        description: option.description || '',
        voteCount: 0,
        percentage: 0
      }))

      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + data.votingDuration * 60 * 60 * 1000)

      const result = await client.query(`
        INSERT INTO proposals (
          title, description, category, creator_id, voting_options,
          min_pi_balance, voting_duration, start_time, end_time, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
        RETURNING *
      `, [
        data.title,
        data.description,
        data.category,
        creatorId,
        JSON.stringify(votingOptions),
        data.minPiBalance,
        data.votingDuration,
        startTime.toISOString(),
        endTime.toISOString()
      ])

      const proposal = result.rows[0]

      // Create notification for new proposal
      await NotificationService.createNotification({
        userId: creatorId,
        actorId: creatorId,
        notificationType: 'proposal_created',
        entityType: 'proposal',
        entityId: proposal.id
      })

      await client.query('COMMIT')

      return this.formatProposal(proposal)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async getProposalById(id: string): Promise<Proposal | null> {
    const result = await pool.query(`
      SELECT p.*,
             u.username, u.display_name, u.avatar_url,
             COALESCE(v.votes, '[]'::json) as votes
      FROM proposals p
      JOIN users u ON p.creator_id = u.id
      LEFT JOIN (
        SELECT proposal_id,
               json_agg(
                 json_build_object(
                   'id', v.id,
                   'proposalId', v.proposal_id,
                   'voterId', v.voter_id,
                   'optionId', v.option_id,
                   'voteWeight', v.vote_weight,
                   'signature', v.signature,
                   'votedAt', v.voted_at,
                   'voter', json_build_object(
                     'id', vu.id,
                     'username', vu.username,
                     'displayName', vu.display_name,
                     'avatarUrl', vu.avatar_url,
                     'piBalance', vp.pi_balance
                   )
                 )
               ) as votes
        FROM votes v
        JOIN users vu ON v.voter_id = vu.id
        JOIN profiles vp ON vp.id = vu.id
        GROUP BY proposal_id
      ) v ON v.proposal_id = p.id
      WHERE p.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return null
    }

    return this.formatProposal(result.rows[0])
  }

  static async getProposals(
    status?: string,
    category?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ProposalListResult> {
    let whereClause = '1=1'
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (category) {
      whereClause += ` AND p.category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM proposals p
      WHERE ${whereClause}
    `, params)

    const result = await pool.query(`
      SELECT p.*,
             u.username, u.display_name, u.avatar_url,
             COALESCE(v.votes, '[]'::json) as votes
      FROM proposals p
      JOIN users u ON p.creator_id = u.id
      LEFT JOIN (
        SELECT proposal_id,
               json_agg(
                 json_build_object(
                   'id', v.id,
                   'proposalId', v.proposal_id,
                   'voterId', v.voter_id,
                   'optionId', v.option_id,
                   'voteWeight', v.vote_weight,
                   'signature', v.signature,
                   'votedAt', v.voted_at,
                   'voter', json_build_object(
                     'id', vu.id,
                     'username', vu.username,
                     'displayName', vu.display_name,
                     'avatarUrl', vu.avatar_url,
                     'piBalance', vp.pi_balance
                   )
                 )
               ) as votes
        FROM votes v
        JOIN users vu ON v.voter_id = vu.id
        JOIN profiles vp ON vp.id = vu.id
        GROUP BY proposal_id
      ) v ON v.proposal_id = p.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset])

    const proposals = result.rows.map(row => this.formatProposal(row))
    const total = parseInt(countResult.rows[0].total)

    return {
      proposals,
      total,
      hasMore: offset + limit < total
    }
  }

  static async castVote(voterId: string, data: CastVoteRequest): Promise<Vote> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Check if user can vote
      const canVoteResult = await client.query('SELECT can_user_vote($1, $2)', [data.proposalId, voterId])
      const canVote = canVoteResult.rows[0].can_user_vote

      if (!canVote) {
        throw new Error('User cannot vote on this proposal')
      }

      // Get user's Pi balance for vote weight
      const userResult = await client.query('SELECT pi_balance FROM profiles WHERE id = $1', [voterId])
      const voteWeight = userResult.rows[0].pi_balance || 0

      // Insert vote
      const voteResult = await client.query(`
        INSERT INTO votes (proposal_id, voter_id, option_id, vote_weight, signature)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [data.proposalId, voterId, data.optionId, voteWeight, data.signature])

      // Update proposal vote count
      await client.query(`
        UPDATE proposals
        SET total_votes = total_votes + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [data.proposalId])

      // Update voting options counts
      await this.updateVotingOptionCounts(client, data.proposalId)

      await client.query('COMMIT')

      const voteRow = voteResult.rows[0]
      const voterInfoResult = await client.query(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, p.pi_balance
         FROM users u
         JOIN profiles p ON p.id = u.id
         WHERE u.id = $1`,
        [voterId]
      )

      const voterInfo = voterInfoResult.rows[0]
      const vote = this.formatVote(voteRow, voterInfo)
      return vote
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async executeProposal(proposalId: string, executorId: string): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Check if proposal can be executed
      const proposalResult = await client.query(`
        SELECT * FROM proposals WHERE id = $1
      `, [proposalId])

      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found')
      }

      const proposal = proposalResult.rows[0]

      if (proposal.status !== 'passed') {
        throw new Error('Only passed proposals can be executed')
      }

      if (proposal.executed_at) {
        throw new Error('Proposal has already been executed')
      }

      // Mark as executed
      await client.query(`
        UPDATE proposals
        SET status = 'executed',
            executed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [proposalId])

      // Create notification
      await NotificationService.createNotification({
        userId: executorId,
        actorId: executorId,
        notificationType: 'proposal_executed',
        entityType: 'proposal',
        entityId: proposalId
      })

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private static async updateVotingOptionCounts(client: any, proposalId: string): Promise<void> {
    // Get current vote counts
    const voteCountsResult = await client.query(`
      SELECT option_id, COUNT(*) as count, SUM(vote_weight) as total_weight
      FROM votes
      WHERE proposal_id = $1
      GROUP BY option_id
    `, [proposalId])

    const voteCounts = voteCountsResult.rows
    const totalVotes = voteCounts.reduce((sum: number, row: any) => sum + parseInt(row.count), 0)

    // Update voting options
    const proposalResult = await client.query('SELECT voting_options FROM proposals WHERE id = $1', [proposalId])
    const votingOptions = proposalResult.rows[0].voting_options

    votingOptions.forEach((option: any) => {
      const voteData = voteCounts.find((vc: any) => vc.option_id === option.id)
      option.voteCount = voteData ? parseInt(voteData.count) : 0
      option.percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0
    })

    await client.query(`
      UPDATE proposals
      SET voting_options = $1
      WHERE id = $2
    `, [JSON.stringify(votingOptions), proposalId])
  }

  private static formatProposal(row: any): Proposal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      creatorId: row.creator_id,
      creator: {
        id: row.creator_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      },
      votingOptions: row.voting_options || [],
      minPiBalance: parseFloat(row.min_pi_balance || 0),
      votingDuration: row.voting_duration,
      startTime: row.start_time,
      endTime: row.end_time,
      totalVotes: row.total_votes || 0,
      votes: row.votes || [],
      executionData: row.execution_data,
      executedAt: row.executed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static formatVote(row: any, voterInfo?: any): Vote {
    return {
      id: row.id,
      proposalId: row.proposal_id,
      voterId: row.voter_id,
      voter: voterInfo ? {
        id: voterInfo.id,
        username: voterInfo.username,
        displayName: voterInfo.display_name,
        avatarUrl: voterInfo.avatar_url,
        piBalance: parseFloat(voterInfo.pi_balance || 0)
      } : {
        id: row.voter_id,
        username: '',
        displayName: undefined,
        avatarUrl: undefined,
        piBalance: 0
      },
      optionId: row.option_id,
      voteWeight: parseFloat(row.vote_weight),
      signature: row.signature,
      votedAt: row.voted_at
    }
  }
}