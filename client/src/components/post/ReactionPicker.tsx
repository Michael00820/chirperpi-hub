import { useState } from 'react'
import { Heart, Smile, Loader } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReactionPickerProps {
  onReact: (reactionType: string) => Promise<void>
  userReaction?: string
  isLoading?: boolean
}

const ReactionPicker = ({ onReact, userReaction, isLoading }: ReactionPickerProps) => {
  const [showPicker, setShowPicker] = useState(false)

  const reactions = [
    { type: 'like', emoji: '❤️', label: 'Like' },
    { type: 'love', emoji: '💚', label: 'Love' },
    { type: 'care', emoji: '🤝', label: 'Care' },
    { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
    { type: 'support', emoji: '🙌', label: 'Support' },
    { type: 'rocket', emoji: '🚀', label: 'Rocket' }
  ]

  const handleReact = async (type: string) => {
    await onReact(type)
    setShowPicker(false)
  }

  const currentReaction = reactions.find(r => r.type === userReaction)

  return (
    <div className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-1 px-3 py-2 rounded-full transition-all ${
          userReaction
            ? 'bg-red-100 text-red-600'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : currentReaction ? (
          <>
            <span>{currentReaction.emoji}</span>
            <span className="text-xs">{currentReaction.label}</span>
          </>
        ) : (
          <>
            <Heart className="w-4 h-4" />
            <span className="text-xs">React</span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-lg p-3 flex gap-2 z-50"
          >
            {reactions.map(reaction => (
              <motion.button
                key={reaction.type}
                whileHover={{ scale: 1.2, y: -5 }}
                onClick={() => handleReact(reaction.type)}
                className={`text-2xl cursor-pointer transition-all ${
                  userReaction === reaction.type ? 'ring-2 ring-blue-400 rounded-full' : ''
                }`}
                title={reaction.label}
              >
                {reaction.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ReactionPicker