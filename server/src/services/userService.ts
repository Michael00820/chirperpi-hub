import { pool } from '../infrastructure/clients'

// Types
interface User {
  id: string
  pi_user_id: string
  username: string
  display_name?: string
  avatar_url?: string
  bio?: string
  pi_wallet_address?: string
  verification_status: string
}

// @ts-ignore
interface Profile {
  id: string
  user_id: string
  cover_photo?: string
  location?: string
  website?: string
  interests?: string[]
  social_links?: Record<string, string>
  pi_balance_cache: number
}

interface Post {
  id: string
  content: string
  media_urls?: string[]
  created_at: string
  likes_count: number
  comments_count: number
  is_liked?: boolean
}

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const result = await pool.query(
    'SELECT id, pi_user_id, username, display_name, avatar_url, bio, pi_wallet_address, verification_status FROM users WHERE username = $1',
    [username]
  )
  return result.rows[0] || null
}

export const getUserById = async (userId: string): Promise<User | null> => {
  const result = await pool.query(
    'SELECT id, pi_user_id, username, display_name, avatar_url, bio, pi_wallet_address, verification_status FROM users WHERE id = $1',
    [userId]
  )
  return result.rows[0] || null
}

export const updateProfileBalanceCache = async (userId: string, delta: number): Promise<void> => {
  await pool.query(
    `INSERT INTO profiles (user_id, pi_balance_cache)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET pi_balance_cache = profiles.pi_balance_cache + $2`,
    [userId, delta]
  )
}

export const getUserProfile = async (username: string, currentUserId?: string): Promise<any> => {
  const user = await getUserByUsername(username)
  if (!user) return null

  const viewer = currentUserId ? await getUserById(currentUserId) : null
  const viewerVerified = viewer?.verification_status === 'verified'

  // Get profile data
  const profileResult = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [user.id]
  )
  const profile = profileResult.rows[0]

  // Get follower counts
  const followersResult = await pool.query(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = $1',
    [user.id]
  )
  const followingResult = await pool.query(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
    [user.id]
  )

  // Get posts count
  const postsCountResult = await pool.query(
    'SELECT COUNT(*) as count FROM posts WHERE user_id = $1',
    [user.id]
  )

  // Check if current user is following
  let isFollowing = false
  if (currentUserId) {
    const followCheck = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
      [currentUserId, user.id]
    )
    isFollowing = followCheck.rows.length > 0
  }

  const isOwner = currentUserId === user.id
  const showFullProfile = user.verification_status === 'verified' || isOwner || viewerVerified

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    coverPhoto: profile?.cover_photo,
    bio: showFullProfile ? user.bio : undefined,
    piWalletAddress: showFullProfile ? user.pi_wallet_address : undefined,
    piBalance: profile?.pi_balance_cache ? parseFloat(profile.pi_balance_cache) : 0,
    verificationStatus: user.verification_status,
    location: showFullProfile ? profile?.location : undefined,
    website: showFullProfile ? profile?.website : undefined,
    interests: showFullProfile ? profile?.interests : undefined,
    socialLinks: showFullProfile ? profile?.social_links : undefined,
    followersCount: parseInt(followersResult.rows[0].count),
    followingCount: parseInt(followingResult.rows[0].count),
    postsCount: parseInt(postsCountResult.rows[0].count),
    isOwnProfile: isOwner,
    isFollowing
  }
}

export const updateUserProfile = async (userId: string, updateData: any): Promise<any> => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Update users table
    if (updateData.displayName || updateData.avatarUrl || updateData.bio) {
      const userUpdates: any = {}
      const userValues: any[] = []
      let userParamCount = 1

      if (updateData.displayName) {
        userUpdates.display_name = `$${userParamCount++}`
        userValues.push(updateData.displayName)
      }
      if (updateData.avatarUrl) {
        userUpdates.avatar_url = `$${userParamCount++}`
        userValues.push(updateData.avatarUrl)
      }
      if (updateData.bio !== undefined) {
        userUpdates.bio = `$${userParamCount++}`
        userValues.push(updateData.bio)
      }

      if (Object.keys(userUpdates).length > 0) {
        const userSetClause = Object.keys(userUpdates).map(key => `${key} = ${userUpdates[key]}`).join(', ')
        await client.query(
          `UPDATE users SET ${userSetClause}, updated_at = NOW() WHERE id = $${userParamCount}`,
          [...userValues, userId]
        )
      }
    }

    // Update or insert profiles table
    const profileFields = ['coverPhoto', 'location', 'website', 'interests', 'socialLinks']
    const profileUpdates: any = {}
    const profileValues: any[] = []
    let profileParamCount = 1

    profileFields.forEach(field => {
      if (updateData[field] !== undefined) {
        const dbField = field === 'coverPhoto' ? 'cover_photo' :
                       field === 'socialLinks' ? 'social_links' : field.toLowerCase()
        profileUpdates[dbField] = `$${profileParamCount++}`
        profileValues.push(updateData[field])
      }
    })

    if (Object.keys(profileUpdates).length > 0) {
      // Check if profile exists
      const existingProfile = await client.query(
        'SELECT id FROM profiles WHERE user_id = $1',
        [userId]
      )

      if (existingProfile.rows.length > 0) {
        // Update existing profile
        const profileSetClause = Object.keys(profileUpdates).map(key => `${key} = ${profileUpdates[key]}`).join(', ')
        await client.query(
          `UPDATE profiles SET ${profileSetClause}, updated_at = NOW() WHERE user_id = $${profileParamCount}`,
          [...profileValues, userId]
        )
      } else {
        // Insert new profile
        const fields = ['user_id', ...Object.keys(profileUpdates)]
        const placeholders = fields.map((_, i) => `$${i + 1}`)
        const values = [userId, ...profileValues]

        await client.query(
          `INSERT INTO profiles (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
          values
        )
      }
    }

    await client.query('COMMIT')

    // Return updated profile
    return getUserProfileById(userId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const getUserProfileById = async (userId: string): Promise<any> => {
  const userResult = await pool.query(
    'SELECT id, pi_user_id, username, display_name, avatar_url, bio, pi_wallet_address, verification_status FROM users WHERE id = $1',
    [userId]
  )
  const user = userResult.rows[0]
  if (!user) return null

  // Get username for profile lookup and preserve owner view
  return getUserProfile(user.username, userId)
}

export const getUserPosts = async (userId: string, page: number, limit: number): Promise<Post[]> => {
  const offset = (page - 1) * limit

  const result = await pool.query(
    `SELECT
      p.id,
      p.content,
      p.media_urls,
      p.created_at,
      COALESCE(like_counts.likes_count, 0) as likes_count,
      COALESCE(comment_counts.comments_count, 0) as comments_count
     FROM posts p
     LEFT JOIN (
       SELECT post_id, COUNT(*) as likes_count
       FROM post_reactions
       GROUP BY post_id
     ) like_counts ON p.id = like_counts.post_id
     LEFT JOIN (
       SELECT post_id, COUNT(*) as comments_count
       FROM comments
       GROUP BY post_id
     ) comment_counts ON p.id = comment_counts.post_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  )

  return result.rows.map(row => ({
    id: row.id,
    content: row.content,
    media_urls: row.media_urls,
    created_at: row.created_at,
    likes_count: parseInt(row.likes_count),
    comments_count: parseInt(row.comments_count)
  }))
}

export const followUser = async (followerId: string, followingId: string): Promise<void> => {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself')
  }

  await pool.query(
    'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [followerId, followingId]
  )
}

export const unfollowUser = async (followerId: string, followingId: string): Promise<void> => {
  await pool.query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  )
}

export const searchUsers = async (query: string, page: number, limit: number): Promise<any> => {
  const offset = (page - 1) * limit

  // Search by username, display name, or Pi wallet
  const searchQuery = `%${query}%`
  const result = await pool.query(
    `SELECT
      id,
      username,
      display_name,
      avatar_url,
      verification_status
     FROM users
     WHERE (username ILIKE $1 OR display_name ILIKE $1 OR pi_wallet_address ILIKE $1)
     AND verification_status = 'verified'
     ORDER BY
       CASE
         WHEN username ILIKE $1 THEN 1
         WHEN display_name ILIKE $1 THEN 2
         ELSE 3
       END,
       username
     LIMIT $2 OFFSET $3`,
    [searchQuery, limit, offset]
  )

  // Get total count
  const countResult = await pool.query(
    'SELECT COUNT(*) as total FROM users WHERE (username ILIKE $1 OR display_name ILIKE $1 OR pi_wallet_address ILIKE $1) AND verification_status = $2',
    [searchQuery, 'verified']
  )

  const total = parseInt(countResult.rows[0].total)

  return {
    users: result.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      verificationStatus: row.verification_status
    })),
    total,
    hasMore: offset + result.rows.length < total
  }
}