export interface Balance {
  userId: string
  name: string
  balance: number // integer cents, positive = owed money, negative = owes money
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number // integer cents
}

export function simplifyDebts(balances: Balance[]): Settlement[] {
  // All arithmetic is integer cents — no floating-point risk
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }))
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b }))

  creditors.sort((a, b) => b.balance - a.balance)
  debtors.sort((a, b) => a.balance - b.balance) // most negative first

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance)) // integer cents

    if (amount > 0) {
      settlements.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amount, // integer cents
      })
    }

    creditor.balance -= amount
    debtor.balance += amount

    if (creditor.balance <= 0) ci++
    if (debtor.balance >= 0) di++
  }

  return settlements
}
