import api from './api'
import {
  CreateGroupRequest,
  Group,
  GroupSearchResult,
  GroupMember,
  GroupFeed,
  GroupInvite
} from 'shared/auth'

export const createGroup = async (data: CreateGroupRequest): Promise<Group> => {
  const response = await api.post('/groups', data)
  return response.data
}

export const getGroup = async (groupId: string): Promise<Group> => {
  const response = await api.get(`/groups/${groupId}`)
  return response.data
}

export const updateGroup = async (groupId: string, data: Partial<CreateGroupRequest>): Promise<Group> => {
  const response = await api.put(`/groups/${groupId}`, data)
  return response.data
}

export const deleteGroup = async (groupId: string): Promise<void> => {
  await api.delete(`/groups/${groupId}`)
}

export const discoverGroups = async (
  query = '',
  category?: string,
  sort: 'recent' | 'popular' = 'recent',
  page = 1,
  limit = 20
): Promise<GroupSearchResult> => {
  const response = await api.get('/groups/discover', {
    params: { q: query, category, sort, page, limit }
  })
  return response.data
}

export const getPopularGroups = async (category?: string, limit = 10): Promise<Group[]> => {
  const response = await api.get('/groups/popular', {
    params: { category, limit }
  })
  return response.data.groups
}

export const joinGroup = async (groupId: string, inviteCode?: string): Promise<Group> => {
  const response = await api.post(`/groups/${groupId}/join`, { inviteCode })
  return response.data
}

export const leaveGroup = async (groupId: string): Promise<void> => {
  await api.post(`/groups/${groupId}/leave`)
}

export const getGroupMembers = async (groupId: string, page = 1, limit = 20): Promise<GroupMember[]> => {
  const response = await api.get(`/groups/${groupId}/members`, {
    params: { page, limit }
  })
  return response.data.members
}

export const getGroupFeed = async (groupId: string, cursor?: string, limit = 20): Promise<GroupFeed> => {
  const response = await api.get(`/groups/${groupId}/feed`, {
    params: { cursor, limit }
  })
  return response.data
}

export const createGroupInvite = async (groupId: string): Promise<GroupInvite> => {
  const response = await api.post(`/groups/${groupId}/invite`)
  return response.data
}

export const joinByInviteCode = async (inviteCode: string): Promise<Group> => {
  const response = await api.post(`/groups/join-invite/${inviteCode}`)
  return response.data
}

export const changeGroupMemberRole = async (
  groupId: string,
  memberId: string,
  role: 'admin' | 'moderator' | 'member'
): Promise<GroupMember> => {
  const response = await api.post(`/groups/${groupId}/members/${memberId}/role`, { role })
  return response.data
}

export default api