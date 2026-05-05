import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Group } from 'shared/auth'
import { ShieldCheck, Users, Sparkles } from 'lucide-react'
import LazyImage from '../ui/LazyImage'

interface GroupCardProps {
  group: Group
  actionLabel?: string
  onAction?: () => void
}

const GroupCard = ({ group, actionLabel, onAction }: GroupCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      <div className="h-28 bg-slate-100 overflow-hidden">
        {group.coverPhoto ? (
          <LazyImage src={group.coverPhoto} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">Group cover</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">{group.name}</h3>
            <p className="text-xs text-gray-500 uppercase tracking-[0.12em] mt-1">{group.category}</p>
          </div>
          <div className="text-xs text-white px-2 py-1 rounded-full bg-blue-500">
            {group.privacy === 'private' ? 'Private' : 'Public'}
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{group.description || 'A space for the Pi community to connect.'}</p>
        <div className="flex items-center justify-between gap-4 text-sm text-gray-500">
          <div className="inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            {group.memberCount} members
          </div>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {group.creator?.username}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            to={`/groups/${group.id}`}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View group
          </Link>
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(GroupCard)