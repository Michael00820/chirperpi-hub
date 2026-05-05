import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { requestPiPayment, loadPiSdk } from '../../utils/piSdk'
import { Transaction } from 'shared/auth'

interface TransactionModalProps {
  isOpen: boolean
  title: string
  description: string
  defaultAmount?: number
  entityType: 'post' | 'comment' | 'donation' | 'post_unlock'
  onClose: () => void
  onConfirm: (amount: number) => Promise<Transaction>
  onSuccess?: (transaction: Transaction) => void
}

const TransactionModal = ({
  isOpen,
  title,
  description,
  defaultAmount = 0,
  entityType,
  onClose,
  onConfirm,
  onSuccess
}: TransactionModalProps) => {
  const [amount, setAmount] = useState(defaultAmount)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setAmount(defaultAmount)
    setError(null)
    setResult(null)
    setLoading(false)
    loadPiSdk()
      .then(sdk => setSdkLoaded(!!sdk))
      .catch(() => setSdkLoaded(false))
  }, [defaultAmount, isOpen])

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      if (sdkLoaded) {
        await requestPiPayment(amount, description)
      }

      const transaction = await onConfirm(amount)
      setResult(transaction)
      onSuccess?.(transaction)
    } catch (err: any) {
      setError(err?.message || 'Unable to process the transaction')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (Pi)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {entityType === 'post_unlock' && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              This will unlock premium Pi content for this post.
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Transaction completed successfully.
              </div>
              {result.explorerUrl && (
                <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 block text-blue-600 underline">
                  View on explorer
                </a>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || amount <= 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionModal
