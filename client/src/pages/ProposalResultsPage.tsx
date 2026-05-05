import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PieChart, BarChart3, Trophy, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Proposal, VotingOption } from 'shared/auth'
import { getProposalById, getProposalResults } from '../../services/proposalService'

const ProposalResultsPage = () => {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!id) return

      try {
        setLoading(true)
        const [proposalData, resultsData] = await Promise.all([
          getProposalById(id),
          getProposalResults(id)
        ])

        setProposal(proposalData)
        setResults(resultsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposal results')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Proposal not found'}</div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const totalVotes = proposal.votingOptions.reduce((sum, option) => sum + option.voteCount, 0)
  const winningOption = results.winningOption
  const isPassed = proposal.status === 'passed'
  const isExecuted = proposal.status === 'executed'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Proposal Results</h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{proposal.title}</h2>
            <p className="text-gray-600 mb-4">{proposal.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Created by {proposal.creator.displayName || proposal.creator.username}</span>
              <span>•</span>
              <span>{totalVotes} total votes</span>
              <span>•</span>
              <span>{results.voterCount} unique voters</span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`mb-8 p-4 rounded-lg ${
          isExecuted
            ? 'bg-purple-50 border border-purple-200'
            : isPassed
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {isExecuted ? (
              <CheckCircle className="w-6 h-6 text-purple-600" />
            ) : isPassed ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {isExecuted ? 'Proposal Executed' : isPassed ? 'Proposal Passed' : 'Proposal Rejected'}
              </h3>
              <p className="text-sm text-gray-600">
                {winningOption ? `Winning option: ${winningOption.label}` : 'No winning option'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vote Distribution</h3>
            <div className="flex justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {proposal.votingOptions.map((option, index) => {
                    const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0
                    const cumulativePercentage = proposal.votingOptions
                      .slice(0, index)
                      .reduce((sum, opt) => sum + (totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0), 0)

                    const startAngle = (cumulativePercentage / 100) * 360
                    const endAngle = ((cumulativePercentage + percentage) / 100) * 360

                    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180)
                    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180)

                    const largeArcFlag = percentage > 50 ? 1 : 0

                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

                    return (
                      <path
                        key={option.id}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        fill={colors[index % colors.length]}
                        stroke="white"
                        strokeWidth="0.5"
                      />
                    )
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalVotes}</div>
                    <div className="text-sm text-gray-600">Total Votes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
            <div className="space-y-4">
              {proposal.votingOptions
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((option, index) => {
                  const percentage = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0
                  const isWinner = winningOption?.id === option.id

                  return (
                    <div key={option.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {index === 0 && isWinner && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="font-medium text-gray-900">{option.label}</span>
                          {isWinner && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{option.voteCount} votes</div>
                          <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div
                          className={`h-3 rounded-full ${isWinner ? 'bg-green-600' : 'bg-blue-600'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>

                      {option.description && (
                        <p className="text-xs text-gray-600">{option.description}</p>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{results.voterCount}</div>
                <div className="text-sm text-gray-600">Unique Voters</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{results.totalVoteWeight?.toFixed(2) || '0.00'}</div>
                <div className="text-sm text-gray-600">Total Vote Weight</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{proposal.votingDuration}h</div>
                <div className="text-sm text-gray-600">Voting Duration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quorum Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quorum Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Quorum Required</div>
              <div className="text-lg font-semibold text-gray-900">10% of eligible voters</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Quorum Reached</div>
              <div className={`text-lg font-semibold ${results.quorum?.reached ? 'text-green-600' : 'text-red-600'}`}>
                {results.quorum?.reached ? 'Yes' : 'No'} ({results.quorum?.percentage?.toFixed(1) || '0'}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProposalResultsPage