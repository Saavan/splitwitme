export interface Balance {
  userId: string
  name: string
  balance: number // positive = owed money, negative = owes money
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export function simplifyDebts(balances: Balance[]): Settlement[] {
  const creditors = balances.filter(b => b.balance > 0.001).map(b => ({ ...b }))
  const debtors = balances.filter(b => b.balance < -0.001).map(b => ({ ...b }))

  creditors.sort((a, b) => b.balance - a.balance)
  debtors.sort((a, b) => a.balance - b.balance) // most negative first

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance))

    if (amount > 0.001) {
      settlements.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      })
    }

    creditor.balance -= amount
    debtor.balance += amount

    if (creditor.balance < 0.001) ci++
    if (debtor.balance > -0.001) di++
  }

  return settlements
}
