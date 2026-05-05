import { useState, useEffect } from 'react'
import { Profile, Post } from 'shared/auth'
import { getUserProfile, getUserPosts } from '../services/api'

export const useProfile = (username: string) => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const [profileData, postsData] = await Promise.all([
        getUserProfile(username),
        getUserPosts(username)
      ])

      setProfile(profileData)
      setPosts(postsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (username) {
      fetchProfile()
    }
  }, [username])

  const refetch = () => {
    fetchProfile()
  }

  return {
    profile,
    posts,
    loading,
    error,
    refetch
  }
}