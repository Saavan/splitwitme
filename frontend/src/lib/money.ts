/** Convert a dollar amount (potentially floating-point) to integer cents. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/** Convert integer cents to a dollar amount. */
export function toDollars(cents: number): number {
  return cents / 100
}

/**
 * Split a dollar amount equally among `count` people.
 * Returns amounts in dollars, rounded down to the cent.
 * Remaining cents are distributed randomly so the total is exact.
 */
export function splitEqually(totalDollars: number, count: number): number[] {
  if (count <= 0 || totalDollars <= 0) return []
  const totalCents = toCents(totalDollars)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  // Randomly decide which indices get the extra cent
  const indices = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5)
  const bumped = new Set(indices.slice(0, remainder))
  return Array.from({ length: count }, (_, i) => toDollars(bumped.has(i) ? baseCents + 1 : baseCents))
}

/**
 * Sum split amounts in cents to avoid float accumulation.
 * Returns the total in dollars.
 */
export function sumSplits(amounts: number[]): number {
  return toDollars(amounts.reduce((sum, a) => sum + toCents(a), 0))
}

/**
 * Check whether split amounts (dollars) exactly equal a total (dollars),
 * using integer cent comparison.
 */
export function splitsMatchTotal(amounts: number[], total: number): boolean {
  const splitCents = amounts.reduce((sum, a) => sum + toCents(a), 0)
  return splitCents === toCents(total)
}

// --- Currency conversion & debt simplification ---

export interface Balance {
  userId: string
  name: string
  balance: number // dollars
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number // dollars
}

/** Greedy debt simplification — mirrors the backend algorithm, works in integer cents. */
export function simplifyDebts(balances: Balance[]): Settlement[] {
  const creditors = balances.map(b => ({ ...b, balance: toCents(b.balance) })).filter(b => b.balance > 0)
  const debtors = balances.map(b => ({ ...b, balance: toCents(b.balance) })).filter(b => b.balance < 0)

  creditors.sort((a, b) => b.balance - a.balance)
  debtors.sort((a, b) => a.balance - b.balance)

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance))

    if (amount > 0) {
      settlements.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amount: toDollars(amount),
      })
    }

    creditor.balance -= amount
    debtor.balance += amount
    if (creditor.balance <= 0) ci++
    if (debtor.balance >= 0) di++
  }

  return settlements
}

/**
 * Combine multi-currency raw balances into a single USD view using the given
 * 1 USD = usdToCadRate CAD exchange rate, then re-simplify debts.
 */
export function combineCurrencies(
  perCurrency: Record<string, { rawBalances: Balance[] }>,
  usdToCadRate: number
): Settlement[] {
  const combined = new Map<string, { name: string; balance: number }>()

  for (const [currency, { rawBalances }] of Object.entries(perCurrency)) {
    for (const rb of rawBalances) {
      // Convert each currency's balance to USD
      const usdBalance = currency === 'CAD' ? rb.balance / usdToCadRate : rb.balance
      const existing = combined.get(rb.userId)
      if (existing) {
        existing.balance += usdBalance
      } else {
        combined.set(rb.userId, { name: rb.name, balance: usdBalance })
      }
    }
  }

  const balances: Balance[] = Array.from(combined.entries()).map(([userId, { name, balance }]) => ({
    userId,
    name,
    balance,
  }))

  return simplifyDebts(balances)
}
