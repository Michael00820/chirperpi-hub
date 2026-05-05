import { useEffect, useState } from 'react'
import Leaderboard from '../components/transactions/Leaderboard'
import { LeaderboardItem } from 'shared/auth'
import { getLeaderboard } from '../services/transactionService'

const LeaderboardPage = () => {
  const [items, setItems] = useState<LeaderboardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true)
      try {
        const result = await getLeaderboard()
        setItems(result)
      } catch (error) {
        console.error('Failed to load leaderboard', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Top Supporters</h1>
        <p className="mt-2 text-sm text-gray-600">See the users who are tipping the most Pi to the community.</p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">Loading leaderboard...</div>
      ) : (
        <Leaderboard items={items} />
      )}
    </div>
  )
}

export default LeaderboardPage
