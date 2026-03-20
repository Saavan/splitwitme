import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { SplitEditor } from './SplitEditor'
import type { CreateTransactionInput } from '@/hooks/useTransactions'
import type { Transaction } from '@/hooks/useTransactions'

interface Member {
  id: string
  name: string
}

interface TransactionFormProps {
  members: Member[]
  currentUserId: string
  initialData?: Transaction
  onSubmit: (data: CreateTransactionInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function TransactionForm({ members, currentUserId, initialData, onSubmit, onCancel, isLoading }: TransactionFormProps) {
  const [description, setDescription] = useState(initialData?.description || '')
  const [amount, setAmount] = useState(initialData ? Number(initialData.amount) : 0)
  const [date, setDate] = useState(
    initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [paidById, setPaidById] = useState(initialData?.paidById || currentUserId)
  const [splits, setSplits] = useState<{ userId: string; amount: number }[]>(
    initialData?.splits.map(s => ({ userId: s.userId, amount: Number(s.amount) })) || []
  )

  const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0)
  const isValid = description && amount > 0 && Math.abs(splitsTotal - amount) < 0.01

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    await onSubmit({ description, amount, date, paidById, splits })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g. Dinner at Joe's"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount || ''}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="pl-6"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paidBy">Paid by</Label>
        <Select
          id="paidBy"
          value={paidById}
          onValueChange={setPaidById}
        >
          {members.map(m => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}{m.id === currentUserId ? ' (you)' : ''}
            </SelectItem>
          ))}
        </Select>
      </div>

      <SplitEditor
        members={members}
        splits={splits}
        totalAmount={amount}
        onChange={setSplits}
      />

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  )
}
