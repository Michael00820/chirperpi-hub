import api from './api'
import { ExploreSummary, PostCard, TrendingTopic } from 'shared/auth'

export const getExploreSummary = async (): Promise<ExploreSummary> => {
  const response = await api.get('/explore')
  return response.data
}

export const searchPosts = async (query: string, page = 1, limit = 20) => {
  const response = await api.get('/posts/search', {
    params: { q: query, page, limit }
  })
  return response.data
}

export const searchTopics = async (topic: string, page = 1, limit = 20) => {
  const response = await api.get(`/explore/topics/${encodeURIComponent(topic)}`, {
    params: { page, limit }
  })
  return response.data
}

export const searchGroups = async (query: string, category?: string, sort: 'popular' | 'recent' = 'recent', page = 1, limit = 20) => {
  const response = await api.get('/groups/discover', {
    params: { q: query, category, sort, page, limit }
  })
  return response.data
}

export const searchUsers = async (query: string, page = 1, limit = 20) => {
  const response = await api.get('/users/search', {
    params: { q: query, page, limit }
  })
  return response.data
}

export const getTrendingTopics = async (): Promise<TrendingTopic[]> => {
  const response = await api.get('/explore')
  return response.data.trendingTopics
}
