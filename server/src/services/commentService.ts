import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { Comment } from '../../../shared/src/auth'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export class CommentService {
  static async addComment(postId: string, userId: string, content: string, parentCommentId?: string): Promise<Comment> {
    const commentId = uuidv4()

    const result = await pool.query(
      `INSERT INTO comments (id, post_id, user_id, content, parent_comment_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [commentId, postId, userId, content, parentCommentId]
    )

    return this.commentRowToComment(result.rows[0])
  }

  static async getComments(postId: string, page = 1, limit = 20): Promise<Comment[]> {
    const offset = (page - 1) * limit

    const result = await pool.query(
      `SELECT c.*, u.username, u.avatar_url,
              COUNT(DISTINCT cl.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON c.id = cl.comment_id
       WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
       GROUP BY c.id, u.id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    )

    // For each comment, fetch replies
    const comments = await Promise.all(
      result.rows.map(async (row) => {
        const replies = await this.getReplies(row.id)
        return this.commentRowToComment(row, replies)
      })
    )

    return comments
  }

  static async getReplies(parentCommentId: string): Promise<Comment[]> {
    const result = await pool.query(
      `SELECT c.*, u.username, u.avatar_url,
              COUNT(DISTINCT cl.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON c.id = cl.comment_id
       WHERE c.parent_comment_id = $1
       GROUP BY c.id, u.id
       ORDER BY c.created_at ASC`,
      [parentCommentId]
    )

    return result.rows.map(row => this.commentRowToComment(row, []))
  }

  static async getCommentById(commentId: string): Promise<Comment | null> {
    const result = await pool.query(
      `SELECT c.*, u.username, u.avatar_url,
              COUNT(DISTINCT cl.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON c.id = cl.comment_id
       WHERE c.id = $1
       GROUP BY c.id, u.id`,
      [commentId]
    )

    if (result.rows.length === 0) return null
    return this.commentRowToComment(result.rows[0], [])
  }

  static async deleteComment(commentId: string): Promise<void> {
    // Soft delete by marking as deleted, or hard delete if preferred
    await pool.query(
      `DELETE FROM comments WHERE id = $1 OR parent_comment_id = $1`,
      [commentId]
    )
  }

  static async likeComment(commentId: string, userId: string): Promise<void> {
    await pool.query(
      `INSERT INTO comment_likes (comment_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [commentId, userId]
    )
  }

  static async unlikeComment(commentId: string, userId: string): Promise<void> {
    await pool.query(
      `DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId]
    )
  }

  private static commentRowToComment(row: any, replies?: Comment[]): Comment {
    return {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        avatarUrl: row.avatar_url
      },
      replies: replies || [],
      likesCount: parseInt(row.likes_count || 0)
    }
  }
}

export const addComment = async (postId: string, userId: string, content: string, parentCommentId?: string): Promise<Comment> => {
  return CommentService.addComment(postId, userId, content, parentCommentId)
}

export const getComments = async (postId: string, page?: number, limit?: number): Promise<Comment[]> => {
  return CommentService.getComments(postId, page, limit)
}

export const deleteComment = async (commentId: string): Promise<void> => {
  return CommentService.deleteComment(commentId)
}