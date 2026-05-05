import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Send, Loader } from 'lucide-react'
import { motion } from 'framer-motion'
import { CreateProposalRequest } from 'shared/auth'
import { createProposal } from '../../services/proposalService'

const proposalSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  category: z.enum(['governance', 'treasury', 'technical', 'community', 'other']),
  votingOptions: z.array(z.object({
    label: z.string().min(1, 'Option label required'),
    description: z.string().optional()
  })).min(2, 'At least 2 voting options required').max(10, 'Maximum 10 voting options'),
  minPiBalance: z.number().min(0, 'Minimum Pi balance cannot be negative'),
  votingDuration: z.number().min(1, 'Voting duration must be at least 1 hour').max(168, 'Voting duration cannot exceed 1 week')
})

type ProposalFormData = z.infer<typeof proposalSchema>

interface ProposalCreationFormProps {
  onClose: () => void
  onSuccess?: () => void
}

const ProposalCreationForm = ({ onClose, onSuccess }: ProposalCreationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      category: 'governance',
      votingOptions: [
        { label: 'Yes', description: 'Approve the proposal' },
        { label: 'No', description: 'Reject the proposal' }
      ],
      minPiBalance: 0,
      votingDuration: 24
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'votingOptions'
  })

  const watchedOptions = watch('votingOptions')

  const onSubmit = async (data: ProposalFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await createProposal(data)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addVotingOption = () => {
    if (fields.length < 10) {
      append({ label: '', description: '' })
    }
  }

  const removeVotingOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Governance Proposal</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposal Title
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter proposal title..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="governance">Governance</option>
                <option value="treasury">Treasury</option>
                <option value="technical">Technical</option>
                <option value="community">Community</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your proposal in detail..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Voting Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Voting Options ({fields.length}/10)
                </label>
                <button
                  type="button"
                  onClick={addVotingOption}
                  disabled={fields.length >= 10}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        {...register(`votingOptions.${index}.label`)}
                        type="text"
                        placeholder={`Option ${index + 1} label`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        {...register(`votingOptions.${index}.description`)}
                        type="text"
                        placeholder="Optional description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {fields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVotingOption(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {errors.votingOptions && (
                <p className="mt-1 text-sm text-red-600">{errors.votingOptions.message}</p>
              )}
            </div>

            {/* Voting Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Pi Balance
                </label>
                <input
                  {...register('minPiBalance', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                {errors.minPiBalance && (
                  <p className="mt-1 text-sm text-red-600">{errors.minPiBalance.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voting Duration (hours)
                </label>
                <input
                  {...register('votingDuration', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="24"
                />
                {errors.votingDuration && (
                  <p className="mt-1 text-sm text-red-600">{errors.votingDuration.message}</p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Create Proposal
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default ProposalCreationForm