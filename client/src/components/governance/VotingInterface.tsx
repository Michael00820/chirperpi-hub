import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Vote, CheckCircle, Clock, Users, PieChart, Zap } from 'lucide-react'
import { Proposal, VotingOption } from 'shared/auth'
import { castVote } from '../../services/proposalService'
import { requestPiSignature } from '../../utils/piSdk'

interface VotingInterfaceProps {
  proposal: Proposal
  onVoteCast?: () => void
}

const VotingInterface = ({ proposal, onVoteCast }: VotingInterfaceProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<VotingOption | null>(null)

  useEffect(() => {
    // Check if user has already voted
    const currentUserId = localStorage.getItem('userId')
    if (currentUserId) {
      const existingVote = proposal.votes.find(vote => vote.voterId === currentUserId)
      if (existingVote) {
        setHasVoted(true)
        setUserVote(proposal.votingOptions.find(opt => opt.id === existingVote.optionId) || null)
      }
    }
  }, [proposal])

  const handleVote = async () => {
    if (!selectedOption || isVoting) return

    setIsVoting(true)
    setError(null)

    try {
      // Create the message to sign
      const message = `Vote on proposal "${proposal.title}" for option "${proposal.votingOptions.find(opt => opt.id === selectedOption)?.label}"`

      // Request Pi signature
      const signature = await requestPiSignature(message)

      // Cast the vote
      await castVote(proposal.id, {
        optionId: selectedOption,
        signature
      })

      setHasVoted(true)
      setUserVote(proposal.votingOptions.find(opt => opt.id === selectedOption) || null)
      onVoteCast?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote')
    } finally {
      setIsVoting(false)
    }
  }

  const isActive = proposal.status === 'active'
  const canVote = isActive && !hasVoted
  const totalVotes = proposal.votingOptions.reduce((sum, option) => sum + option.voteCount, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Vote className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Cast Your Vote</h3>
      </div>

      {/* Voting Status */}
      <div className="mb-6">
        {hasVoted ? (
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">You voted for: {userVote?.label}</span>
          </div>
        ) : isActive ? (
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Voting is active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Voting has ended</span>
          </div>
        )}
      </div>

      {/* Voting Requirements */}
      {canVote && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Voting Requirements</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Minimum Pi balance: {proposal.minPiBalance.toFixed(2)} Pi</li>
            <li>• Vote weight based on your Pi balance</li>
            <li>• Pi wallet signature required (no gas fees)</li>
          </ul>
        </div>
      )}

      {/* Voting Options */}
      <div className="space-y-3 mb-6">
        {proposal.votingOptions.map((option) => {
          const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0
          const isSelected = selectedOption === option.id
          const isUserVote = userVote?.id === option.id

          return (
            <motion.div
              key={option.id}
              className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isUserVote
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => canVote && setSelectedOption(option.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : isUserVote
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {(isSelected || isUserVote) && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{option.label}</span>
                  {isUserVote && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Your vote
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{option.voteCount} votes</div>
                  <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                </div>
              </div>

              {option.description && (
                <p className="text-sm text-gray-600 ml-7">{option.description}</p>
              )}

              {/* Progress Bar */}
              <div className="mt-3 ml-7">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Vote Statistics */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Voting Statistics</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Votes:</span>
            <span className="font-medium ml-2">{totalVotes}</span>
          </div>
          <div>
            <span className="text-gray-600">Unique Voters:</span>
            <span className="font-medium ml-2">{proposal.votes.length}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Vote Button */}
      {canVote && (
        <button
          onClick={handleVote}
          disabled={!selectedOption || isVoting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isVoting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Casting Vote...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Cast Vote with Pi</span>
            </>
          )}
        </button>
      )}

      {!canVote && !hasVoted && (
        <div className="text-center text-gray-600 py-4">
          {isActive ? 'You do not meet the voting requirements' : 'Voting has ended'}
        </div>
      )}
    </div>
  )
}

export default VotingInterface