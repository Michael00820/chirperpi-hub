import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react'
import { Post } from 'shared/auth'

interface ProfilePostsProps {
  posts: Post[]
}

const ProfilePosts = ({ posts }: ProfilePostsProps) => {
  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
        <p className="text-gray-600">This user hasn't posted anything yet.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {posts.map((post) => (
        <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-gray-900 mb-3">{post.content}</p>

              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {post.mediaUrls.slice(0, 4).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Post media ${index + 1}`}
                      className="rounded-lg object-cover w-full h-32"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                    <Share className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProfilePosts