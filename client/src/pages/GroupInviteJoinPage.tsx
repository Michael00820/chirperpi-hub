import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { joinByInviteCode } from '../services/groupService'

const GroupInviteJoinPage = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    const join = async () => {
      if (!inviteCode) return
      setIsJoining(true)

      try {
        const group = await joinByInviteCode(inviteCode)
        navigate(`/groups/${group.id}`)
      } catch (err) {
        setError((err as Error).message || 'Unable to join group')
      } finally {
        setIsJoining(false)
      }
    }

    join()
  }, [inviteCode, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-sm p-10 text-center">
        {isJoining ? (
          <div>
            <p className="text-lg font-semibold">Joining group...</p>
            <p className="text-sm text-gray-500 mt-2">Hang tight while we validate your invite link.</p>
          </div>
        ) : error ? (
          <div>
            <p className="text-lg font-semibold text-red-600">Invite link invalid</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold">Preparing your invite...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupInviteJoinPage