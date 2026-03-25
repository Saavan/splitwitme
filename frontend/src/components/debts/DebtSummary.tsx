import { useState } from 'react'
import { ArrowRight, Bell } from 'lucide-react'
import type { DebtsData, SimplifiedDebt, ReminderLevel } from '@/hooks/useDebts'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { useSendReminder } from '@/hooks/useDebts'
import { VenmoButton } from './VenmoButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'CA$' }

interface DebtSummaryProps {
  debts: DebtsData
  groupId: string
  currentUserId: string
}

export function DebtSummary({ debts, groupId, currentUserId }: DebtSummaryProps) {
  const [confirmingDebt, setConfirmingDebt] = useState<SimplifiedDebt | null>(null)
  const [cashAmount, setCashAmount] = useState('')
  const [remindingDebt, setRemindingDebt] = useState<SimplifiedDebt | null>(null)
  const createTx = useCreateTransaction(groupId)
  const sendReminder = useSendReminder(groupId)
  const { toast } = useToast()

  const handleSendReminder = async (level: ReminderLevel) => {
    if (!remindingDebt) return
    try {
      await sendReminder.mutateAsync({ debtorUserId: remindingDebt.fromId, amount: remindingDebt.amount, currency: remindingDebt.currency, level })
      toast(`Reminder sent to ${remindingDebt.fromName}!`, 'success')
      setRemindingDebt(null)
    } catch {
      toast('Failed to send reminder', 'error')
      setRemindingDebt(null)
    }
  }

  const openConfirm = (debt: SimplifiedDebt) => {
    setConfirmingDebt(debt)
    setCashAmount(debt.amount.toFixed(2))
  }

  const closeConfirm = () => {
    setConfirmingDebt(null)
    setCashAmount('')
  }

  const handleConfirm = async () => {
    if (!confirmingDebt) return
    const amount = parseFloat(cashAmount)
    if (isNaN(amount) || amount <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    try {
      await createTx.mutateAsync({
        description: `Cash payment to ${confirmingDebt.toName}`,
        amount,
        currency: confirmingDebt.currency,
        paidById: currentUserId,
        splits: [{ userId: confirmingDebt.toId, amount }],
      })
      toast('Cash payment recorded!', 'success')
      closeConfirm()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
  }

  const currencyEntries = Object.entries(debts.perCurrency)
  const allSettled = currencyEntries.every(([, data]) => data.simplifiedDebts.length === 0)

  if (allSettled || currencyEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-lg font-medium text-green-600">All settled up!</p>
        <p className="text-sm mt-1">No outstanding debts in this group.</p>
      </div>
    )
  }

  const sym = (currency: string) => CURRENCY_SYMBOL[currency] ?? currency

  return (
    <>
      <div className="space-y-6">
        {currencyEntries.map(([currency, data]) => {
          if (data.simplifiedDebts.length === 0) return null
          return (
            <div key={currency}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {currency} Debts
              </p>
              <div className="space-y-3">
                {data.simplifiedDebts.map((debt, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">{debt.fromName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{debt.toName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">{sym(currency)}{debt.amount.toFixed(2)}</span>
                      {debt.toId === currentUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRemindingDebt(debt)}
                          title={`Send reminder to ${debt.fromName}`}
                        >
                          <Bell className="h-3.5 w-3.5 mr-1" />
                          Remind
                        </Button>
                      )}
                      {debt.fromId === currentUserId && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openConfirm(debt)}>
                            Paid in cash
                          </Button>
                          <VenmoButton
                            venmoLink={debt.venmoLink}
                            amount={debt.amount}
                            recipientName={debt.toName}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={!!remindingDebt} onOpenChange={open => { if (!open) setRemindingDebt(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How badly do you want the money back?</DialogTitle>
          </DialogHeader>
          {remindingDebt && (
            <p className="text-sm text-muted-foreground -mt-1">
              Sending reminder to <strong>{remindingDebt.fromName}</strong> for{' '}
              <strong>{(CURRENCY_SYMBOL[remindingDebt.currency] ?? remindingDebt.currency) + remindingDebt.amount.toFixed(2)}</strong>
            </p>
          )}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('friendly')}
            >
              <img src="/duck_friendly.png" alt="Friendly duck" className="h-10 w-10 object-contain shrink-0" />
              <div>
                <p className="font-medium text-sm">Eh, sometime soon</p>
                <p className="text-xs text-muted-foreground">A polite nudge. The duck is happy.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('medium')}
            >
              <img src="/duck_medium.png" alt="Medium duck" className="h-10 w-10 object-contain shrink-0" />
              <div>
                <p className="font-medium text-sm">I'd like it back</p>
                <p className="text-xs text-muted-foreground">Firm but fair. The duck is not amused.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left border-red-200 hover:border-red-400 hover:bg-red-50"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('angry')}
            >
              <img src="/duck_angry.png" alt="Angry duck" className="h-10 w-10 object-contain shrink-0" />
              <div>
                <p className="font-medium text-sm text-red-600">I'm calling the mob to collect my money</p>
                <p className="text-xs text-muted-foreground">Final warning. The duck has been informed.</p>
              </div>
            </Button>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setRemindingDebt(null)} disabled={sendReminder.isPending}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmingDebt} onOpenChange={open => { if (!open) closeConfirm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm cash payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              You're confirming you paid <strong>{confirmingDebt?.toName}</strong> in cash, outside the app.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount ({confirmingDebt?.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {confirmingDebt ? sym(confirmingDebt.currency) : '$'}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
