import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { User } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const PROMPTED_KEY = (userId: string) => `venmo_prompted_${userId}`

export function hasBeenPrompted(userId: string) {
  return !!localStorage.getItem(PROMPTED_KEY(userId))
}

interface VenmoPromptDialogProps {
  user: User
  onDone: () => void
}

export function VenmoPromptDialog({ user, onDone }: VenmoPromptDialogProps) {
  const [handle, setHandle] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (venmoHandle: string | null) => {
      const res = await apiClient.patch('/auth/me', { venmoHandle })
      return res.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(['auth', 'me'], updated)
    },
  })

  const dismiss = () => {
    localStorage.setItem(PROMPTED_KEY(user.id), 'true')
    onDone()
  }

  const handleSave = async () => {
    const trimmed = handle.trim().replace(/^@/, '')
    if (!trimmed) return
    await mutation.mutateAsync(trimmed)
    dismiss()
  }

  const handleSkip = () => {
    dismiss()
  }

  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What's your Venmo handle?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adding your Venmo handle lets group members pay you directly from the app.
        </p>
        <div className="space-y-2 mt-2">
          <Label htmlFor="venmo">Venmo handle</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="venmo"
              placeholder="yourhandle"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              className="pl-7"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleSave} disabled={!handle.trim() || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            I don't have one
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
