import { useState, useCallback, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Loader } from 'lucide-react'
import { motion } from 'framer-motion'
import { Timeline, PostCard as PostCardType } from 'shared/auth'
import PostCard from './PostCard'
import PostComposer from './PostComposer'

interface FeedProps {
  initialPosts?: PostCardType[]
  onFeedUpdate?: () => void
}

const Feed = ({ initialPosts = [], onFeedUpdate }: FeedProps) => {
  const [posts, setPosts] = useState<PostCardType[]>(initialPosts)
  const [filter, setFilter] = useState<'latest' | 'trending' | 'pi_community'>('latest')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const { ref, inView } = useInView()

  // Simulated fetch - replace with actual API
  const fetchPosts = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock data
      const newPosts: PostCardType[] = [
        {
          id: `post-${Date.now()}`,
          content: 'This is a sample post from the feed!',
          mediaUrls: [],
          createdAt: new Date().toISOString(),
          likesCount: Math.floor(Math.random() * 100),
          commentsCount: Math.floor(Math.random() * 50),
          userId: 'user-1',
          user: {
            id: 'user-1',
            username: 'piconnect_user',
            displayName: 'Pi Connect User',
            avatarUrl: 'https://via.placeholder.com/40'
          },
          postType: 'text',
          privacy: 'public',
          reactions: [
            { type: 'like', count: Math.floor(Math.random() * 50) },
            { type: 'rocket', count: Math.floor(Math.random() * 30) }
          ]
        }
      ]

      setPosts(prev => [...prev, ...newPosts])
      setHasMore(Math.random() > 0.3) // 70% chance more posts available
      setCursor(`cursor-${Date.now()}`)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore])

  // Load more when scroll reaches bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchPosts()
    }
  }, [inView, hasMore, isLoading, fetchPosts])

  const handleReaction = async (postId: string, reactionType: string) => {
    // API call would go here
    setPosts(posts.map(post =>
      post.id === postId
        ? {
            ...post,
            userReaction: post.userReaction === reactionType ? undefined : reactionType as any
          }
        : post
    ))
  }

  const filters = [
    { id: 'latest', label: 'Latest', icon: '⏱️' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'pi_community', label: 'Pi Community', icon: '🍕' }
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post Composer */}
      <PostComposer onPostCreated={onFeedUpdate} />

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-4 sticky top-0 z-40">
        <div className="flex gap-2">
          {filters.map(f => (
            <motion.button
              key={f.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <motion.div layout>
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No posts yet</p>
            <button
              onClick={() => {
                setPosts([
                  {
                    id: '1',
                    content: 'Welcome to PiConnect! 🍕',
                    mediaUrls: [],
                    createdAt: new Date().toISOString(),
                    likesCount: 42,
                    commentsCount: 5,
                    userId: 'user-1',
                    user: {
                      id: 'user-1',
                      username: 'piconnect',
                      displayName: 'PiConnect',
                      avatarUrl: 'https://via.placeholder.com/40'
                    },
                    postType: 'text',
                    privacy: 'public',
                    reactions: [{ type: 'like', count: 30 }]
                  }
                ])
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Load Sample Posts
            </button>
          </div>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard
                post={post}
                onReact={(type) => handleReaction(post.id, type)}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={ref} className="py-8 text-center">
          <p className="text-gray-500">Loading more posts...</p>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No more posts</p>
        </div>
      )}
    </div>
  )
}

export default Feed