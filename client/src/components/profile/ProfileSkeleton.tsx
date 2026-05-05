const ProfileSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Cover Photo Skeleton */}
      <div className="h-48 bg-gray-300"></div>

      {/* Profile Header Skeleton */}
      <div className="px-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-12">
          {/* Avatar Skeleton */}
          <div className="w-32 h-32 sm:w-24 sm:h-24 bg-white rounded-full p-1 mb-4 sm:mb-0">
            <div className="w-full h-full rounded-full bg-gray-300"></div>
          </div>

          {/* Button Skeleton */}
          <div className="w-32 h-10 bg-gray-300 rounded-lg"></div>
        </div>

        {/* Profile Details Skeleton */}
        <div className="mt-4 space-y-3">
          <div className="h-6 bg-gray-300 rounded w-48"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="h-4 bg-gray-300 rounded w-64"></div>
          <div className="flex gap-4">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="border-b border-gray-200">
        <div className="flex justify-around py-4">
          <div className="text-center">
            <div className="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Posts Skeleton */}
      <div className="divide-y divide-gray-200">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-full"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="flex gap-4">
                <div className="h-4 bg-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfileSkeleton