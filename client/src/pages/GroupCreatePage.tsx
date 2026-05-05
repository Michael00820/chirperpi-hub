import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UploadCloud, Lock, Globe } from 'lucide-react'
import { createGroup } from '../services/groupService'
import { uploadToIPFS } from '../services/ipfs'

const groupSchema = z.object({
  name: z.string().min(3, 'Group name is required'),
  description: z.string().max(500).optional(),
  privacy: z.enum(['public', 'private']),
  category: z.enum(['general', 'tech', 'business', 'entertainment', 'education', 'health', 'sports', 'other']),
  minPiBalance: z.number().nonnegative().optional()
})

type GroupFormData = z.infer<typeof groupSchema>

const GroupCreatePage = () => {
  const navigate = useNavigate()
  const [coverPhoto, setCoverPhoto] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      privacy: 'public',
      category: 'general',
      minPiBalance: 0
    }
  })

  const handleCoverSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadProgress(0)
      const url = await uploadToIPFS(file, (progress) => setUploadProgress(progress))
      setCoverPhoto(url)
    } catch (error) {
      console.error('Cover upload failed:', error)
    }
  }

  const onSubmit = async (values: GroupFormData) => {
    setIsSubmitting(true)
    try {
      const group = await createGroup({
        name: values.name,
        description: values.description,
        privacy: values.privacy,
        category: values.category,
        coverPhoto,
        minPiBalance: values.minPiBalance
      })
      navigate(`/groups/${group.id}`)
    } catch (error) {
      console.error('Create group failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Create a Group</h1>
            <p className="text-sm text-gray-500">Launch a Pi community, private circle, or public forum.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Group Name</label>
            <input
              {...register('name')}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none"
              placeholder="Pi Creators Club"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none"
              placeholder="A place to share project updates, collaboration threads, and Pi growth tips."
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Privacy</label>
              <select
                {...register('privacy')}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('category')}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none"
              >
                <option value="general">General</option>
                <option value="tech">Tech</option>
                <option value="business">Business</option>
                <option value="entertainment">Entertainment</option>
                <option value="education">Education</option>
                <option value="health">Health</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Cover Photo</label>
              <label className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 cursor-pointer hover:border-blue-400">
                <UploadCloud className="w-5 h-5" />
                <span>{coverPhoto ? 'Change cover photo' : 'Upload cover photo'}</span>
                <input type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
              </label>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2 text-sm text-gray-500">Uploading {uploadProgress}%</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Minimum Pi Balance</label>
              <input
                {...register('minPiBalance', { valueAsNumber: true })}
                type="number"
                min={0}
                step={0.01}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none"
                placeholder="Optional"
              />
              {errors.minPiBalance && <p className="text-sm text-red-500 mt-1">{errors.minPiBalance.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating group...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default GroupCreatePage