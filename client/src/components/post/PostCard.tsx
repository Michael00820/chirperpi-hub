import { memo, useState } from 'react'
import { MessageCircle, Share2, Zap, Lock, MoreHorizontal, Pin } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { PostCard as PostCardType, ReactionCount } from 'shared/auth'
import LazyImage from '../ui/LazyImage'
import ReactionPicker from './ReactionPicker'
import CommentDrawer from './CommentDrawer'
import TransactionModal from '../transactions/TransactionModal'
import { tipEntity, unlockPostWithPi } from '../../services/transactionService'

interface PostCardProps {
  post: PostCardType
  onReact?: (reactionType: string) => Promise<void>
  onComment?: () => void
  onShare?: () => void
}

const PostCard = ({
  post,
  onReact,
  onComment,
  onShare
}: PostCardProps) => {
  const [showComments, setShowComments] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [isTipOpen, setIsTipOpen] = useState(false)
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [hasUnlocked, setHasUnlocked] = useState(!post.isPiLocked)

  const handleReact = async (reactionType: string) => {
    if (!onReact) return

    setIsReacting(true)
    try {
      await onReact(reactionType)
    } finally {
      setIsReacting(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Post link copied!')
      onShare?.()
    })
  }

  const handleTip = () => {
    setIsTipOpen(true)
  }

  const handleUnlock = () => {
    setIsUnlockOpen(true)
  }

  const handleConfirmTip = async (amount: number) => {
    const transaction = await tipEntity({
      entityType: post.isPiLocked ? 'donation' : 'post',
      entityId: post.id,
      amount,
      notes: `Tip for post ${post.id}`
    })
    return transaction
  }

  const handleConfirmUnlock = async () => {
    const transaction = await unlockPostWithPi(post.id)
    setHasUnlocked(true)
    return transaction
  }

  const reactionGroups = (post.reactions || []).reduce((acc, reaction) => {
    const existing = acc.find(r => r.type === reaction.type)
    if (existing) {
      existing.count += reaction.count
    } else {
      acc.push({ ...reaction })
    }
    return acc
  }, [] as ReactionCount[])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-sm p-4 mb-4 ${post.isPinned ? 'border-l-4 border-yellow-400' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3 flex-1">
          <LazyImage
            src={post.user.avatarUrl || '/default-avatar.png'}
            alt={post.user.username}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{post.user.displayName || post.user.username}</span>
              <span className="text-gray-600 text-sm">@{post.user.username}</span>
              {post.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.editedAt && <span>• edited</span>}
              <span className="opacity-50">• {post.privacy}</span>
            </div>
          </div>
        </div>

        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-900 text-sm leading-relaxed break-words">{post.content}</p>
      </div>

      {/* Media Gallery */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`mb-3 rounded-lg overflow-hidden ${
          post.mediaUrls.length === 1 ? 'grid-cols-1' :
          post.mediaUrls.length === 2 ? 'grid-cols-2' :
          'grid-cols-2'
        }`}>
          <div className="grid gap-1">
            {post.mediaUrls.map((url, index) => (
              <LazyImage
                key={index}
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-32 sm:h-48 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {/* Reaction Summary */}
      {reactionGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
          {reactionGroups.map(reaction => {
            const reactionEmojis: Record<string, string> = {
              like: '❤️',
              love: '💚',
              care: '🤝',
              celebrate: '🎉',
              support: '🙌',
              rocket: '🚀'
            }
            return (
              <div
                key={reaction.type}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs"
              >
                <span>{reactionEmojis[reaction.type]}</span>
                <span className="text-gray-600">{reaction.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-around text-gray-600">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded text-sm transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentsCount}</span>
        </button>

        <ReactionPicker
          onReact={handleReact}
          userReaction={post.userReaction}
          isLoading={isReacting}
        />

        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded text-sm transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <button
          onClick={handleTip}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-yellow-50 rounded text-sm text-yellow-600 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Tip with Pi
        </button>

        {post.isPiLocked && !hasUnlocked && (
          <button
            onClick={handleUnlock}
            className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-blue-50 rounded text-sm text-blue-600 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Unlock
          </button>
        )}
      </div>

      {post.donationGoal && post.donationGoal > 0 && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          <div className="flex items-center justify-between gap-4">
            <div>
              Donation goal: <span className="font-semibold">{post.donationGoal.toFixed(2)} Pi</span>
            </div>
            <div className="font-semibold">{post.donationReceived?.toFixed(2) || '0.00'} Pi</div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${post.donationProgress || 0}%` }}
            />
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={isTipOpen}
        title="Tip with Pi"
        description={`Send Pi support for this post.`}
        defaultAmount={post.postType === 'pi_payment' ? post.paymentAmount || 0 : 1}
        entityType={post.isPiLocked ? 'donation' : 'post'}
        onClose={() => setIsTipOpen(false)}
        onConfirm={handleConfirmTip}
        onSuccess={() => setIsTipOpen(false)}
      />

      <TransactionModal
        isOpen={isUnlockOpen}
        title="Unlock premium content"
        description={`Pay ${post.piUnlockAmount?.toFixed(2) || '0.00'} Pi to unlock this post.`}
        defaultAmount={post.piUnlockAmount || 0}
        entityType="post_unlock"
        onClose={() => setIsUnlockOpen(false)}
        onConfirm={async () => handleConfirmUnlock()}
        onSuccess={() => setIsUnlockOpen(false)}
      />

      {/* Comment Drawer */}
      {showComments && (
        <CommentDrawer
          postId={post.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </motion.div>
  )
}

export default memo(PostCard)