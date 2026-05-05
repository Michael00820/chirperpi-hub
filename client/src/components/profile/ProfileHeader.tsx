import { useState } from 'react'
import { Edit, Shield, Wallet } from 'lucide-react'
import { Profile } from 'shared/auth'
import FollowButton from './FollowButton'
import LazyImage from '../ui/LazyImage'

interface ProfileHeaderProps {
  profile: Profile
  onEditClick: () => void
}

const ProfileHeader = ({ profile, onEditClick }: ProfileHeaderProps) => {
  const [coverPhotoLoaded, setCoverPhotoLoaded] = useState(false)

  const maskWalletAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
        {profile.coverPhoto && (
          <>
            <LazyImage
              src={profile.coverPhoto}
              alt="Cover"
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                coverPhotoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setCoverPhotoLoaded(true)}
            />
            {!coverPhotoLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
          </>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-12 relative">
          {/* Avatar */}
          <div className="relative mb-4 sm:mb-0">
            <div className="w-32 h-32 sm:w-24 sm:h-24 bg-white rounded-full p-1">
              {profile.avatarUrl ? (
                <LazyImage
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600">
                    {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {profile.verificationStatus === 'verified' && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {profile.isOwnProfile ? (
              <button
                onClick={onEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <FollowButton
                userId={profile.id}
                username={profile.username}
                isFollowing={profile.isFollowing || false}
              />
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{profile.displayName || profile.username}</h1>
            {profile.verificationStatus === 'verified' && (
              <Shield className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <p className="text-gray-600 mb-2">@{profile.username}</p>

          {profile.bio && (
            <p className="text-gray-900 mb-3">{profile.bio}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            {profile.location && (
              <div className="flex items-center gap-1">
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.piWalletAddress && (
              <div className="flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                <span className="font-mono">{maskWalletAddress(profile.piWalletAddress)}</span>
              </div>
            )}
          </div>

          {/* Social Links */}
          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <div className="flex gap-2 mb-3">
              {Object.entries(profile.socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader