import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import apiClient from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAIL = 'saavs94@gmail.com'

interface AdminUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string
}

export function AdminPage() {
  const { data: me, isLoading: authLoading } = useAuth()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users')
      return res.data
    },
    enabled: me?.email === ADMIN_EMAIL,
  })

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast('User removed', 'success')
      setPendingDelete(null)
    },
    onError: (err: any) => {
      toast(err.response?.data?.error || 'Failed to remove user', 'error')
      setPendingDelete(null)
    },
  })

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (me?.email !== ADMIN_EMAIL) return <Navigate to="/" replace />

  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-1">Admin</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isLoading ? '…' : `${users.length} users on the platform`}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    : initials(user.name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block shrink-0">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
                {user.email !== ADMIN_EMAIL && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setPendingDelete(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove user"
        description={pendingDelete ? `Permanently remove ${pendingDelete.name} (${pendingDelete.email}) from the platform? This cannot be undone.` : ''}
        confirmLabel="Remove"
        confirmVariant="destructive"
        isPending={deleteUser.isPending}
        onConfirm={() => pendingDelete && deleteUser.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
