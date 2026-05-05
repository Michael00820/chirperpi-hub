import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowRight, Sparkles, TrendingUp, Users, Globe, Newspaper } from 'lucide-react'
import { Link } from 'react-router-dom'
import PostCard from '../components/post/PostCard'
import GroupCard from '../components/group/GroupCard'
import LazyImage from '../components/ui/LazyImage'
import { getExploreSummary, searchGroups, searchPosts, searchUsers, searchTopics } from '../services/exploreService'
import { ExploreSummary, Group, PostCard as PostCardType, SearchResult } from 'shared/auth'

const ExplorePage = () => {
  const [summary, setSummary] = useState<ExploreSummary | null>(null)
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [searchMode, setSearchMode] = useState<'users' | 'posts' | 'groups' | 'topics'>('posts')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeTopic, setActiveTopic] = useState<string>('')

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await getExploreSummary()
        setSummary(data)
      } catch (error) {
        console.error('Failed to load explore summary:', error)
      }
    }

    loadSummary()
    setRecentSearches(JSON.parse(localStorage.getItem('recentExploreSearches') || '[]'))
  }, [])

  const saveSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim()
    if (!trimmed) return

    const next = [trimmed, ...recentSearches.filter(item => item !== trimmed)].slice(0, 8)
    setRecentSearches(next)
    localStorage.setItem('recentExploreSearches', JSON.stringify(next))
  }

  const runSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSearchLoading(true)
    saveSearch(trimmed)
    try {
      let result: any = { users: [], posts: [], groups: [] }
      if (searchMode === 'users') {
        result = await searchUsers(trimmed, 1, 12)
        setSearchResults(result.users)
      } else if (searchMode === 'posts') {
        result = await searchPosts(trimmed, 1, 12)
        setSearchResults(result.posts)
      } else if (searchMode === 'groups') {
        result = await searchGroups(trimmed, undefined, 'popular', 1, 12)
        setSearchResults(result.groups)
      } else if (searchMode === 'topics') {
        setActiveTopic(trimmed.replace(/^#/, ''))
        const topicsResult = await searchTopics(trimmed.replace(/^#/, ''), 1, 12)
        setSearchResults(topicsResult.posts)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const topicChips = useMemo(() => summary?.trendingTopics || [], [summary])

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="mb-10 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Explore PiConnect</h1>
                <p className="text-gray-500 mt-2">Discover trending topics, verified users, popular posts, active groups, and curated Pi Network news.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['users', 'posts', 'groups', 'topics'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSearchMode(mode)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${searchMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {mode === 'users' ? 'Users' : mode === 'posts' ? 'Posts' : mode === 'groups' ? 'Groups' : 'Topics'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                type="search"
                placeholder={`Search ${searchMode}...`}
                className="w-full border border-gray-200 rounded-full pl-12 pr-32 py-4 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={runSearch}
                className="absolute right-2 top-2 h-12 rounded-full bg-blue-600 px-6 text-white shadow-sm hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {recentSearches.map(search => (
                <button
                  key={search}
                  onClick={() => { setQuery(search); runSearch() }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Trending Topics</h2>
                  <p className="text-sm text-gray-500">Hashtags expanding fastest across Pi posts.</p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="grid gap-3">
                {topicChips.length === 0
                  ? <div className="text-gray-500">Loading topics...</div>
                  : topicChips.map(topic => (
                    <button
                      key={topic.tag}
                      onClick={async () => {
                        setQuery(`#${topic.tag}`)
                        setSearchMode('topics')
                        setActiveTopic(topic.tag)
                        const topicsResult = await searchTopics(topic.tag, 1, 12)
                        setSearchResults(topicsResult.posts)
                      }}
                      className="text-left rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-slate-900">#{topic.tag}</span>
                        <span className="text-xs text-gray-500">{topic.count} mentions</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{topic.example}</p>
                    </button>
                  ))}
              </div>
            </section>

            <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Pi Network News</h2>
                  <p className="text-sm text-gray-500">Curated updates and community announcements.</p>
                </div>
                <Newspaper className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-4">
                {summary?.newsItems.map(item => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-gray-200 p-4 hover:border-blue-300">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.summary}</p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(item.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-3 text-xs text-blue-600">{item.source} <ArrowRight className="inline-block w-3 h-3" /></div>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Suggested Users to Follow</h2>
                <p className="text-sm text-gray-500">Verified Pi users with similar interests.</p>
              </div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              {summary?.suggestedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <LazyImage src={user.avatarUrl || '/default-avatar.png'} alt={user.username} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-semibold text-slate-900">{user.displayName || user.username}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <Link to={`/profile/${user.username}`} className="rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100">View</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Active Groups</h2>
                <p className="text-sm text-gray-500">Join buzzing Pi communities.</p>
              </div>
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              {summary?.activeGroups.slice(0, 4).map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Community Services</h2>
                <p className="text-sm text-gray-500">Featured Pi support and utility listings.</p>
              </div>
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-3">
              {summary?.communityServices.map(service => (
                <Link key={service.id} to={service.url} className="block rounded-2xl border border-gray-200 p-4 hover:border-blue-300">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{service.title}</h3>
                      <p className="text-sm text-gray-500">{service.description}</p>
                    </div>
                    <span className="text-xs text-blue-600">{service.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Popular Posts</h2>
            <p className="text-sm text-gray-500">High-engagement posts from the Pi community.</p>
          </div>
          <span className="text-sm text-gray-500">{summary?.popularPosts.length || 0} posts</span>
        </div>
        <div className="space-y-4">
          {summary?.popularPosts.map(post => (
            <PostCard key={post.id} post={post as PostCardType} />
          ))}
        </div>
      </section>

      <section className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Search Results</h2>
            <p className="text-sm text-gray-500">Search by users, posts, groups, or trending hashtags.</p>
          </div>
          {searchMode === 'topics' && activeTopic && (
            <span className="text-sm text-gray-500">Topic: #{activeTopic}</span>
          )}
        </div>

        {searchLoading ? (
          <div className="text-center py-10 text-gray-500">Searching...</div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No results yet. Use the search bar above to explore Pi.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {searchResults.map(item => {
              if (searchMode === 'users') {
                return (
                  <Link key={item.id} to={`/profile/${item.username}`} className="rounded-3xl border border-gray-200 p-4 hover:border-blue-300">
                    <div className="flex items-center gap-3">
                      <LazyImage src={item.avatarUrl || '/default-avatar.png'} alt={item.username} className="w-12 h-12 rounded-full" />
                      <div>
                        <p className="font-semibold text-slate-900">{item.displayName || item.username}</p>
                        <p className="text-sm text-gray-500">@{item.username}</p>
                      </div>
                    </div>
                  </Link>
                )
              }

              if (searchMode === 'groups') {
                return <GroupCard key={item.id} group={item as Group} />
              }

              return <PostCard key={item.id} post={item as PostCardType} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default ExplorePage
