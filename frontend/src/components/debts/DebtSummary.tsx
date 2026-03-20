import type { DebtsData } from '@/hooks/useDebts'
import { VenmoButton } from './VenmoButton'
import { ArrowRight } from 'lucide-react'

interface DebtSummaryProps {
  debts: DebtsData
}

export function DebtSummary({ debts }: DebtSummaryProps) {
  if (debts.simplifiedDebts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-lg font-medium text-green-600">All settled up!</p>
        <p className="text-sm mt-1">No outstanding debts in this group.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {debts.simplifiedDebts.map((debt, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium text-sm truncate">{debt.fromName}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{debt.toName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold">${debt.amount.toFixed(2)}</span>
            <VenmoButton
              venmoLink={debt.venmoLink}
              amount={debt.amount}
              recipientName={debt.toName}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
