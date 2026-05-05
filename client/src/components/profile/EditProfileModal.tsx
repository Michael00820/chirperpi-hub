import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Upload, Loader } from 'lucide-react'
import { Profile } from 'shared/auth'
import { uploadToIPFS } from '../../services/ipfs'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  onSave: () => void
}

const EditProfileModal = ({ isOpen, onClose, profile, onSave }: EditProfileModalProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [interestInput, setInterestInput] = useState('')
  const [socialPlatform, setSocialPlatform] = useState('')
  const [socialUrl, setSocialUrl] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      interests: profile.interests || [],
      socialLinks: profile.socialLinks || {},
    }
  })

  const interests = watch('interests') || []
  const socialLinks = watch('socialLinks') || {}

  const handleAvatarUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadToIPFS(file)
      // Update profile avatar URL
      console.log('Avatar uploaded:', url)
    } catch (error) {
      console.error('Avatar upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleCoverUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadToIPFS(file)
      // Update profile cover photo URL
      console.log('Cover uploaded:', url)
    } catch (error) {
      console.error('Cover upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setValue('interests', [...interests, interestInput.trim()])
      setInterestInput('')
    }
  }

  const removeInterest = (interest: string) => {
    setValue('interests', interests.filter(i => i !== interest))
  }

  const addSocialLink = () => {
    if (socialPlatform.trim() && socialUrl.trim()) {
      setValue('socialLinks', { ...socialLinks, [socialPlatform.trim()]: socialUrl.trim() })
      setSocialPlatform('')
      setSocialUrl('')
    }
  }

  const removeSocialLink = (platform: string) => {
    const newLinks = { ...socialLinks }
    delete newLinks[platform]
    setValue('socialLinks', newLinks)
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Handle avatar upload
      if (avatarFile) {
        await handleAvatarUpload(avatarFile)
      }

      // Handle cover upload
      if (coverFile) {
        await handleCoverUpload(coverFile)
      }

      // Update profile data
      console.log('Updating profile:', data)
      onSave()
      onClose()
    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Avatar Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-600">
                    {profile.displayName?.[0] || 'U'}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                Change Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Cover Photo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Cover Photo</label>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              Change Cover
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              {...register('displayName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your display name"
            />
            {errors.displayName && (
              <p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about yourself"
            />
            {errors.bio && (
              <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              {...register('location')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your location"
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              {...register('website')}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
            {errors.website && (
              <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
            )}
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium mb-2">Interests</label>
            <div className="flex gap-2 mb-2">
              <input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add an interest"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
              />
              <button
                type="button"
                onClick={addInterest}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium mb-2">Social Links</label>
            <div className="flex gap-2 mb-2">
              <input
                value={socialPlatform}
                onChange={(e) => setSocialPlatform(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Platform (e.g., Twitter)"
              />
              <input
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="URL"
              />
              <button
                type="button"
                onClick={addSocialLink}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(socialLinks).map(([platform, url]) => (
                <div key={platform} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{platform}:</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-2">
                      {url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocialLink(platform)}
                    className="text-red-500 hover:bg-red-100 p-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading && <Loader className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProfileModal