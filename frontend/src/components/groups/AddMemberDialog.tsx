import { useState } from 'react'
import { Copy } from 'lucide-react'
import { useAddMember } from '@/hooks/useGroups'
import { useCreateInvite } from '@/hooks/useInvites'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

type DialogTab = 'email' | 'invite'

interface AddMemberDialogProps {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({ groupId, open, onOpenChange }: AddMemberDialogProps) {
  const [tab, setTab] = useState<DialogTab>('email')

  // Add by email tab
  const [email, setEmail] = useState('')
  const addMember = useAddMember(groupId)

  // Invite by name tab
  const [invitedName, setInvitedName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const createInvite = useCreateInvite(groupId)

  const { toast } = useToast()

  const handleClose = () => {
    setEmail('')
    setInvitedName('')
    setInviteEmail('')
    setCreatedInviteUrl(null)
    setEmailSent(false)
    onOpenChange(false)
  }

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addMember.mutateAsync(email)
      toast('Member added!', 'success')
      setEmail('')
      onOpenChange(false)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add member', 'error')
    }
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createInvite.mutateAsync({
        invitedName,
        email: inviteEmail || undefined,
      })
      setCreatedInviteUrl(result.inviteUrl)
      setEmailSent(result.emailSent)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create invite', 'error')
    }
  }

  const handleCopyLink = () => {
    if (createdInviteUrl) {
      navigator.clipboard.writeText(createdInviteUrl)
      toast('Link copied!', 'success')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mt-2">
          <button
            onClick={() => setTab('email')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'email'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Add by email
          </button>
          <button
            onClick={() => setTab('invite')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'invite'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Invite by name
          </button>
        </div>

        {tab === 'email' && (
          <form onSubmit={handleAddByEmail} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                They must have signed in to SplitWitMe at least once.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {tab === 'invite' && (
          <div className="space-y-4 mt-4">
            {!createdInviteUrl ? (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitedName">Name</Label>
                  <Input
                    id="invitedName"
                    type="text"
                    placeholder="Friend's name"
                    value={invitedName}
                    onChange={e => setInvitedName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email (optional)</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="friend@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, we'll also send them an email with the invite link.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInvite.isPending}>
                    {createInvite.isPending ? 'Creating...' : 'Create Invite'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share this link with <strong>{invitedName}</strong>:
                </p>
                <div className="flex gap-2">
                  <Input value={createdInviteUrl} readOnly className="flex-1 text-xs" />
                  <Button type="button" size="icon" variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {emailSent && (
                  <p className="text-sm text-green-600">Invitation email sent!</p>
                )}
                <DialogFooter>
                  <Button onClick={handleClose}>Done</Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
