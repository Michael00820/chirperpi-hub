import axios from 'axios'
import { User, Profile, Post, SearchResult } from 'shared/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Profile APIs
export const getUserProfile = async (username: string): Promise<Profile> => {
  const response = await api.get(`/users/${username}`)
  return response.data
}

export const updateUserProfile = async (data: Partial<Profile>): Promise<Profile> => {
  const response = await api.put('/users/profile', data)
  return response.data
}

export const getUserPosts = async (username: string, page = 1, limit = 20): Promise<Post[]> => {
  const response = await api.get(`/users/${username}/posts`, {
    params: { page, limit }
  })
  return response.data.posts
}

// Follow APIs
export const followUser = async (userId: string): Promise<void> => {
  await api.post(`/users/${userId}/follow`)
}

export const unfollowUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}/follow`)
}

// Search APIs
export const searchUsers = async (
  query: string,
  page = 1,
  limit = 20
): Promise<SearchResult> => {
  const response = await api.get('/users/search', {
    params: { q: query, page, limit }
  })
  return response.data
}

export default api