import { Profile } from 'shared/auth'

interface ProfileStatsProps {
  profile: Profile
}

const ProfileStats = ({ profile }: ProfileStatsProps) => {
  return (
    <div className="border-b border-gray-200">
      <div className="flex justify-around py-4">
        <div className="text-center">
          <div className="font-bold text-lg">{profile.postsCount || 0}</div>
          <div className="text-gray-600 text-sm">Posts</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-lg">{profile.followersCount}</div>
          <div className="text-gray-600 text-sm">Followers</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-lg">{profile.followingCount}</div>
          <div className="text-gray-600 text-sm">Following</div>
        </div>
      </div>
    </div>
  )
}

export default ProfileStats