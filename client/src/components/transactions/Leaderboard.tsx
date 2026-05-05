import { HeartHandshake } from 'lucide-react'
import LazyImage from '../ui/LazyImage'
import { LeaderboardItem } from 'shared/auth'

interface LeaderboardProps {
  items: LeaderboardItem[]
}

const Leaderboard = ({ items }: LeaderboardProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <HeartHandshake className="h-5 w-5 text-rose-500" />
        Top Supporters
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No supporters yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.userId} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                  <LazyImage src={item.avatarUrl || '/default-avatar.png'} alt={item.username} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="font-semibold">{item.displayName || item.username}</div>
                  <div className="text-xs text-gray-500">@{item.username}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total tipped</div>
                <div className="text-lg font-semibold text-rose-600">{item.totalSupportGiven.toFixed(2)} Pi</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
