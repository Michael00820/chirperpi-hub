import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import GroupCard from '../components/group/GroupCard'
import { discoverGroups, getPopularGroups } from '../services/groupService'
import { Group } from 'shared/auth'

const categories = [
  'general',
  'tech',
  'business',
  'entertainment',
  'education',
  'health',
  'sports',
  'other'
]

const GroupDiscoveryPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState<string>('general')
  const [groups, setGroups] = useState<Group[]>([])
  const [popularGroups, setPopularGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPopularLoading, setIsPopularLoading] = useState(false)

  const loadGroups = async () => {
    setIsLoading(true)
    try {
      const result = await discoverGroups(searchTerm, category, 'popular', 1, 12)
      setGroups(result.groups)
    } catch (error) {
      console.error('Failed to load groups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPopular = async () => {
    setIsPopularLoading(true)
    try {
      const groups = await getPopularGroups(undefined, 6)
      setPopularGroups(groups)
    } catch (error) {
      console.error('Failed to load popular groups:', error)
    } finally {
      setIsPopularLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
    loadPopular()
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadGroups, 250)
    return () => clearTimeout(timer)
  }, [searchTerm, category])

  const categoryLabel = useMemo(() => category.charAt(0).toUpperCase() + category.slice(1), [category])

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Discover Groups</h1>
          <p className="text-gray-500 mt-2">Find the best Pi communities, private circles, and verified groups.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            type="search"
            placeholder="Search groups..."
            className="w-full border border-gray-200 rounded-full pl-12 pr-4 py-3 focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Popular Groups</h2>
            <p className="text-sm text-gray-500">Explore the most active communities on PiConnect.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-blue-600">
            <Sparkles className="w-4 h-4" /> Trending
          </span>
        </div>

        {isPopularLoading ? (
          <div className="text-center py-12 text-gray-500">Loading popular groups...</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {popularGroups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{categoryLabel} Groups</h2>
            <p className="text-sm text-gray-500">Browse the newest and most active communities in this category.</p>
          </div>
          <span className="text-sm text-gray-500">{groups.length} groups</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Searching groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No groups found matching that search.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default GroupDiscoveryPage