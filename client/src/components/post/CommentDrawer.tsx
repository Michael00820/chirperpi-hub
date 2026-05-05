import { useState } from 'react'
import { X, Send, Heart, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Comment } from 'shared/auth'
import TransactionModal from '../transactions/TransactionModal'
import { tipEntity } from '../../services/transactionService'

interface CommentDrawerProps {
  postId: string
  onClose: () => void
}

const CommentDrawer = ({ postId, onClose }: CommentDrawerProps) => {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      content: 'Great post!',
      createdAt: new Date().toISOString(),
      user: {
        id: 'user1',
        username: 'john_doe',
        avatarUrl: '/avatar1.png'
      },
      likesCount: 5,
      replies: [
        {
          id: '2',
          content: 'Thanks!',
          createdAt: new Date().toISOString(),
          user: {
            id: 'user2',
            username: 'poster',
            avatarUrl: '/avatar2.png'
          },
          likesCount: 2
        }
      ]
    }
  ])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [isTipOpen, setIsTipOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      // API call would go here
      const comment: Comment = {
        id: Date.now().toString(),
        content: newComment,
        createdAt: new Date().toISOString(),
        user: {
          id: 'current_user',
          username: 'you',
          avatarUrl: '/current-avatar.png'
        },
        likesCount: 0
      }
      setComments([comment, ...comments])
      setNewComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const CommentItem = ({ comment, level = 0 }: { comment: Comment; level?: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`mb-3 ${level > 0 ? 'ml-8 pl-3 border-l border-gray-200' : ''}`}
    >
      <div className="flex gap-2">
        <img
          src={comment.user.avatarUrl || '/default-avatar.png'}
          alt={comment.user.username}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{comment.user.username}</span>
              <span className="text-xs text-gray-500">now</span>
            </div>
            <p className="text-sm text-gray-900 break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
            <button className="hover:text-red-500 transition-colors flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{comment.likesCount}</span>
            </button>
            <button className="hover:text-blue-500" onClick={() => { setSelectedComment(comment); setIsTipOpen(true) }}>
              <Zap className="w-3 h-3" /> Tip
            </button>
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} level={level + 1} />
          ))}
        </div>
      )}
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-gray-50 rounded-lg"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Comments</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Comments List */}
      <div className="mb-4 max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No comments yet</p>
        ) : (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="border-t pt-3">
        <div className="flex gap-2">
          <img
            src="/current-avatar.png"
            alt="You"
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <TransactionModal
        isOpen={isTipOpen}
        title="Tip a comment"
        description={selectedComment ? `Send Pi support to @${selectedComment.user.username}` : 'Send Pi support to this commenter'}
        defaultAmount={1}
        entityType="comment"
        onClose={() => setIsTipOpen(false)}
        onConfirm={async (amount) => {
          if (!selectedComment) {
            throw new Error('No comment selected')
          }
          return tipEntity({
            entityType: 'comment',
            entityId: selectedComment.id,
            amount,
            notes: `Tip for comment ${selectedComment.id}`
          })
        }}
        onSuccess={() => setIsTipOpen(false)}
      />
    </motion.div>
  )
}

export default CommentDrawer