import { Pool } from 'pg'
import { createClient } from 'redis'
import { v4 as uuidv4 } from 'uuid'
import { CreatePostRequest, PostCard, Timeline } from '../../shared/src/auth'
import { GroupService } from './groupService'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.connect().catch(console.error)

export class PostService {
  static async createPost(userId: string, data: CreatePostRequest): Promise<PostCard> {
    const postId = uuidv4()
    let group: any = null

    if (data.groupId) {
      group = await GroupService.getGroupById(data.groupId, userId)
      if (!group) {
        throw new Error('Group not found')
      }
      if (group.privacy === 'private' && !group.isMember) {
        throw new Error('You must be a member to post in this private group')
      }
    }

    const result = await pool.query(
      `INSERT INTO posts (id, user_id, content, media_urls, post_type, privacy, group_id, payment_amount, is_pi_locked, pi_unlock_amount, donation_goal, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        postId,
        userId,
        data.content,
        data.mediaUrls,
        data.postType,
        data.privacy,
        data.groupId || null,
        data.paymentAmount || 0,
        !!data.isPiLocked,
        data.piUnlockAmount || 0,
        data.donationGoal || 0
      ]
    )

    // Invalidate timeline cache
    await redis.del('timeline:latest')
    await redis.del('timeline:trending')
    await redis.del('timeline:pi_community')

    if (group && data.groupId) {
      await GroupService.createNotification(group.creatorId, userId, 'group_post', 'group', data.groupId)
    }

    return this.postRowToCard(result.rows[0], userId)
  }

  static async getPost(postId: string, userId?: string): Promise<PostCard | null> {
    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              g.name as group_name, g.privacy as group_privacy,
              EXISTS(SELECT 1 FROM pi_access pa WHERE pa.post_id = p.id AND pa.user_id = $2) as has_pi_access
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN groups g ON p.group_id = g.id
       WHERE p.id = $1`,
      [postId, userId || null]
    )

    if (result.rows.length === 0) return null
    const row = result.rows[0]
    const hasAccess = !row.is_pi_locked || row.user_id === userId || !!row.has_pi_access
    return this.postRowToCard(row, userId, hasAccess)
  }

  static async getTimeline(
    filter: 'latest' | 'trending' | 'pi_community' = 'latest',
    cursor?: string,
    userId?: string
  ): Promise<Timeline> {
    // Try cache first
    const cacheKey = `timeline:${filter}:${cursor || 'start'}`
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    let query = `
      SELECT p.*, u.username, u.display_name, u.avatar_url,
             g.name as group_name, g.privacy as group_privacy,
             COUNT(DISTINCT pr.id) as reaction_count,
             COUNT(DISTINCT c.id) as comment_count,
             EXISTS(SELECT 1 FROM post_reactions WHERE post_id = p.id AND user_id = $1) as user_reaction,
             EXISTS(SELECT 1 FROM pi_access pa WHERE pa.post_id = p.id AND pa.user_id = $1) as has_pi_access
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN post_reactions pr ON p.id = pr.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.is_pinned = false
    `

    const params: any[] = [userId]
    let paramCount = 1

    if (filter === 'pi_community') {
      query += ` AND p.privacy = 'pi_community'`
    }

    // Add cursor pagination
    if (cursor) {
      query += ` AND p.created_at < (SELECT created_at FROM posts WHERE id = $${++paramCount})`
      params.push(cursor)
    }

    if (filter === 'trending') {
      // Trending: high reaction count + recent
      query += `
        GROUP BY p.id, u.id, g.id
        ORDER BY (COUNT(DISTINCT pr.id) + COUNT(DISTINCT c.id)) / (1 + EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600) DESC
        LIMIT 21
      `
    } else {
      query += `
        GROUP BY p.id, u.id, g.id
        ORDER BY p.created_at DESC
        LIMIT 21
      `
    }

    const result = await pool.query(query, params)
    const posts = result.rows.slice(0, 20)
    const hasMore = result.rows.length > 20

    const timeline: Timeline = {
      posts: posts.map(row => this.postRowToCard(row, userId, !!row.has_pi_access)),
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1]?.id : undefined
    }

    // Cache for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(timeline))

    return timeline
  }

  static async getTrendingPosts(limit = 10): Promise<PostCard[]> {
    const cacheKey = 'trending:posts'
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              g.name as group_name, g.privacy as group_privacy,
              COUNT(DISTINCT pr.id) as reaction_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN groups g ON p.group_id = g.id
       LEFT JOIN post_reactions pr ON p.id = pr.post_id
       WHERE p.created_at > NOW() - INTERVAL '7 days'
       GROUP BY p.id, u.id, g.id
       ORDER BY (COUNT(DISTINCT pr.id) / (1 + EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400)) DESC
       LIMIT $1`,
      [limit]
    )

    const posts = result.rows.map(row => this.postRowToCard(row))

    // Cache for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(posts))

    return posts
  }

  static async getTrendingTopics(limit = 12): Promise<{ tag: string; count: number; lastMentioned: string; example: string }[]> {
    const cacheKey = 'explore:trending_topics'
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const result = await pool.query(
      `SELECT content, created_at FROM posts WHERE content IS NOT NULL AND created_at > NOW() - INTERVAL '7 days'`
    )

    const topicMap = new Map<string, { tag: string; count: number; lastMentioned: string; example: string }>()
    const hashtagRegex = /#([A-Za-z0-9_]+)/g

    result.rows.forEach((row: any) => {
      const content = row.content || ''
      let match: RegExpExecArray | null
      while ((match = hashtagRegex.exec(content)) !== null) {
        const tag = match[1].toLowerCase()
        const existing = topicMap.get(tag)
        const mentionedAt = row.created_at.toISOString()
        if (existing) {
          existing.count += 1
          if (mentionedAt > existing.lastMentioned) {
            existing.lastMentioned = mentionedAt
            existing.example = content
          }
        } else {
          topicMap.set(tag, {
            tag,
            count: 1,
            lastMentioned: mentionedAt,
            example: content
          })
        }
      }
    })

    const topics = Array.from(topicMap.values())
      .sort((a, b) => b.count - a.count || b.lastMentioned.localeCompare(a.lastMentioned))
      .slice(0, limit)

    await redis.setEx(cacheKey, 600, JSON.stringify(topics))
    return topics
  }

  static async searchPosts(
    query: string,
    page = 1,
    limit = 20,
    userId?: string
  ): Promise<{ posts: PostCard[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit
    const searchQuery = query.trim()
    const wildcardQuery = `%${searchQuery}%`
    const tsQuery = searchQuery.replace(/[^ -]/g, ' ').trim() || searchQuery

    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              g.name as group_name, g.privacy as group_privacy,
              COUNT(DISTINCT pr.id) as reaction_count,
              COUNT(DISTINCT c.id) as comment_count,
              EXISTS(SELECT 1 FROM post_reactions WHERE post_id = p.id AND user_id = $4) as user_reaction,
              EXISTS(SELECT 1 FROM pi_access pa WHERE pa.post_id = p.id AND pa.user_id = $4) as has_pi_access
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN groups g ON p.group_id = g.id
       LEFT JOIN post_reactions pr ON p.id = pr.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.privacy = 'public'
         AND (
           to_tsvector('english', coalesce(p.content, '')) @@ plainto_tsquery('english', $1)
           OR p.content ILIKE $2
         )
       GROUP BY p.id, u.id, g.id
       ORDER BY ts_rank(to_tsvector('english', coalesce(p.content, '')), plainto_tsquery('english', $1)) DESC,
                p.created_at DESC
       LIMIT $3 OFFSET $5`,
      [tsQuery, wildcardQuery, limit, userId || null, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM posts p
       WHERE p.privacy = 'public'
         AND (
           to_tsvector('english', coalesce(p.content, '')) @@ plainto_tsquery('english', $1)
           OR p.content ILIKE $2
         )`,
      [tsQuery, wildcardQuery]
    )

    const posts = result.rows.map((row: any) => this.postRowToCard(row, userId, !!row.has_pi_access))
    const total = parseInt(countResult.rows[0].total, 10)

    return {
      posts,
      total,
      hasMore: offset + posts.length < total
    }
  }

  static async getPostsByHashtag(
    hashtag: string,
    page = 1,
    limit = 20,
    userId?: string
  ): Promise<{ posts: PostCard[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit
    const normalizedTag = hashtag.replace(/^#/, '')
    const likePattern = `%#${normalizedTag}%`

    const result = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              g.name as group_name, g.privacy as group_privacy,
              COUNT(DISTINCT pr.id) as reaction_count,
              COUNT(DISTINCT c.id) as comment_count,
              EXISTS(SELECT 1 FROM post_reactions WHERE post_id = p.id AND user_id = $5) as user_reaction,
              EXISTS(SELECT 1 FROM pi_access pa WHERE pa.post_id = p.id AND pa.user_id = $5) as has_pi_access
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN groups g ON p.group_id = g.id
       LEFT JOIN post_reactions pr ON p.id = pr.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.privacy = 'public'
         AND p.content ILIKE $1
       GROUP BY p.id, u.id, g.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [likePattern, limit, offset, normalizedTag, userId || null]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM posts p
       WHERE p.privacy = 'public'
         AND p.content ILIKE $1`,
      [likePattern]
    )

    const posts = result.rows.map((row: any) => this.postRowToCard(row, userId, !!row.has_pi_access))
    const total = parseInt(countResult.rows[0].total, 10)

    return {
      posts,
      total,
      hasMore: offset + posts.length < total
    }
  }

  static async updatePost(postId: string, data: Partial<CreatePostRequest>): Promise<PostCard | null> {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (data.content) {
      updates.push(`content = $${++paramCount}`)
      values.push(data.content)
    }
    if (data.mediaUrls) {
      updates.push(`media_urls = $${++paramCount}`)
      values.push(data.mediaUrls)
    }
    if (data.privacy) {
      updates.push(`privacy = $${++paramCount}`)
      values.push(data.privacy)
    }

    if (updates.length === 0) return this.getPost(postId)

    updates.push(`is_edited = true`)
    updates.push(`updated_at = NOW()`)

    const result = await pool.query(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      [postId, ...values]
    )

    if (result.rows.length === 0) return null

    // Invalidate cache
    await redis.del('timeline:latest')
    await redis.del('timeline:trending')

    return this.postRowToCard(result.rows[0])
  }

  static async deletePost(postId: string): Promise<void> {
    await pool.query('DELETE FROM posts WHERE id = $1', [postId])

    // Invalidate cache
    await redis.del('timeline:latest')
    await redis.del('timeline:trending')
  }

  static async reactToPost(postId: string, userId: string, reactionType: string): Promise<void> {
    await pool.query(
      `INSERT INTO post_reactions (post_id, user_id, reaction_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = $3`,
      [postId, userId, reactionType]
    )

    // Invalidate trending cache
    await redis.del('trending:posts')
  }

  static async removeReaction(postId: string, userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    )

    // Invalidate trending cache
    await redis.del('trending:posts')
  }

  static async pinPost(postId: string): Promise<void> {
    await pool.query(
      `UPDATE posts SET is_pinned = true, updated_at = NOW() WHERE id = $1`,
      [postId]
    )

    // Invalidate cache
    await redis.del('timeline:latest')
    await redis.del('timeline:trending')
  }

  static async unpinPost(postId: string): Promise<void> {
    await pool.query(
      `UPDATE posts SET is_pinned = false, updated_at = NOW() WHERE id = $1`,
      [postId]
    )

    // Invalidate cache
    await redis.del('timeline:latest')
    await redis.del('timeline:trending')
  }

  private static postRowToCard(row: any, currentUserId?: string, hasAccess = false): PostCard {
    const locked = !!row.is_pi_locked && !hasAccess && currentUserId !== row.user_id
    return {
      id: row.id,
      userId: row.user_id,
      groupId: row.group_id,
      group: row.group_name
        ? {
            id: row.group_id,
            name: row.group_name,
            privacy: row.group_privacy
          }
        : undefined,
      content: locked ? 'This premium post is locked behind Pi access. Unlock it to view full content.' : row.content,
      mediaUrls: locked ? undefined : row.media_urls,
      postType: row.post_type,
      privacy: row.privacy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      editedAt: row.is_edited ? row.updated_at : undefined,
      isPinned: row.is_pinned,
      isPiLocked: !!row.is_pi_locked,
      piUnlockAmount: parseFloat(row.pi_unlock_amount || 0),
      donationGoal: parseFloat(row.donation_goal || 0),
      donationReceived: parseFloat(row.donation_received || 0),
      donationProgress: row.donation_goal ? Math.min(100, (parseFloat(row.donation_received || 0) / parseFloat(row.donation_goal || 1)) * 100) : 0,
      likesCount: parseInt(row.reaction_count || 0),
      commentsCount: parseInt(row.comment_count || 0),
      userReaction: row.user_reaction,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url
      }
    }
  }
}