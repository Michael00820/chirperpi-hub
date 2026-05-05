import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Transaction } from 'shared/auth'
import { getTransactionHistory } from '../services/transactionService'

const TransactionHistoryPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true)
      try {
        const result = await getTransactionHistory()
        setTransactions(result.transactions)
      } catch (error) {
        console.error('Failed to load transactions', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Transaction History</h1>
        <p className="mt-2 text-sm text-gray-600">View all Pi tips and payment activity for your account.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">Loading history...</div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">No transactions yet.</div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500">{tx.entityType.replace('_', ' ')} • {new Date(tx.createdAt).toLocaleString()}</div>
                  <div className="mt-2 text-lg font-semibold">{tx.amount.toFixed(2)} Pi</div>
                  <div className="mt-1 text-sm text-gray-600">From @{tx.sender?.username} to @{tx.receiver?.username}</div>
                </div>
                <div className="items-end text-right">
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {tx.status}
                  </div>
                  {tx.explorerUrl && (
                    <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      View on explorer <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TransactionHistoryPage
