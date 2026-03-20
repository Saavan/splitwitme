import { useState } from 'react'
import { useAddMember } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

interface AddMemberDialogProps {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({ groupId, open, onOpenChange }: AddMemberDialogProps) {
  const [email, setEmail] = useState('')
  const addMember = useAddMember(groupId)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
