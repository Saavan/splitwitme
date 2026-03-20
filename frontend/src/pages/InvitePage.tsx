import { useParams } from 'react-router-dom'
import { useInviteInfo } from '@/hooks/useInvites'
import { Button } from '@/components/ui/button'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { data: invite, isLoading, error, failureReason } = useInviteInfo(token!)

  const base = import.meta.env.VITE_API_URL || ''

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    const status = (failureReason as any)?.response?.status
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">
            {status === 410 ? 'This invite has expired.' : 'This invite link is invalid.'}
          </p>
        </div>
      </div>
    )
  }

  if (!invite) return null

  if (invite.claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">This invite has already been accepted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm px-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">You've been invited!</h1>
          <p className="text-muted-foreground">
            Join <strong>{invite.groupName}</strong> on SplitWitMe to split expenses with your group.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => { window.location.href = `${base}/auth/google?inviteToken=${token}` }}
        >
          Sign in with Google to accept
        </Button>
      </div>
    </div>
  )
}
