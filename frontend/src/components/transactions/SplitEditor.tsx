import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { splitEqually, sumSplits, splitsMatchTotal } from '@/lib/money'

interface Member {
  id: string
  name: string
}

interface Split {
  userId: string
  amount: number
}

interface SplitEditorProps {
  members: Member[]
  splits: Split[]
  totalAmount: number
  onChange: (splits: Split[]) => void
}

export function SplitEditor({ members, splits, totalAmount, onChange }: SplitEditorProps) {
  const splitsTotal = sumSplits(splits.map(s => s.amount || 0))
  const isValid = splitsMatchTotal(splits.map(s => s.amount || 0), totalAmount)

  const handleEqualSplit = () => {
    if (members.length === 0 || totalAmount <= 0) return
    const amounts = splitEqually(totalAmount, members.length)
    onChange(members.map((m, i) => ({ userId: m.id, amount: amounts[i] })))
  }

  const handleAmountChange = (userId: string, value: string) => {
    const amount = parseFloat(value) || 0
    const newSplits = splits.map(s => s.userId === userId ? { ...s, amount } : s)
    onChange(newSplits)
  }

  // Ensure all members have splits
  useEffect(() => {
    const memberIds = new Set(splits.map(s => s.userId))
    const missing = members.filter(m => !memberIds.has(m.id))
    if (missing.length > 0) {
      onChange([...splits, ...missing.map(m => ({ userId: m.id, amount: 0 }))])
    }
  }, [members])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Split between members</p>
        <Button type="button" variant="outline" size="sm" onClick={handleEqualSplit}>
          Split equally
        </Button>
      </div>
      <div className="space-y-2">
        {members.map(member => {
          const split = splits.find(s => s.userId === member.id)
          return (
            <div key={member.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{member.name}</span>
              <div className="relative w-24 shrink-0">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={split?.amount || ''}
                  onChange={e => handleAmountChange(member.id, e.target.value)}
                  className="pl-6"
                  placeholder="0.00"
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className={cn(
        'text-sm flex justify-between',
        isValid ? 'text-green-600' : 'text-red-600'
      )}>
        <span>Total split:</span>
        <span>${splitsTotal.toFixed(2)} / ${totalAmount.toFixed(2)}</span>
      </div>
      {!isValid && totalAmount > 0 && (
        <p className="text-xs text-red-600">Splits must equal the transaction total</p>
      )}
    </div>
  )
}
