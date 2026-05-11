import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import {
  CreateGroupRequest,
  Group,
  GroupMember,
  GroupSearchResult,
  GroupFeed,
  GroupInvite,
  PostCard
} from '../../../shared/src/auth'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export class GroupService {
  static async createGroup(userId: string, data: CreateGroupRequest): Promise<Group> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO groups (creator_id, name, description, cover_photo, privacy, category, member_count, min_pi_balance)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
         RETURNING *`,
        [userId, data.name, data.description, data.coverPhoto, data.privacy, data.category, data.minPiBalance || 0]
      )

      const group = result.rows[0]

      await client.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [group.id, userId]
      )

      await client.query('COMMIT')

      return this.groupRowToGroup(group, userId)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async getGroupById(groupId: string, currentUserId?: string): Promise<Group | null> {
    const result = await pool.query(
      `SELECT g.*, u.username as creator_username, u.display_name as creator_display_name, u.avatar_url as creator_avatar_url,
              COALESCE(gm.role, 'member') as member_role,
              EXISTS(
                SELECT 1 FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = $2
              ) as is_member
       FROM groups g
       JOIN users u ON g.creator_id = u.id
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
       WHERE g.id = $1`,
      [groupId, currentUserId || null]
    )

    if (result.rows.length === 0) return null

    return this.groupRowToGroup(result.rows[0], currentUserId)
  }

  static async updateGroup(groupId: string, updateData: Partial<CreateGroupRequest>, userId: string): Promise<Group | null> {
    const group = await this.getGroupById(groupId, userId)
    if (!group) return null
    if (!group.isAdmin && group.creatorId !== userId) {
      throw new Error('Unauthorized to update this group')
    }

    const updates: string[] = []
    const values: any[] = []
    let index = 1

    if (updateData.name) {
      updates.push(`name = $${index++}`)
      values.push(updateData.name)
    }
    if (updateData.description !== undefined) {
      updates.push(`description = $${index++}`)
      values.push(updateData.description)
    }
    if (updateData.coverPhoto !== undefined) {
      updates.push(`cover_photo = $${index++}`)
      values.push(updateData.coverPhoto)
    }
    if (updateData.privacy) {
      updates.push(`privacy = $${index++}`)
      values.push(updateData.privacy)
    }
    if (updateData.category) {
      updates.push(`category = $${index++}`)
      values.push(updateData.category)
    }
    if (updateData.minPiBalance !== undefined) {
      updates.push(`min_pi_balance = $${index++}`)
      values.push(updateData.minPiBalance)
    }

    if (updates.length === 0) {
      return group
    }

    const query = `UPDATE groups SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${index} RETURNING *`
    values.push(groupId)

    const result = await pool.query(query, values)
    return this.groupRowToGroup(result.rows[0], userId)
  }

  static async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.getGroupById(groupId, userId)
    if (!group) {
      throw new Error('Group not found')
    }
    if (!group.isAdmin && group.creatorId !== userId) {
      throw new Error('Unauthorized to delete this group')
    }

    await pool.query('DELETE FROM groups WHERE id = $1', [groupId])
  }

  static async searchGroups(
    query: string,
    category?: string,
    sort: 'popular' | 'recent' = 'recent',
    page = 1,
    limit = 20
  ): Promise<GroupSearchResult> {
    const offset = (page - 1) * limit
    const searchTerm = `%${query || ''}%`
    const filters: string[] = []
    const values: any[] = [searchTerm, searchTerm]
    let index = 3

    if (category) {
      filters.push(`category = $${index++}`)
      values.push(category)
    }

    const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''
    const orderClause = sort === 'popular' ? 'ORDER BY member_count DESC, created_at DESC' : 'ORDER BY created_at DESC'

    const groups = await pool.query(
      `SELECT * FROM groups
       WHERE (name ILIKE $1 OR description ILIKE $2)
       ${whereClause}
       ${orderClause}
       LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM groups
       WHERE (name ILIKE $1 OR description ILIKE $2)
       ${whereClause}`,
      values
    )

    const total = parseInt(countResult.rows[0].total)

    return {
      groups: groups.rows.map(row => this.groupRowToGroup(row)),
      total,
      hasMore: offset + groups.rows.length < total
    }
  }

  static async getPopularGroups(category?: string, limit = 10): Promise<Group[]> {
    const values: any[] = [limit]
    const categoryFilter = category ? 'WHERE category = $2' : ''

    const result = await pool.query(
      `SELECT * FROM groups ${categoryFilter} ORDER BY member_count DESC, created_at DESC LIMIT $1`,
      values
    )

    return result.rows.map(row => this.groupRowToGroup(row))
  }

  static async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    )
    return result.rows.length > 0
  }

  static async joinGroup(groupId: string, userId: string, inviteCode?: string): Promise<Group> {
    const group = await this.getGroupById(groupId, userId)
    if (!group) {
      throw new Error('Group not found')
    }

    if (group.privacy === 'private' && !inviteCode) {
      throw new Error('Invite code required to join this group')
    }

    if (group.minPiBalance && group.minPiBalance > 0) {
      const currentBalance = await this.getUserPiBalance(userId)
      if (currentBalance < group.minPiBalance) {
        throw new Error('You do not meet the Pi balance requirement for this group')
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (inviteCode) {
        const invite = await client.query(
          `SELECT * FROM group_invites WHERE invite_code = $1 AND group_id = $2 AND used = false AND (expires_at IS NULL OR expires_at > NOW())`,
          [inviteCode, groupId]
        )

        if (invite.rows.length === 0) {
          throw new Error('Invalid or expired invite code')
        }

        await client.query(`UPDATE group_invites SET used = true WHERE id = $1`, [invite.rows[0].id])
      }

      await client.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [groupId, userId]
      )

      await client.query(
        `UPDATE groups SET member_count = member_count + 1 WHERE id = $1`,
        [groupId]
      )

      await this.createNotification(group.creatorId, userId, 'group_join', 'group', groupId)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return this.getGroupById(groupId, userId) as Promise<Group>
  }

  static async leaveGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.getGroupById(groupId, userId)
    if (!group) {
      throw new Error('Group not found')
    }

    if (group.creatorId === userId) {
      throw new Error('Group creator cannot leave the group without transferring ownership')
    }

    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    )

    await pool.query(
      `UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`,
      [groupId]
    )
  }

  static async getGroupMembers(groupId: string, page = 1, limit = 20): Promise<GroupMember[]> {
    const offset = (page - 1) * limit
    const result = await pool.query(
      `SELECT gm.group_id, gm.user_id, gm.role, gm.joined_at,
              u.username, u.display_name, u.avatar_url
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role ASC, gm.joined_at ASC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    )

    return result.rows.map(row => this.groupMemberRow(row))
  }

  static async changeMemberRole(groupId: string, targetUserId: string, role: 'admin' | 'moderator' | 'member', actorId: string): Promise<GroupMember> {
    const group = await this.getGroupById(groupId, actorId)
    if (!group) {
      throw new Error('Group not found')
    }
    if (!group.isAdmin && group.creatorId !== actorId) {
      throw new Error('Unauthorized to manage roles')
    }
    if (targetUserId === group.creatorId && role !== 'admin') {
      throw new Error('Cannot change creator role')
    }

    const result = await pool.query(
      `UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 RETURNING *`,
      [role, groupId, targetUserId]
    )

    if (result.rows.length === 0) {
      throw new Error('Member not found')
    }

    await this.createNotification(targetUserId, actorId, 'group_role_change', 'group', groupId)

    return this.groupMemberRow(result.rows[0])
  }

  static async createInvite(groupId: string, actorId: string, expiresInHours = 72): Promise<GroupInvite> {
    const group = await this.getGroupById(groupId, actorId)
    if (!group) {
      throw new Error('Group not found')
    }
    if (!group.isAdmin && group.creatorId !== actorId) {
      throw new Error('Unauthorized to create invite')
    }

    const inviteCode = uuidv4()
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

    const insertResult = await pool.query(
      `INSERT INTO group_invites (group_id, invited_by, invite_code, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [groupId, actorId, inviteCode, expiresAt]
    )

    const invite = insertResult.rows[0]

    const result = await pool.query(
      `SELECT gi.*, g.name as group_name
       FROM group_invites gi
       JOIN groups g ON gi.group_id = g.id
       WHERE gi.id = $1`,
      [invite.id]
    )

    await this.createNotification(group.creatorId, actorId, 'group_invite', 'group', groupId)

    return this.groupInviteRow(result.rows[0])
  }

  static async joinByInviteCode(inviteCode: string, userId: string): Promise<Group> {
    const inviteResult = await pool.query(
      `SELECT group_id FROM group_invites
       WHERE invite_code = $1 AND used = false AND (expires_at IS NULL OR expires_at > NOW())`,
      [inviteCode]
    )

    if (inviteResult.rows.length === 0) {
      throw new Error('Invite link is invalid or expired')
    }

    const groupId = inviteResult.rows[0].group_id
    return this.joinGroup(groupId, userId, inviteCode)
  }

  static async getGroupFeed(groupId: string, userId?: string, cursor?: string, limit = 20): Promise<GroupFeed> {
    const group = await this.getGroupById(groupId, userId)
    if (!group) {
      throw new Error('Group not found')
    }
    if (group.privacy === 'private' && !group.isMember) {
      throw new Error('Access denied to private group posts')
    }

    const params: any[] = [groupId, userId || null]
    let query = `
      SELECT p.*, u.username, u.display_name, u.avatar_url,
             g.name as group_name, g.privacy as group_privacy,
             COUNT(DISTINCT pr.id) as reaction_count,
             COUNT(DISTINCT c.id) as comment_count,
             EXISTS(SELECT 1 FROM post_reactions WHERE post_id = p.id AND user_id = $2) as user_reaction
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN groups g ON p.group_id = g.id
      LEFT JOIN post_reactions pr ON p.id = pr.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.group_id = $1
    `

    if (cursor) {
      query += ` AND p.created_at < (SELECT created_at FROM posts WHERE id = $3)`
      params.push(cursor)
    }

    query += `
      GROUP BY p.id, u.id, g.id
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit + 1)

    const result = await pool.query(query, params)
    const posts = result.rows.slice(0, limit).map(row => this.postRowToCard(row, userId))
    const hasMore = result.rows.length > limit

    return {
      posts,
      hasMore,
      nextCursor: hasMore ? result.rows[limit - 1].id : undefined
    }
  }

  private static async getUserPiBalance(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT pi_balance_cache FROM profiles WHERE user_id = $1`,
      [userId]
    )
    return result.rows[0]?.pi_balance_cache ? parseFloat(result.rows[0].pi_balance_cache) : 0
  }

  public static async createNotification(
    userId: string,
    actorId: string,
    notificationType: 'group_join' | 'group_post' | 'group_role_change' | 'group_invite',
    entityType: string,
    entityId: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, notification_type, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, actorId, notificationType, entityType, entityId]
    )
  }

  private static groupRowToGroup(row: any, _currentUserId?: string): Group {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      coverPhoto: row.cover_photo,
      privacy: row.privacy,
      category: row.category,
      memberCount: parseInt(row.member_count, 10),
      creatorId: row.creator_id,
      creator: {
        id: row.creator_id,
        username: row.creator_username,
        displayName: row.creator_display_name,
        avatarUrl: row.creator_avatar_url
      },
      isMember: Boolean(row.is_member),
      isAdmin: row.member_role === 'admin',
      memberRole: row.member_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      minPiBalance: row.min_pi_balance ? parseFloat(row.min_pi_balance) : 0
    }
  }

  private static groupMemberRow(row: any): GroupMember {
    return {
      userId: row.user_id,
      groupId: row.group_id,
      role: row.role,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }
  }

  private static groupInviteRow(row: any): GroupInvite {
    return {
      id: row.id,
      groupId: row.group_id,
      groupName: row.group_name,
      invitedBy: row.invited_by,
      inviteCode: row.invite_code,
      expiresAt: row.expires_at,
      used: row.used,
      createdAt: row.created_at
    }
  }

  private static postRowToCard(row: any, _currentUserId?: string): PostCard {
    return {
      id: row.id,
      userId: row.user_id,
      groupId: row.group_id,
      group: row.group_name ? {
        id: row.group_id,
        name: row.group_name,
        privacy: row.group_privacy
      } : undefined,
      content: row.content,
      mediaUrls: row.media_urls,
      createdAt: row.created_at,
      likesCount: parseInt(row.reaction_count || 0, 10),
      commentsCount: parseInt(row.comment_count || 0, 10),
      userReaction: row.user_reaction,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      },
      postType: row.post_type,
      privacy: row.privacy,
      isPinned: row.is_pinned,
      editedAt: row.is_edited ? row.updated_at : undefined
    }
  }
}
