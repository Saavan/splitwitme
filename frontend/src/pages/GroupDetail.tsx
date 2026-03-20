import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, UserPlus, ArrowLeft, Link, RefreshCw } from 'lucide-react'
import { useGroup, useGroupJoinLink, useRegenerateJoinLink } from '@/hooks/useGroups'
import { useTransactions, useDeleteTransaction, useUpdateTransaction, useCreateTransaction } from '@/hooks/useTransactions'
import { useDebts } from '@/hooks/useDebts'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransactionItem } from '@/components/transactions/TransactionItem'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { DebtSummary } from '@/components/debts/DebtSummary'
import { AddMemberDialog } from '@/components/groups/AddMemberDialog'
import { useToast } from '@/components/ui/toast'
import type { Transaction, CreateTransactionInput } from '@/hooks/useTransactions'

type Tab = 'transactions' | 'debts'

export function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: user } = useAuth()
  const { data: group, isLoading: groupLoading } = useGroup(id!)
  const { data: transactions, isLoading: txLoading } = useTransactions(id!)
  const { data: debts } = useDebts(id!)
  const createTx = useCreateTransaction(id!)
  const updateTx = useUpdateTransaction(id!)
  const deleteTx = useDeleteTransaction(id!)
  const joinLinkQuery = useGroupJoinLink(id!)
  const regenerateJoinLink = useRegenerateJoinLink(id!)
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('transactions')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showNewTx, setShowNewTx] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!group) return null

  const members = group.members.map(m => ({ id: m.user.id, name: m.user.name }))
  const isOwner = group.members.find(m => m.user.id === user?.id)?.role === 'OWNER'

  const handleShareJoinLink = async () => {
    try {
      const result = await joinLinkQuery.refetch()
      if (result.data?.joinUrl) {
        await navigator.clipboard.writeText(result.data.joinUrl)
        toast('Link copied!', 'success')
      }
    } catch {
      toast('Failed to get join link', 'error')
    }
  }

  const handleRegenerateJoinLink = async () => {
    if (!confirm('Regenerate the join link? The old link will stop working.')) return
    try {
      const result = await regenerateJoinLink.mutateAsync()
      await navigator.clipboard.writeText(result.joinUrl)
      toast('New link copied!', 'success')
    } catch {
      toast('Failed to regenerate join link', 'error')
    }
  }

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await deleteTx.mutateAsync(txId)
      toast('Transaction deleted', 'success')
    } catch {
      toast('Failed to delete transaction', 'error')
    }
  }

  const handleCreateTx = async (data: CreateTransactionInput) => {
    try {
      await createTx.mutateAsync(data)
      toast('Transaction added!', 'success')
      setShowNewTx(false)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add transaction', 'error')
      throw err
    }
  }

  const handleUpdateTx = async (data: CreateTransactionInput) => {
    if (!editingTx) return
    try {
      await updateTx.mutateAsync({ txId: editingTx.id, data })
      toast('Transaction updated!', 'success')
      setEditingTx(null)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update transaction', 'error')
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{group.name}</h1>
            <p className="text-sm text-muted-foreground">{group.members.length} members</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleShareJoinLink}>
            <Link className="h-4 w-4 mr-1" />
            Share
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" onClick={handleRegenerateJoinLink} disabled={regenerateJoinLink.isPending}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAddMember(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button size="sm" onClick={() => setShowNewTx(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Transaction
          </Button>
        </div>

        {/* Pending invites */}
        {group.invites?.length > 0 && (
          <div className="mt-4 mb-6 border rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pending Invites</p>
            {group.invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{invite.invitedName}</span>
                <Badge variant="secondary">Pending</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          {(['transactions', 'debts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* New transaction form */}
        {showNewTx && (
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-4">New Transaction</h2>
            <TransactionForm
              members={members}
              currentUserId={user?.id || ''}
              onSubmit={handleCreateTx}
              onCancel={() => setShowNewTx(false)}
              isLoading={createTx.isPending}
            />
          </div>
        )}

        {/* Edit transaction form */}
        {editingTx && (
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-4">Edit Transaction</h2>
            <TransactionForm
              members={members}
              currentUserId={user?.id || ''}
              initialData={editingTx}
              onSubmit={handleUpdateTx}
              onCancel={() => setEditingTx(null)}
              isLoading={updateTx.isPending}
            />
          </div>
        )}

        {tab === 'transactions' && (
          <div>
            {txLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : transactions?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions yet.</p>
                <p className="text-sm mt-1">Add one to start tracking expenses!</p>
              </div>
            ) : (
              <div>
                {transactions?.map(tx => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    currentUserId={user?.id || ''}
                    onEdit={setEditingTx}
                    onDelete={handleDeleteTx}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'debts' && (
          <div>
            {debts ? (
              <DebtSummary debts={debts} />
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            )}
          </div>
        )}
      </main>

      <AddMemberDialog groupId={id!} open={showAddMember} onOpenChange={setShowAddMember} />
    </div>
  )
}
