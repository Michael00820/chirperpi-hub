import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Clock, CheckCircle, XCircle, Play, AlertCircle, Users, PieChart, ExternalLink } from 'lucide-react'
import { Proposal } from 'shared/auth'
import { useNavigate } from 'react-router-dom'

interface ProposalCardProps {
  proposal: Proposal
}

const ProposalCard = ({ proposal }: ProposalCardProps) => {
  const navigate = useNavigate()
  const [showFullDescription, setShowFullDescription] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'executed':
        return <Play className="w-5 h-5 text-purple-600" />
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'passed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'executed':
        return 'bg-purple-100 text-purple-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'governance':
        return 'bg-blue-50 text-blue-700'
      case 'treasury':
        return 'bg-green-50 text-green-700'
      case 'technical':
        return 'bg-purple-50 text-purple-700'
      case 'community':
        return 'bg-orange-50 text-orange-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  const isActive = proposal.status === 'active'
  const timeLeft = isActive
    ? formatDistanceToNow(new Date(proposal.endTime), { addSuffix: true })
    : null

  const truncatedDescription = proposal.description.length > 200
    ? proposal.description.substring(0, 200) + '...'
    : proposal.description

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
              {getStatusIcon(proposal.status)}
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(proposal.category)}`}>
              {proposal.category.charAt(0).toUpperCase() + proposal.category.slice(1)}
            </span>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {proposal.title}
          </h3>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span>by {proposal.creator.displayName || proposal.creator.username}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true })}</span>
            {isActive && timeLeft && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">Ends {timeLeft}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed">
          {showFullDescription ? proposal.description : truncatedDescription}
        </p>
        {proposal.description.length > 200 && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-blue-600 hover:text-blue-700 text-sm mt-2"
          >
            {showFullDescription ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Voting Options Summary */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <PieChart className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Voting Options</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {proposal.votingOptions.slice(0, 4).map((option) => (
            <div key={option.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-900">{option.label}</span>
              <span className="text-sm text-gray-600">{option.voteCount} votes</span>
            </div>
          ))}
          {proposal.votingOptions.length > 4 && (
            <div className="flex items-center justify-center bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600">+{proposal.votingOptions.length - 4} more</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{proposal.totalVotes} votes</span>
          </div>
          <div>
            Min Pi: {proposal.minPiBalance.toFixed(2)}
          </div>
        </div>
        <div>
          Duration: {proposal.votingDuration}h
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/proposals/${proposal.id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  )
}

export default ProposalCard