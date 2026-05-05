import { useState } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { followUser, unfollowUser } from '../../services/api'

interface FollowButtonProps {
  userId: string
  username: string
  isFollowing: boolean
}

const FollowButton = ({ userId, username, isFollowing: initialIsFollowing }: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const handleFollowToggle = async () => {
    if (loading) return

    setLoading(true)
    try {
      // Optimistic update
      setIsFollowing(!isFollowing)

      if (isFollowing) {
        await unfollowUser(userId)
      } else {
        await followUser(userId)
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(isFollowing)
      console.error('Follow/unfollow error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isFollowing ? (
        <>
          <UserMinus className="w-4 h-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </button>
  )
}

export default FollowButton