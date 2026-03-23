import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { useJoinViaCode } from '@/hooks/useInvites'
import { Button } from '@/components/ui/button'

interface JoinInfo {
  groupId: string
  groupName: string
  joinCode: string
}

export function JoinPage() {
  const { joinCode } = useParams<{ joinCode: string }>()
  const navigate = useNavigate()
  const { data: user, isLoading: authLoading } = useAuth()
  const joinViaCode = useJoinViaCode(joinCode!)

  const { data, isLoading, error } = useQuery<JoinInfo>({
    queryKey: ['join', joinCode],
    queryFn: async () => {
      const res = await apiClient.get(`/invites/join/${joinCode}`)
      return res.data
    },
    enabled: !!joinCode,
    retry: false,
  })

  const base = import.meta.env.VITE_API_URL || ''

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">This join link is no longer valid.</p>
        </div>
      </div>
    )
  }

  const handleJoin = async () => {
    const result = await joinViaCode.mutateAsync()
    navigate(`/groups/${result.groupId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Join {data.groupName}</h1>
          <p className="text-muted-foreground">
            {user
              ? `You're signed in as ${user.name}. Click below to join the group.`
              : `Sign in with Google to join `}
            {!user && <strong>{data.groupName}</strong>}
            {!user && ' on SplitWitMe.'}
          </p>
        </div>
        {user ? (
          <Button
            size="lg"
            onClick={handleJoin}
            disabled={joinViaCode.isPending}
          >
            {joinViaCode.isPending ? 'Joining...' : `Join ${data.groupName}`}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => { window.location.href = `${base}/auth/google?joinCode=${joinCode}` }}
          >
            Sign in with Google
          </Button>
        )}
        {joinViaCode.isError && (
          <p className="text-sm text-destructive">Failed to join group. Please try again.</p>
        )}
      </div>
    </div>
  )
}
