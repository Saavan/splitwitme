import { useState } from 'react'
import { CheckCircle, CreditCard } from 'lucide-react'
import type { DebtsData, SimplifiedDebt } from '@/hooks/useDebts'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { VenmoButton } from './VenmoButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'CA$' }
const sym = (c: string) => CURRENCY_SYMBOL[c] ?? c

type DebtEntry = SimplifiedDebt & { currency: string }

interface DebtBannerProps {
  debts: DebtsData
  groupId: string
  currentUserId: string
}

export function DebtBanner({ debts, groupId, currentUserId }: DebtBannerProps) {
  const createTx = useCreateTransaction(groupId)
  const { toast } = useToast()

  const [payingDebt, setPayingDebt] = useState<DebtEntry | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [venmoConfirmingDebt, setVenmoConfirmingDebt] = useState<DebtEntry | null>(null)
  const [markingDebt, setMarkingDebt] = useState<DebtEntry | null>(null)
  const [markAmount, setMarkAmount] = useState('')

  const owes: DebtEntry[] = []
  const owed: DebtEntry[] = []

  for (const [currency, data] of Object.entries(debts.perCurrency)) {
    for (const debt of data.simplifiedDebts) {
      if (debt.fromId === currentUserId) owes.push({ ...debt, currency })
      if (debt.toId === currentUserId) owed.push({ ...debt, currency })
    }
  }

  if (owes.length === 0 && owed.length === 0) return null

  const totalByCurrency = (entries: DebtEntry[]) =>
    Object.entries(
      entries.reduce<Record<string, number>>((acc, d) => {
        acc[d.currency] = (acc[d.currency] || 0) + d.amount
        return acc
      }, {})
    )
      .map(([c, a]) => `${sym(c)}${a.toFixed(2)}`)
      .join(' + ')

  const openPay = (debt: DebtEntry) => { setPayingDebt(debt); setPayAmount(debt.amount.toFixed(2)) }
  const closePay = () => { setPayingDebt(null); setPayAmount('') }
  const closeMark = () => { setMarkingDebt(null); setMarkAmount('') }

  const handlePay = async () => {
    if (!payingDebt) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return }
    try {
      await createTx.mutateAsync({
        description: `Cash payment to ${payingDebt.toName}`,
        amount,
        currency: payingDebt.currency,
        paidById: currentUserId,
        splits: [{ userId: payingDebt.toId, amount }],
      })
      toast('Payment recorded!', 'success')
      closePay()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
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

  const handleMark = async () => {
    if (!markingDebt) return
    const amount = parseFloat(markAmount)
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return }
    try {
      await createTx.mutateAsync({
        description: `Payment from ${markingDebt.fromName}`,
        amount,
        currency: markingDebt.currency,
        paidById: markingDebt.fromId,
        splits: [{ userId: currentUserId, amount }],
      })
      toast(`Payment from ${markingDebt.fromName} recorded!`, 'success')
      closeMark()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to record payment', 'error')
    }
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden mb-6">
        {owes.length > 0 && (
          <div className="bg-red-50 p-4 border-b last:border-b-0">
            <p className="font-semibold text-red-700 mb-3">
              You owe {totalByCurrency(owes)}
            </p>
            <div className="space-y-3">
              {owes.map((debt, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{debt.toName}</span>
                    <span className="text-sm font-semibold">{sym(debt.currency)}{debt.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPay(debt)}>
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      Pay in cash
                    </Button>
                    <VenmoButton
                      venmoLink={debt.venmoLink}
                      amount={debt.amount}
                      recipientName={debt.toName}
                      onAfterOpen={() => setVenmoConfirmingDebt(debt)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {owed.length > 0 && (
          <div className="bg-green-50 p-4">
            <p className="font-semibold text-green-700 mb-3">
              You're owed {totalByCurrency(owed)}
            </p>
            <div className="space-y-3">
              {owed.map((debt, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{debt.fromName}</span>
                    <span className="text-sm font-semibold">{sym(debt.currency)}{debt.amount.toFixed(2)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    onClick={() => { setMarkingDebt(debt); setMarkAmount(debt.amount.toFixed(2)) }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Mark as paid
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cash payment dialog */}
      <Dialog open={!!payingDebt} onOpenChange={open => { if (!open) closePay() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              How much are you paying <strong>{payingDebt?.toName}</strong>?
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount ({payingDebt?.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {payingDebt ? sym(payingDebt.currency) : '$'}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closePay} disabled={createTx.isPending}>Cancel</Button>
            <Button onClick={handlePay} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Venmo confirmation dialog */}
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
            <Button variant="outline" onClick={() => setVenmoConfirmingDebt(null)} disabled={createTx.isPending}>No</Button>
            <Button onClick={handleVenmoConfirm} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Yes, mark as paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as paid dialog */}
      <Dialog open={!!markingDebt} onOpenChange={open => { if (!open) closeMark() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              How much did <strong>{markingDebt?.fromName}</strong> pay you?
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount ({markingDebt?.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {markingDebt ? sym(markingDebt.currency) : '$'}
                </span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={markAmount}
                  onChange={e => setMarkAmount(e.target.value)}
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeMark} disabled={createTx.isPending}>Cancel</Button>
            <Button onClick={handleMark} disabled={createTx.isPending}>
              {createTx.isPending ? 'Recording...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
