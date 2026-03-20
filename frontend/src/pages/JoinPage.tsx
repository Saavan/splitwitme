import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { Button } from '@/components/ui/button'

interface JoinInfo {
  groupName: string
  joinCode: string
}

export function JoinPage() {
  const { joinCode } = useParams<{ joinCode: string }>()

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

  if (isLoading) {
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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Join {data.groupName}</h1>
          <p className="text-muted-foreground">
            Sign in with Google to join <strong>{data.groupName}</strong> on SplitWitMe.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => { window.location.href = `${base}/auth/google?joinCode=${joinCode}` }}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}
