import { useParams, useNavigate } from 'react-router-dom'
import { useInviteInfo, useClaimInvite } from '@/hooks/useInvites'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { data: invite, isLoading, error, failureReason } = useInviteInfo(token!)
  const { data: user, isLoading: authLoading } = useAuth()
  const claimInvite = useClaimInvite(token!)

  const base = import.meta.env.VITE_API_URL || ''

  if (isLoading || authLoading) {
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

  const handleAccept = async () => {
    const result = await claimInvite.mutateAsync()
    navigate(`/groups/${result.groupId}`)
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
        {user ? (
          <Button
            size="lg"
            onClick={handleAccept}
            disabled={claimInvite.isPending}
          >
            {claimInvite.isPending ? 'Joining...' : `Accept invitation as ${user.name}`}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => { window.location.href = `${base}/auth/google?inviteToken=${token}` }}
          >
            Sign in with Google to accept
          </Button>
        )}
        {claimInvite.isError && (
          <p className="text-sm text-destructive">Failed to join group. Please try again.</p>
        )}
      </div>
    </div>
  )
}
