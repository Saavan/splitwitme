import { useState, useEffect, useRef } from 'react'
import { Copy, Search, UserPlus } from 'lucide-react'
import { useAddMember } from '@/hooks/useGroups'
import { useCreateInvite } from '@/hooks/useInvites'
import { useUserSearch, type UserSearchResult } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

type DialogTab = 'search' | 'invite'

interface AddMemberDialogProps {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({ groupId, open, onOpenChange }: AddMemberDialogProps) {
  const [tab, setTab] = useState<DialogTab>('search')

  // Search tab
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const addMember = useAddMember(groupId)
  const { data: searchResults = [], isFetching } = useUserSearch(debouncedQ, groupId)

  // Invite by name tab
  const [invitedName, setInvitedName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const createInvite = useCreateInvite(groupId)

  const { toast } = useToast()

  // Debounce search input by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(searchInput), 300)
    return () => clearTimeout(id)
  }, [searchInput])

  // Show dropdown when query is long enough
  useEffect(() => {
    setShowDropdown(debouncedQ.trim().length >= 2)
  }, [debouncedQ])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClose = () => {
    setSearchInput('')
    setDebouncedQ('')
    setShowDropdown(false)
    setInvitedName('')
    setInviteEmail('')
    setCreatedInviteUrl(null)
    setEmailSent(false)
    onOpenChange(false)
  }

  const handleSelectUser = async (user: UserSearchResult) => {
    setShowDropdown(false)
    setAddingUserId(user.id)
    try {
      await addMember.mutateAsync(user.email)
      toast(`${user.name} added to the group!`, 'success')
      setSearchInput('')
      setDebouncedQ('')
      onOpenChange(false)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add member', 'error')
    } finally {
      setAddingUserId(null)
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

  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mt-2">
          <button
            onClick={() => setTab('search')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Search users
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

        {tab === 'search' && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2" ref={searchRef}>
              <Label htmlFor="user-search">Search by name or email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="user-search"
                  type="text"
                  placeholder="Alice, alice@example.com…"
                  value={searchInput}
                  onChange={e => { setSearchInput(e.target.value); setShowDropdown(true) }}
                  onFocus={() => { if (debouncedQ.length >= 2) setShowDropdown(true) }}
                  className="pl-9"
                  autoComplete="off"
                />

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 overflow-hidden">
                    {isFetching && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                    )}
                    {!isFetching && searchResults.length === 0 && (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        No users found.{' '}
                        <button
                          className="text-primary underline underline-offset-2"
                          onClick={() => { setTab('invite'); setShowDropdown(false) }}
                        >
                          Invite them by name instead.
                        </button>
                      </div>
                    )}
                    {!isFetching && searchResults.map(user => (
                      <button
                        key={user.id}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          user.isMember
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => !user.isMember && handleSelectUser(user)}
                        disabled={user.isMember || addingUserId === user.id}
                      >
                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                          {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                            : initials(user.name)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {user.isMember
                          ? <span className="text-xs text-muted-foreground shrink-0">Already in group</span>
                          : <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Only shows people who have already signed in to SplitWitMe.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
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
                    {createInvite.isPending ? 'Creating…' : 'Create Invite'}
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
