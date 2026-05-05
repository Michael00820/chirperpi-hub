import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Filter, Plus, Clock, CheckCircle, XCircle, Play, AlertCircle } from 'lucide-react'
import { Proposal } from 'shared/auth'
import { getProposals } from '../services/proposalService'
import ProposalCard from '../components/governance/ProposalCard'
import ProposalCreationForm from '../components/governance/ProposalCreationForm'

const ProposalListingPage = () => {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const LIMIT = 20

  const loadProposals = async (reset = false) => {
    try {
      setLoading(true)
      const currentOffset = reset ? 0 : offset

      const result = await getProposals(
        statusFilter || undefined,
        categoryFilter || undefined,
        LIMIT,
        currentOffset
      )

      if (reset) {
        setProposals(result.proposals)
        setOffset(LIMIT)
      } else {
        setProposals(prev => [...prev, ...result.proposals])
        setOffset(prev => prev + LIMIT)
      }

      setHasMore(result.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProposals(true)
  }, [statusFilter, categoryFilter])

  const handleCreateSuccess = () => {
    loadProposals(true)
  }

  const statusOptions = [
    { value: '', label: 'All Status', icon: Filter },
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'passed', label: 'Passed', icon: CheckCircle },
    { value: 'rejected', label: 'Rejected', icon: XCircle },
    { value: 'executed', label: 'Executed', icon: Play },
    { value: 'cancelled', label: 'Cancelled', icon: AlertCircle }
  ]

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'governance', label: 'Governance' },
    { value: 'treasury', label: 'Treasury' },
    { value: 'technical', label: 'Technical' },
    { value: 'community', label: 'Community' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Governance Proposals</h1>
              <p className="text-gray-600 mt-2">
                Participate in community decision-making and shape the future of our platform
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Proposal
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Proposals List */}
        <div className="space-y-6">
          {proposals.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Filter className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals found</h3>
              <p className="text-gray-600">
                {statusFilter || categoryFilter
                  ? 'Try adjusting your filters or create the first proposal!'
                  : 'Be the first to create a governance proposal for our community.'
                }
              </p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProposalCard proposal={proposal} />
              </motion.div>
            ))
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center">
              <button
                onClick={() => loadProposals()}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Load More Proposals
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Loading proposals...</p>
            </div>
          )}
        </div>

        {/* Create Proposal Modal */}
        {showCreateForm && (
          <ProposalCreationForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </div>
    </div>
  )
}

export default ProposalListingPage