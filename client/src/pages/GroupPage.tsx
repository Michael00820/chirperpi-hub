import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader, UserPlus, Shield, Link2 } from 'lucide-react'
import { getGroup, getGroupFeed, getGroupMembers, joinGroup, leaveGroup, createGroupInvite, changeGroupMemberRole } from '../services/groupService'
import { Group, GroupMember, PostCard as PostCardType } from 'shared/auth'
import PostCard from '../components/post/PostCard'
import PostComposer from '../components/post/PostComposer'

const GroupPage = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [feed, setFeed] = useState<PostCardType[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isMemberAction, setIsMemberAction] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadGroup = async () => {
    if (!groupId) return
    setIsLoading(true)
    try {
      const data = await getGroup(groupId)
      setGroup(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!groupId) return
    try {
      const data = await getGroupMembers(groupId, 1, 8)
      setMembers(data)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const loadFeed = async (cursor?: string) => {
    if (!groupId || !hasMore) return
    try {
      const data = await getGroupFeed(groupId, cursor, 10)
      setFeed(prev => (cursor ? [...prev, ...data.posts] : data.posts))
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Failed to load group feed:', err)
    }
  }

  useEffect(() => {
    loadGroup()
    loadMembers()
  }, [groupId])

  useEffect(() => {
    if (group) {
      loadFeed()
    }
  }, [group])

  const handleJoin = async () => {
    if (!groupId) return
    setIsMemberAction(true)
    try {
      const updated = await joinGroup(groupId)
      setGroup(updated)
      await loadMembers()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsMemberAction(false)
    }
  }

  const handleLeave = async () => {
    if (!groupId) return
    setIsMemberAction(true)
    try {
      await leaveGroup(groupId)
      setGroup(prev => prev ? { ...prev, isMember: false, memberCount: Math.max(prev.memberCount - 1, 0) } : prev)
      await loadMembers()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsMemberAction(false)
    }
  }

  const handleInvite = async () => {
    if (!groupId) return
    try {
      const invite = await createGroupInvite(groupId)
      const link = `${window.location.origin}/groups/join/${invite.inviteCode}`
      setInviteLink(link)
      navigator.clipboard.writeText(link)
      alert('Invite link copied to clipboard')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleRoleChange = async (memberId: string, role: 'admin' | 'moderator' | 'member') => {
    if (!groupId) return
    try {
      await changeGroupMemberRole(groupId, memberId, role)
      loadMembers()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleNewPost = async () => {
    setFeed([])
    setHasMore(true)
    setNextCursor(undefined)
    loadFeed()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
          <p className="text-lg text-red-600">Unable to find this group.</p>
          <button onClick={() => navigate('/groups/discover')} className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-white">
            Browse groups
          </button>
        </div>
      </div>
    )
  }

  const canPost = group.isMember
  const isAdmin = group.isAdmin

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="rounded-3xl overflow-hidden shadow-sm bg-white">
        <div className="h-64 bg-slate-100 relative">
          {group.coverPhoto ? (
            <img src={group.coverPhoto} alt={group.name} className="w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent opacity-70" />
          <div className="absolute bottom-6 left-6 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-blue-200">{group.category}</p>
            <h1 className="text-4xl font-semibold">{group.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">{group.description || 'A community for Pi enthusiasts.'}</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-blue-600/10 px-3 py-1">{group.privacy === 'private' ? 'Private Group' : 'Public Group'}</span>
                  {group.minPiBalance ? <span className="rounded-full bg-yellow-100 text-yellow-800 px-3 py-1">Pi-gated: {group.minPiBalance}+ π</span> : null}
                </div>
                <div className="text-sm text-gray-600">{group.memberCount} members • created by {group.creator?.displayName || group.creator?.username}</div>
              </div>
              <div className="flex items-center gap-3">
                {group.isMember ? (
                  <button
                    onClick={handleLeave}
                    disabled={isMemberAction}
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {isMemberAction ? 'Leaving...' : 'Leave Group'}
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={isMemberAction}
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    {isMemberAction ? 'Joining...' : 'Join Group'}
                  </button>
                )}
              </div>
            </div>

            {canPost ? (
              <PostComposer onPostCreated={handleNewPost} groupId={group.id} />
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 bg-slate-50 text-sm text-gray-600">
                {group.privacy === 'private'
                  ? 'Only approved members can contribute posts to this private group.'
                  : 'Join the group to share posts, media, and conversations in this community.'}
              </div>
            )}

            <div className="space-y-4">
              {feed.length === 0 ? (
                <div className="rounded-3xl border border-gray-200 p-8 text-center text-gray-500">No posts yet. Start the conversation.</div>
              ) : (
                feed.map(post => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
              {hasMore && (
                <button
                  onClick={() => loadFeed(nextCursor)}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white hover:bg-slate-800"
                >Load more posts</button>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-200 p-5 bg-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold mb-3">
                <UserPlus className="w-4 h-4" /> Members
              </div>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div>
                      <div className="font-semibold text-sm">{member.user.displayName || member.user.username}</div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                    {isAdmin && member.userId !== group.creatorId ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.userId, e.target.value as any)}
                        className="rounded-full border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {isAdmin ? (
              <div className="rounded-3xl border border-gray-200 p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
                  <Shield className="w-4 h-4" /> Admin tools
                </div>
                <button
                  onClick={handleInvite}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white hover:bg-blue-700"
                >
                  Generate invite link
                </button>
                {inviteLink ? (
                  <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 bg-slate-50">
                    <div className="font-medium text-gray-900">Invite link</div>
                    <p className="break-all mt-2 text-xs text-gray-600">{inviteLink}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="mt-3 rounded-full bg-blue-100 px-3 py-2 text-sm text-blue-700"
                    >
                      Copy link
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {inviteLink ? (
              <button
                onClick={() => {
                  if ('share' in navigator) {
                    ;(navigator as any).share({
                      title: `Join ${group.name}`,
                      text: `Join my PiConnect group ${group.name}`,
                      url: inviteLink
                    })
                  }
                }}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4" /> Share invite
              </button>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default GroupPage