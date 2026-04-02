import { useState } from 'react'
import { ArrowRight, Bell, CheckCircle } from 'lucide-react'
import type { DebtsData, SimplifiedDebt, ReminderLevel } from '@/hooks/useDebts'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { useSendReminder, useSendReminderAll } from '@/hooks/useDebts'
import { combineCurrencies, type Settlement } from '@/lib/money'
import { VenmoButton } from './VenmoButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'CA$' }
const DEFAULT_USD_TO_CAD = 1.39

interface DebtSummaryProps {
  debts: DebtsData
  groupId: string
  currentUserId: string
  autoConvert: boolean
  setAutoConvert: (v: boolean) => void
  rateInput: string
  setRateInput: (v: string) => void
}

export function DebtSummary({ debts, groupId, currentUserId, autoConvert, setAutoConvert, rateInput, setRateInput }: DebtSummaryProps) {
  const [confirmingDebt, setConfirmingDebt] = useState<SimplifiedDebt | null>(null)
  const [cashAmount, setCashAmount] = useState('')
  const [venmoConfirmingDebt, setVenmoConfirmingDebt] = useState<SimplifiedDebt | null>(null)
  const [remindingDebt, setRemindingDebt] = useState<SimplifiedDebt | null>(null)
  const [markingAsPaidDebt, setMarkingAsPaidDebt] = useState<SimplifiedDebt | null>(null)
  const [markAsPaidAmount, setMarkAsPaidAmount] = useState('')
  const [remindingAll, setRemindingAll] = useState(false)
  const [remindAllLevel, setRemindAllLevel] = useState<ReminderLevel | null>(null)
  const createTx = useCreateTransaction(groupId)
  const sendReminder = useSendReminder(groupId)
  const sendReminderAll = useSendReminderAll(groupId)
  const { toast } = useToast()

  const currencyEntries = Object.entries(debts.perCurrency)
  const isMultiCurrency = currencyEntries.length > 1
  const rate = parseFloat(rateInput) || DEFAULT_USD_TO_CAD

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

  const handleSendReminderAll = async () => {
    if (!remindAllLevel) return
    try {
      const result = await sendReminderAll.mutateAsync({ level: remindAllLevel })
      toast(`Reminders sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}!`, 'success')
      setRemindAllLevel(null)
      setRemindingAll(false)
    } catch {
      toast('Failed to send reminders', 'error')
      setRemindAllLevel(null)
      setRemindingAll(false)
    }
  }

  const openConfirm = (debt: SimplifiedDebt) => {
    setConfirmingDebt(debt)
    setCashAmount(debt.amount.toFixed(2))
  }

  const handleVenmoConfirm = async () => {
    if (!venmoConfirmingDebt) return
    try {
      await createTx.mutateAsync({
        description: `Venmo payment to ${venmoConfirmingDebt.toName}`,
        amount: venmoConfirmingDebt.amount,
        currency: venmoConfirmingDebt.currency,
        paidById: currentUserId,
        splits: [{ userId: venmoConfirmingDebt.toId, amount: venmoConfirmingDebt.amount }],
      })
      toast('Venmo payment recorded!', 'success')
      setVenmoConfirmingDebt(null)
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
  }

  const closeConfirm = () => {
    setConfirmingDebt(null)
    setCashAmount('')
  }

  const openMarkAsPaid = (debt: SimplifiedDebt) => {
    setMarkingAsPaidDebt(debt)
    setMarkAsPaidAmount(debt.amount.toFixed(2))
  }

  const closeMarkAsPaid = () => {
    setMarkingAsPaidDebt(null)
    setMarkAsPaidAmount('')
  }

  const handleMarkAsPaid = async () => {
    if (!markingAsPaidDebt) return
    const amount = parseFloat(markAsPaidAmount)
    if (isNaN(amount) || amount <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    try {
      await createTx.mutateAsync({
        description: `Payment from ${markingAsPaidDebt.fromName}`,
        amount,
        currency: markingAsPaidDebt.currency,
        paidById: markingAsPaidDebt.fromId,
        splits: [{ userId: currentUserId, amount }],
      })
      toast(`Payment from ${markingAsPaidDebt.fromName} recorded!`, 'success')
      closeMarkAsPaid()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
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

  // Collect all debtors who owe the current user (for Remind All)
  const debtorsOwingMe = currencyEntries.flatMap(([currency, data]) =>
    data.simplifiedDebts
      .filter(d => d.toId === currentUserId)
      .map(d => ({ name: d.fromName, amount: d.amount, currency }))
  )

  // Converted view: merge all currencies into USD and re-simplify
  const convertedDebts: Settlement[] = (isMultiCurrency && autoConvert)
    ? combineCurrencies(debts.perCurrency, rate)
    : []

  const renderDebtRow = (
    debt: SimplifiedDebt | Settlement,
    currency: string,
    venmoLink?: string | null,
    i?: number
  ) => (
    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{debt.fromName}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{debt.toName}</span>
        </div>
        <span className="font-semibold shrink-0">{sym(currency)}{debt.amount.toFixed(2)}</span>
      </div>
      {(debt.toId === currentUserId || debt.fromId === currentUserId) && (
        <div className="flex items-center gap-2">
          {debt.toId === currentUserId && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openMarkAsPaid({ ...debt as SimplifiedDebt, currency })}
                title={`Mark payment from ${debt.fromName} as received`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Mark as paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRemindingDebt({ ...debt as SimplifiedDebt, currency })}
                title={`Send reminder to ${debt.fromName}`}
              >
                <Bell className="h-3.5 w-3.5 mr-1" />
                Remind
              </Button>
            </>
          )}
          {debt.fromId === currentUserId && (
            <>
              <Button size="sm" variant="outline" onClick={() => openConfirm({ ...debt as SimplifiedDebt, currency })}>
                Paid in cash
              </Button>
              {venmoLink !== undefined && (
                <VenmoButton
                  venmoLink={venmoLink ?? null}
                  amount={debt.amount}
                  recipientName={debt.toName}
                  onAfterOpen={() => setVenmoConfirmingDebt({ ...debt as SimplifiedDebt, currency })}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="space-y-6">
        {/* Remind All button — only shown when 2+ people owe the current user */}
        {debtorsOwingMe.length >= 2 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRemindingAll(true)}
            >
              <Bell className="h-3.5 w-3.5 mr-1" />
              Remind All
            </Button>
          </div>
        )}

        {/* Multi-currency conversion controls */}
        {isMultiCurrency && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/40">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoConvert}
                onChange={e => setAutoConvert(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">Automatically convert currencies</span>
            </label>
            {autoConvert && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">1 USD =</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">CAD</span>
              </div>
            )}
          </div>
        )}

        {/* Converted view */}
        {isMultiCurrency && autoConvert ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              USD (converted at 1 USD = {rate.toFixed(2)} CAD)
            </p>
            <div className="space-y-3">
              {convertedDebts.length === 0
                ? <p className="text-sm text-green-600 font-medium">All settled up!</p>
                : convertedDebts.map((debt, i) => renderDebtRow(debt, 'USD', undefined, i))}
            </div>
          </div>
        ) : (
          /* Per-currency view */
          currencyEntries.map(([currency, data]) => {
            if (data.simplifiedDebts.length === 0) return null
            return (
              <div key={currency}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {currency} Debts
                </p>
                <div className="space-y-3">
                  {data.simplifiedDebts.map((debt, i) =>
                    renderDebtRow(debt, currency, debt.venmoLink, i)
                  )}
                </div>
              </div>
            )
          })
        )}
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
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('friendly')}
            >
              <img src="/duck_friendly.png" alt="Friendly duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">Eh, sometime soon</p>
                <p className="text-xs text-muted-foreground whitespace-normal">A polite nudge. The duck is happy.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('medium')}
            >
              <img src="/duck_medium.png" alt="Medium duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">I'd like it back</p>
                <p className="text-xs text-muted-foreground whitespace-normal">Firm but fair. The duck is not amused.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full border-red-200 hover:border-red-400 hover:bg-red-50"
              disabled={sendReminder.isPending}
              onClick={() => handleSendReminder('angry')}
            >
              <img src="/duck_angry.png" alt="Angry duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm text-red-600 whitespace-normal">I'm calling the mob to collect my money</p>
                <p className="text-xs text-muted-foreground whitespace-normal">Final warning. The duck has been informed.</p>
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

      {/* Step 1: Pick aggression level */}
      <Dialog open={remindingAll && !remindAllLevel} onOpenChange={open => { if (!open) setRemindingAll(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remind everyone — how urgent is it?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Reminders will be sent to <strong>{debtorsOwingMe.length}</strong> {debtorsOwingMe.length === 1 ? 'person' : 'people'}.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full"
              onClick={() => setRemindAllLevel('friendly')}
            >
              <img src="/duck_friendly.png" alt="Friendly duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">Eh, sometime soon</p>
                <p className="text-xs text-muted-foreground whitespace-normal">A polite nudge. The duck is happy.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full"
              onClick={() => setRemindAllLevel('medium')}
            >
              <img src="/duck_medium.png" alt="Medium duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm">I'd like it back</p>
                <p className="text-xs text-muted-foreground whitespace-normal">Firm but fair. The duck is not amused.</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 px-4 flex items-center gap-3 justify-start text-left w-full border-red-200 hover:border-red-400 hover:bg-red-50"
              onClick={() => setRemindAllLevel('angry')}
            >
              <img src="/duck_angry.png" alt="Angry duck" className="h-12 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm text-red-600 whitespace-normal">I'm calling the mob to collect my money</p>
                <p className="text-xs text-muted-foreground whitespace-normal">Final warning. The duck has been informed.</p>
              </div>
            </Button>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setRemindingAll(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: Confirm recipients */}
      <Dialog open={remindingAll && !!remindAllLevel} onOpenChange={open => { if (!open) { setRemindAllLevel(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm — send reminders to {debtorsOwingMe.length} {debtorsOwingMe.length === 1 ? 'person' : 'people'}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-1">
            {debtorsOwingMe.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">{sym(d.currency)}{d.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRemindAllLevel(null)} disabled={sendReminderAll.isPending}>
              Back
            </Button>
            <Button onClick={handleSendReminderAll} disabled={sendReminderAll.isPending}>
              {sendReminderAll.isPending ? 'Sending...' : `Send ${debtorsOwingMe.length} reminder${debtorsOwingMe.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!venmoConfirmingDebt} onOpenChange={open => { if (!open) setVenmoConfirmingDebt(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment completed?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            Did you complete the Venmo payment of{' '}
            <strong>
              {venmoConfirmingDebt ? sym(venmoConfirmingDebt.currency) : ''}
              {venmoConfirmingDebt?.amount.toFixed(2)}
            </strong>{' '}
            to <strong>{venmoConfirmingDebt?.toName}</strong>?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setVenmoConfirmingDebt(null)} disabled={createTx.isPending}>
              No
            </Button>
            <Button onClick={handleVenmoConfirm} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Yes, mark as paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!markingAsPaidDebt} onOpenChange={open => { if (!open) closeMarkAsPaid() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              How much did <strong>{markingAsPaidDebt?.fromName}</strong> pay you?
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount ({markingAsPaidDebt?.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {markingAsPaidDebt ? sym(markingAsPaidDebt.currency) : '$'}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={markAsPaidAmount}
                  onChange={e => setMarkAsPaidAmount(e.target.value)}
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeMarkAsPaid} disabled={createTx.isPending}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Confirm'}
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
