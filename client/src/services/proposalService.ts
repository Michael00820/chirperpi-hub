import axios from 'axios'
import { CreateProposalRequest, Proposal, ProposalListResult, CastVoteRequest, Vote } from 'shared/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const createProposal = async (data: CreateProposalRequest): Promise<Proposal> => {
  const response = await api.post('/api/proposals', data)
  return response.data.proposal
}

export const getProposals = async (
  status?: string,
  category?: string,
  limit = 20,
  offset = 0
): Promise<ProposalListResult> => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (category) params.append('category', category)
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())

  const response = await api.get(`/api/proposals?${params}`)
  return response.data
}

export const getProposalById = async (id: string): Promise<Proposal> => {
  const response = await api.get(`/api/proposals/${id}`)
  return response.data.proposal
}

export const castVote = async (proposalId: string, data: CastVoteRequest): Promise<Vote> => {
  const response = await api.post(`/api/proposals/${proposalId}/vote`, data)
  return response.data.vote
}

export const getProposalResults = async (proposalId: string) => {
  const response = await api.get(`/api/proposals/${proposalId}/results`)
  return response.data
}

export const executeProposal = async (proposalId: string): Promise<void> => {
  await api.post(`/api/proposals/${proposalId}/execute`)
}

export const finalizeProposal = async (proposalId: string): Promise<void> => {
  await api.post(`/api/proposals/${proposalId}/finalize`)
}