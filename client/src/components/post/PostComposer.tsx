import { useState, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Image, Video, Send, Loader, CheckCircle, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { CreatePostRequest } from 'shared/auth'
import { searchUsers } from '../services/api'
import { uploadToIPFS } from '../services/ipfs'
import { createPost } from '../services/postsService'

const postSchema = z.object({
  content: z.string().min(1, 'Post content required').max(2000, 'Post too long'),
  postType: z.enum(['text', 'image', 'video', 'poll', 'pi_payment']),
  privacy: z.enum(['public', 'followers', 'pi_community', 'private']),
  pollOptions: z.array(z.string()).optional(),
  paymentAmount: z.number().optional(),
  isPiLocked: z.boolean().optional(),
  piUnlockAmount: z.number().optional(),
  donationGoal: z.number().optional()
})

type PostFormData = z.infer<typeof postSchema>

interface PostComposerProps {
  onPostCreated?: () => void
  groupId?: string
}

const PostComposer = ({ onPostCreated, groupId }: PostComposerProps) => {
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [mentions, setMentions] = useState<string[]>([])
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [selectedPollOption, setSelectedPollOption] = useState(0)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: '',
      postType: 'text',
      privacy: 'public',
      pollOptions: ['', ''],
      isPiLocked: false,
      piUnlockAmount: undefined,
      donationGoal: undefined
    }
  })

  const content = watch('content')
  const postType = watch('postType')
  const privacy = watch('privacy')
  const isPiLocked = watch('isPiLocked')
  const piUnlockAmount = watch('piUnlockAmount')
  const donationGoal = watch('donationGoal')

  // Extract hashtags from content
  useMemo(() => {
    const tags = content.match(/#\w+/g) || []
    setHashtags(tags.map(tag => tag.slice(1)))
  }, [content])

  // Search mentions
  const handleMentionSearch = async (query: string) => {
    if (query.length < 2) {
      setMentionSuggestions([])
      return
    }

    try {
      const results = await searchUsers(query.slice(1), 1, 5)
      setMentionSuggestions(results.users)
      setShowMentions(true)
    } catch (error) {
      console.error('Mention search failed:', error)
    }
  }

  // Monitor @ mentions in content
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const lastAtIndex = text.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1).split(/\s/)[0]
      if (afterAt.length > 0 && !afterAt.includes('@')) {
        handleMentionSearch('@' + afterAt)
      }
    }
  }

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setMediaFiles([...mediaFiles, ...files])
  }

  const handleMediaRemove = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index))
  }

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
    setValue('pollOptions', newOptions)
  }

  const addPollOption = () => {
    setPollOptions([...pollOptions, ''])
  }

  const onSubmit = async (data: PostFormData) => {
    try {
      setIsUploading(true)

      // Upload media files
      const mediaUrls: string[] = []
      for (let i = 0; i < mediaFiles.length; i++) {
        setUploadProgress(Math.round((i / mediaFiles.length) * 100))
        const url = await uploadToIPFS(mediaFiles[i])
        mediaUrls.push(url)
      }

      // Create post payload
      const postData: CreatePostRequest = {
        content: data.content,
        groupId: groupId,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        postType: data.postType,
        privacy: data.privacy,
        hashtags,
        mentions,
        pollOptions: postType === 'poll' ? pollOptions.filter(opt => opt.trim()) : undefined,
        paymentAmount: postType === 'pi_payment' ? data.paymentAmount : undefined,
        isPiLocked: data.isPiLocked,
        piUnlockAmount: data.isPiLocked ? data.piUnlockAmount : undefined,
        donationGoal: data.donationGoal
      }

      // Submit post via API
      await createPost(postData)

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setMediaFiles([])
        setPollOptions(['', ''])
        reset()
        onPostCreated?.()
      }, 2000)
    } catch (error) {
      console.error('Post creation failed:', error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: '🌍' },
    { value: 'followers', label: 'Followers', icon: '👥' },
    { value: 'pi_community', label: 'Pi Community', icon: '🍕' },
    { value: 'private', label: 'Private', icon: '🔒' }
  ]

  const postTypeOptions = [
    { value: 'text', label: 'Post', icon: '✏️' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'video', label: 'Video', icon: '🎥' },
    { value: 'poll', label: 'Poll', icon: '📊' },
    { value: 'pi_payment', label: 'Pi Payment', icon: '💰' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-6 mb-6"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Text Input */}
        <div className="mb-4">
          <textarea
            ref={textAreaRef}
            {...register('content')}
            onChange={handleContentChange}
            placeholder="What's on your mind?"
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
          <div className="flex justify-between mt-2">
            <div className="text-sm text-gray-600">
              {content.length}/2000 characters
            </div>
            {errors.content && (
              <span className="text-red-500 text-sm">{errors.content.message}</span>
            )}
          </div>

          {/* Hashtag Highlighting */}
          {hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {hashtags.map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Post Type</label>
          <div className="flex gap-2 flex-wrap">
            {postTypeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('postType', option.value as any)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  postType === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mediaFiles.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Media ${index}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleMediaRemove(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {isUploading && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Poll Options */}
        {postType === 'poll' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium mb-2">Poll Options</label>
            {pollOptions.map((option, index) => (
              <input
                key={index}
                type="text"
                value={option}
                onChange={(e) => handlePollOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="w-full p-2 mb-2 border border-gray-300 rounded text-sm"
              />
            ))}
            <button
              type="button"
              onClick={addPollOption}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add option
            </button>
          </div>
        )}

        {/* Payment Amount */}
        {postType === 'pi_payment' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Pi Amount</label>
            <input
              type="number"
              placeholder="0.0"
              step={0.01}
              min={0}
              onChange={(e) => setValue('paymentAmount', parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
            <input
              type="checkbox"
              {...register('isPiLocked')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Enable Pi-gated premium content</span>
          </label>

          {isPiLocked && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Unlock amount (Pi)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('piUnlockAmount', { valueAsNumber: true })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter unlock price"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">Donation goal (Pi)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('donationGoal', { valueAsNumber: true })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Optional community fund goal"
            />
          </div>
        </div>

        {/* Privacy & Media Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Privacy:</label>
            <select
              {...register('privacy')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {privacyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            <Image className="w-5 h-5" />
            Image
          </button>

          <button
            type="button"
            onClick={() => {
              const input = fileInputRef.current
              if (input) input.accept = 'video/*'
              fileInputRef.current?.click()
            }}
            className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            <Video className="w-5 h-5" />
            Video
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleMediaSelect}
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isSubmitting || isUploading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            showSuccess
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {showSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Posted!
            </>
          ) : isUploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Post
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  )
}

export default PostComposer