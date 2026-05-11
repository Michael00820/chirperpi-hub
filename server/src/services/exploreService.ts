import { PostService } from './postService'
import { GroupService } from './groupService'
import { pool, redisClient as redis } from '../infrastructure/clients'

export interface TrendingTopic {
  tag: string
  count: number
  lastMentioned: string
  example: string
}

export interface CommunityServiceItem {
  id: string
  title: string
  description: string
  category: string
  url: string
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
}

export interface ExploreSummary {
  trendingTopics: TrendingTopic[]
  suggestedUsers: any[]
  popularPosts: any[]
  activeGroups: any[]
  communityServices: CommunityServiceItem[]
  newsItems: NewsItem[]
}

export class ExploreService {
  static async getSummary(userId?: string): Promise<ExploreSummary> {
    const cacheKey = `explore:summary:${userId || 'anonymous'}`
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    const trendingTopics = await PostService.getTrendingTopics(12)
    const suggestedUsers = await this.getSuggestedUsers(userId, 8)
    const popularPosts = await PostService.getTrendingPosts(8)
    const activeGroups = await GroupService.getPopularGroups(undefined, 8)
    const communityServices = this.getCommunityServices()
    const newsItems = this.getPiNetworkNews()

    const summary: ExploreSummary = {
      trendingTopics,
      suggestedUsers,
      popularPosts,
      activeGroups,
      communityServices,
      newsItems
    }

    await redis.setEx(cacheKey, 300, JSON.stringify(summary))
    return summary
  }

  static async getTopicPosts(topic: string, page = 1, limit = 20, userId?: string) {
    return PostService.getPostsByHashtag(topic, page, limit, userId)
  }

  static async getSuggestedUsers(userId?: string, limit = 8): Promise<any[]> {
    const interestsResult = userId
      ? await pool.query('SELECT interests FROM profiles WHERE user_id = $1', [userId])
      : null
    const interests: string[] = interestsResult?.rows[0]?.interests || []

    void [userId || null, interests, limit]

    if (!userId) {
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, u.verification_status,
                COALESCE(follower_counts.count, 0) as follower_count,
                0 as common_interests
         FROM users u
         LEFT JOIN (
           SELECT following_id, COUNT(*) as count FROM follows GROUP BY following_id
         ) follower_counts ON follower_counts.following_id = u.id
         WHERE u.verification_status = 'verified'
         ORDER BY follower_count DESC, u.display_name ASC
         LIMIT $1`,
        [limit]
      )

      return result.rows
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.verification_status,
              COALESCE(follower_counts.count, 0) as follower_count,
              COALESCE(common_interests.count, 0) as common_interests
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN (
         SELECT following_id, COUNT(*) as count FROM follows GROUP BY following_id
       ) follower_counts ON follower_counts.following_id = u.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) as count
         FROM unnest(COALESCE(p.interests, ARRAY[]::text[])) interest
         WHERE interest = ANY($2)
       ) common_interests ON true
       WHERE u.verification_status = 'verified'
         AND u.id != $1
         AND NOT EXISTS (
           SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id
         )
       ORDER BY common_interests DESC, follower_count DESC, u.display_name ASC
       LIMIT $3`,
      [userId, interests, limit]
    )

    return result.rows
  }

  static getCommunityServices(): CommunityServiceItem[] {
    return [
      {
        id: 'wallet-support',
        title: 'Pi Wallet Support Hub',
        description: 'Verified community guides for Pi wallet setup, security, and transfers.',
        category: 'Wallet',
        url: '/community-services/wallet-support'
      },
      {
        id: 'merchant-connect',
        title: 'Merchant & Services Directory',
        description: 'Browse trusted Pi network merchants, service providers, and onboarding experts.',
        category: 'Marketplace',
        url: '/community-services/merchant-connect'
      },
      {
        id: 'developer-labs',
        title: 'Developer Labs',
        description: 'Join Pi developer communities for dApp, smart contract, and API collaboration.',
        category: 'Development',
        url: '/community-services/developer-labs'
      },
      {
        id: 'education-collective',
        title: 'Pi Education Collective',
        description: 'Learning resources, tutorials, and mentoring for new Pi network builders.',
        category: 'Education',
        url: '/community-services/education-collective'
      }
    ]
  }

  static getPiNetworkNews(): NewsItem[] {
    return [
      {
        id: 'pi-ecosystem-update',
        title: 'Pi Ecosystem Update',
        summary: 'Key launches, governance news, and upcoming Pi community events.',
        source: 'Pi Connect Newsroom',
        url: 'https://pi.network/news/ecosystem-update',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'verified-projects',
        title: 'Verified Projects Spotlight',
        summary: 'New Pi-verified services and projects gaining traction in the network.',
        source: 'Pi Official Blog',
        url: 'https://pi.network/news/verified-projects',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'network-insights',
        title: 'Network Insights & Governance',
        summary: 'Updates on Pi governance proposals, network stats, and community milestones.',
        source: 'Pi Governance Desk',
        url: 'https://pi.network/news/network-insights',
        publishedAt: new Date().toISOString()
      }
    ]
  }
}
