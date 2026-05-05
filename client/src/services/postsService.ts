import { CreatePostRequest, PostCard, Timeline, Comment } from 'shared/auth'
import api from './api'

// Create a post
export const createPost = async (data: CreatePostRequest): Promise<PostCard> => {
  const response = await api.post('/posts', data)
  return response.data
}

// Get post by ID
export const getPost = async (postId: string): Promise<PostCard> => {
  const response = await api.get(`/posts/${postId}`)
  return response.data
}

// Get timeline (feed)
export const getTimeline = async (
  filter: 'latest' | 'trending' | 'pi_community' = 'latest',
  cursor?: string
): Promise<Timeline> => {
  const response = await api.get('/timeline', {
    params: { filter, cursor }
  })
  return response.data
}

// Get trending posts
export const getTrendingPosts = async (limit = 10): Promise<PostCard[]> => {
  const response = await api.get('/posts/trending', {
    params: { limit }
  })
  return response.data.posts
}

// Update a post
export const updatePost = async (postId: string, data: Partial<CreatePostRequest>): Promise<PostCard> => {
  const response = await api.put(`/posts/${postId}`, data)
  return response.data
}

// Delete a post
export const deletePost = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}`)
}

// React to a post
export const reactToPost = async (
  postId: string,
  reactionType: 'like' | 'love' | 'care' | 'celebrate' | 'support' | 'rocket'
): Promise<void> => {
  await api.post(`/posts/${postId}/react`, { reactionType })
}

// Remove reaction from post
export const removeReaction = async (postId: string): Promise<void> => {
  await api.delete(`/posts/${postId}/react`)
}

// Get comments on a post
export const getPostComments = async (postId: string, page = 1, limit = 20): Promise<Comment[]> => {
  const response = await api.get(`/posts/${postId}/comments`, {
    params: { page, limit }
  })
  return response.data.comments
}

// Add comment to post
export const addComment = async (postId: string, content: string, parentCommentId?: string): Promise<Comment> => {
  const response = await api.post(`/posts/${postId}/comments`, {
    content,
    parentCommentId
  })
  return response.data
}

// Delete comment
export const deleteComment = async (postId: string, commentId: string): Promise<void> => {
  await api.delete(`/posts/${postId}/comments/${commentId}`)
}

// Pin a post (admin/owner only)
export const pinPost = async (postId: string): Promise<PostCard> => {
  const response = await api.post(`/posts/${postId}/pin`)
  return response.data
}

// Unpin a post
export const unpinPost = async (postId: string): Promise<PostCard> => {
  const response = await api.post(`/posts/${postId}/unpin`)
  return response.data
}

// Upload media to IPFS
export const uploadMedia = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress?.(percentCompleted)
      }
    }
  })

  return response.data.url
}

export default api