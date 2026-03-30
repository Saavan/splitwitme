import { Pencil, Trash2 } from 'lucide-react'
import type { Transaction } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface TransactionItemProps {
  transaction: Transaction
  currentUserId: string
  onEdit: (tx: Transaction) => void
  onDelete: (txId: string) => void
}

export function TransactionItem({ transaction, currentUserId, onEdit, onDelete }: TransactionItemProps) {
  const mySplit = transaction.splits.find(s => s.userId === currentUserId)
  const iPaid = transaction.paidById === currentUserId
  const myAmountCents = mySplit ? Math.round(Number(mySplit.amount) * 100) : 0
  const txAmountCents = Math.round(Number(transaction.amount) * 100)
  const netEffect = (iPaid ? txAmountCents - myAmountCents : -myAmountCents) / 100
  const sym = transaction.currency === 'CAD' ? 'CA$' : '$'

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <Avatar className="h-9 w-9 shrink-0">
        {transaction.paidBy.avatarUrl ? (
          <AvatarImage src={transaction.paidBy.avatarUrl} />
        ) : (
          <AvatarFallback>{transaction.paidBy.name[0]}</AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{transaction.description}</p>
        <p className="text-sm text-muted-foreground truncate">
          {transaction.paidBy.name} paid {sym}{Number(transaction.amount).toFixed(2)}<span className="hidden sm:inline"> · {new Date(transaction.date).toLocaleDateString()}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-medium ${netEffect >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {netEffect >= 0 ? `+${sym}${netEffect.toFixed(2)}` : `-${sym}${Math.abs(netEffect).toFixed(2)}`}
        </p>
        <p className="text-xs text-muted-foreground">{iPaid ? 'you paid' : 'you owe'}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(transaction)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => onDelete(transaction.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
