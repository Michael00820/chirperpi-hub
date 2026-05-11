import webpush from 'web-push'
import { Notification, NotificationPreferences, NotificationType } from '../../../shared/src/auth'
import { pool, redisClient } from '../infrastructure/clients'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export class NotificationService {
  static async createNotification(payload: {
    userId: string
    actorId: string
    notificationType: NotificationType
    entityType?: string
    entityId?: string
    title?: string
    message?: string
    targetUrl?: string
    metadata?: Record<string, string | number | boolean>
  }): Promise<Notification> {
    const aggregationKey = `${payload.notificationType}:${payload.entityType || ''}:${payload.entityId || ''}`
    const existing = await pool.query(
      `SELECT id, group_count
       FROM notifications
       WHERE user_id = $1
         AND aggregation_key = $2
         AND is_read = false
         AND created_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC
       LIMIT 1`,
      [payload.userId, aggregationKey]
    )

    let notificationId: string
    let groupCount = 1

    if ((existing.rowCount ?? 0) > 0) {
      notificationId = existing.rows[0].id
      groupCount = existing.rows[0].group_count + 1
      await pool.query(
        `UPDATE notifications
         SET group_count = $1,
             created_at = NOW(),
             updated_at = NOW(),
             title = COALESCE($2, title),
             message = COALESCE($3, message),
             target_url = COALESCE($4, target_url),
             metadata = COALESCE($5, metadata)
         WHERE id = $6`,
        [groupCount, payload.title, payload.message, payload.targetUrl, payload.metadata || null, notificationId]
      )
    } else {
      const insertResult = await pool.query(
        `INSERT INTO notifications
         (user_id, actor_id, notification_type, entity_type, entity_id, title, message, target_url, metadata, aggregation_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          payload.userId,
          payload.actorId,
          payload.notificationType,
          payload.entityType || null,
          payload.entityId || null,
          payload.title || null,
          payload.message || null,
          payload.targetUrl || null,
          payload.metadata ? JSON.stringify(payload.metadata) : null,
          aggregationKey
        ]
      )
      notificationId = insertResult.rows[0].id
    }

    const notification = await this.getNotificationById(notificationId)

    if (notification) {
      await this.publishSocketNotification(notification)
      await this.deliverWebPush(notification)
    }

    return notification!
  }

  static async publishSocketNotification(notification: Notification) {
    await redisClient.publish(`notifications:${notification.userId}`, JSON.stringify(notification))
  }

  static async getNotificationById(notificationId: string): Promise<Notification | null> {
    const result = await pool.query(
      `SELECT n.*, u.username AS actor_username, u.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.id = $1`,
      [notificationId]
    )

    if (result.rowCount === 0) return null

    const row = result.rows[0]
    return {
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      actor: {
        id: row.actor_id,
        username: row.actor_username,
        avatarUrl: row.actor_avatar_url
      },
      notificationType: row.notification_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      message: row.message,
      targetUrl: row.target_url,
      metadata: row.metadata,
      groupCount: row.group_count,
      isRead: row.is_read,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  static async getNotifications(userId: string, page = 1, limit = 20): Promise<{ notifications: Notification[]; total: number; hasMore: boolean }> {
    const offset = (page - 1) * limit
    const result = await pool.query(
      `SELECT n.*, u.username as actor_username, u.avatar_url as actor_avatar_url
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`,
      [userId]
    )

    const total = parseInt(countResult.rows[0].total, 10)

    return {
      notifications: result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        actorId: row.actor_id,
        actor: {
          id: row.actor_id,
          username: row.actor_username,
          avatarUrl: row.actor_avatar_url
        },
        notificationType: row.notification_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        message: row.message,
        targetUrl: row.target_url,
        metadata: row.metadata,
        groupCount: row.group_count,
        isRead: row.is_read,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total,
      hasMore: offset + result.rows.length < total
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    )
    return parseInt(result.rows[0].count, 10)
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    )
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [userId]
    )
  }

  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    )

    if (result.rowCount === 0) {
      const insertResult = await pool.query(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      )
      return this.mapPreferenceRow(insertResult.rows[0])
    }

    return this.mapPreferenceRow(result.rows[0])
  }

  private static mapPreferenceRow(row: any): NotificationPreferences {
    return {
      userId: row.user_id,
      pushFollow: row.push_follow,
      pushLike: row.push_like,
      pushComment: row.push_comment,
      pushMention: row.push_mention,
      pushGroupInvite: row.push_group_invite,
      pushPiTransaction: row.push_pi_transaction,
      pushServiceUpdate: row.push_service_update,
      emailDigestEnabled: row.email_digest_enabled,
      emailDigestFrequency: row.email_digest_frequency,
      soundEnabled: row.sound_enabled,
      pushEnabled: row.push_enabled
    }
  }

  static async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const keyMap: Record<string, string> = {
      pushFollow: 'push_follow',
      pushLike: 'push_like',
      pushComment: 'push_comment',
      pushMention: 'push_mention',
      pushGroupInvite: 'push_group_invite',
      pushPiTransaction: 'push_pi_transaction',
      pushServiceUpdate: 'push_service_update',
      emailDigestEnabled: 'email_digest_enabled',
      emailDigestFrequency: 'email_digest_frequency',
      soundEnabled: 'sound_enabled',
      pushEnabled: 'push_enabled'
    }

    const updates: string[] = []
    const values: any[] = [userId]
    let index = 2

    for (const key of Object.keys(preferences)) {
      const column = keyMap[key]
      if (column) {
        updates.push(`${column} = $${index}`)
        values.push((preferences as any)[key])
        index++
      }
    }

    if (updates.length === 0) {
      return this.getPreferences(userId)
    }

    await pool.query(
      `UPDATE notification_preferences SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $1`,
      values
    )

    return this.getPreferences(userId)
  }

  static async savePushSubscription(userId: string, subscription: any): Promise<void> {
    await pool.query(
      `INSERT INTO notification_subscriptions (user_id, endpoint, keys, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, keys = EXCLUDED.keys, updated_at = NOW()`,
      [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
    )
  }

  static async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await pool.query(
      `DELETE FROM notification_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint]
    )
  }

  static async getSubscriptions(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT endpoint, keys FROM notification_subscriptions WHERE user_id = $1`,
      [userId]
    )
    return result.rows.map((row: any) => ({
      endpoint: row.endpoint,
      keys: row.keys
    }))
  }

  static async deliverWebPush(notification: Notification): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
      return
    }

    const preferences = await this.getPreferences(notification.userId!)
    const pushKeyMap: Record<NotificationType, keyof NotificationPreferences> = {
      follow: 'pushFollow',
      like: 'pushLike',
      comment: 'pushComment',
      mention: 'pushMention',
      group_invite: 'pushGroupInvite',
      pi_transaction: 'pushPiTransaction',
      service_update: 'pushServiceUpdate',
      group_join: 'pushGroupInvite',
      group_post: 'pushGroupInvite',
      group_role_change: 'pushGroupInvite',
      proposal_created: 'pushServiceUpdate',
      proposal_voting_ended: 'pushServiceUpdate',
      proposal_executed: 'pushServiceUpdate'
    }

    const preferenceKey = pushKeyMap[notification.notificationType]
    if (!preferences.pushEnabled || preferences[preferenceKey] === false) {
      return
    }

    const subscriptions = await this.getSubscriptions(notification.userId!)
    const payload = JSON.stringify({
      title: notification.title || 'New notification',
      body: notification.message || 'You have a new update.',
      data: {
        notificationType: notification.notificationType,
        targetUrl: notification.targetUrl || '/',
        entityId: notification.entityId,
        entityType: notification.entityType
      }
    })

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload)
      } catch (error) {
        console.error('Web push send failed:', error)
      }
    }
  }

  static async cleanupOldNotifications(): Promise<void> {
    await pool.query(`SELECT cleanup_old_notifications()`)
  }
}
