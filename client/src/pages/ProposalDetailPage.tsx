import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Users, PieChart, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Proposal } from 'shared/auth'
import { getProposalById } from '../../services/proposalService'
import VotingInterface from '../components/governance/VotingInterface'

const ProposalDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProposal = async () => {
      if (!id) return

      try {
        setLoading(true)
        const proposalData = await getProposalById(id)
        setProposal(proposalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposal')
      } finally {
        setLoading(false)
      }
    }

    loadProposal()
  }, [id])

  const handleVoteCast = () => {
    // Refresh proposal data after voting
    if (id) {
      getProposalById(id).then(setProposal).catch(console.error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Proposal not found'}</div>
          <button
            onClick={() => navigate('/proposals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    )
  }

  const isActive = proposal.status === 'active'
  const totalVotes = proposal.votingOptions.reduce((sum, option) => sum + option.voteCount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/proposals')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Proposals
          </button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{proposal.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span>by {proposal.creator.displayName || proposal.creator.username}</span>
                  <span>•</span>
                  <span>Category: {proposal.category.charAt(0).toUpperCase() + proposal.category.slice(1)}</span>
                  <span>•</span>
                  <span>Min Pi: {proposal.minPiBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-blue-100 text-blue-800'
                    : proposal.status === 'passed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isActive ? <Clock className="w-4 h-4" /> : null}
                  {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                </div>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed text-lg mb-6">{proposal.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalVotes}</div>
                <div className="text-sm text-gray-600">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{proposal.votes.length}</div>
                <div className="text-sm text-gray-600">Unique Voters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{proposal.votingDuration}h</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
              <div className="text-center">
                <button
                  onClick={() => navigate(`/proposals/${proposal.id}/results`)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <PieChart className="w-4 h-4" />
                  View Results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Options Preview */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting Options</h2>
          <div className="grid gap-4">
            {proposal.votingOptions.map((option) => (
              <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{option.label}</h3>
                  <div className="text-sm text-gray-600">
                    {option.voteCount} votes ({totalVotes > 0 ? ((option.voteCount / totalVotes) * 100).toFixed(1) : 0}%)
                  </div>
                </div>
                {option.description && (
                  <p className="text-gray-600 text-sm">{option.description}</p>
                )}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voting Interface */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <VotingInterface proposal={proposal} onVoteCast={handleVoteCast} />
          </motion.div>
        )}

        {/* Recent Votes */}
        {proposal.votes.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Votes</h2>
            <div className="space-y-3">
              {proposal.votes.slice(0, 10).map((vote) => (
                <div key={vote.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={vote.voter.avatarUrl || '/default-avatar.png'}
                      alt={vote.voter.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {vote.voter.displayName || vote.voter.username}
                      </div>
                      <div className="text-sm text-gray-600">
                        Voted for: {proposal.votingOptions.find(opt => opt.id === vote.optionId)?.label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{vote.voteWeight.toFixed(2)} Pi</div>
                    <div className="text-xs text-gray-600">Vote weight</div>
                  </div>
                </div>
              ))}
              {proposal.votes.length > 10 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => navigate(`/proposals/${proposal.id}/results`)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    View all {proposal.votes.length} votes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProposalDetailPage