import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { User, MapPin, Link as LinkIcon, Heart, MessageCircle, Share } from 'lucide-react'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfileStats from '../components/profile/ProfileStats'
import ProfilePosts from '../components/profile/ProfilePosts'
import EditProfileModal from '../components/profile/EditProfileModal'
import ProfileSkeleton from '../components/profile/ProfileSkeleton'
import { useProfile } from '../hooks/useProfile'

const ProfilePage = () => {
  const { username } = useParams<{ username: string }>()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { profile, posts, loading, error, refetch } = useProfile(username!)

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error loading profile</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Profile not found</h2>
          <p className="text-gray-600">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileHeader
        profile={profile}
        onEditClick={() => setIsEditModalOpen(true)}
      />
      <ProfileStats profile={profile} />
      <ProfilePosts posts={posts} />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={refetch}
      />
    </div>
  )
}

export default ProfilePage