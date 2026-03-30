import { simplifyDebts, type Balance, type Settlement } from './debtSimplifier'

export const SUPPORTED_CURRENCIES = ['USD', 'CAD'] as const
export type Currency = typeof SUPPORTED_CURRENCIES[number]

export interface MemberInfo {
  userId: string
  name: string
}

export interface TransactionInfo {
  paidById: string
  amount: number    // integer cents
  currency: string
  splits: Array<{ userId: string; amount: number }> // amounts in integer cents
}

export interface RawBalance {
  userId: string
  name: string
  balance: number  // integer cents
}

export interface CurrencyDebtsResult {
  rawBalances: RawBalance[]
  simplifiedDebts: Settlement[] // amounts in integer cents
}

export function computeDebtsPerCurrency(
  transactions: TransactionInfo[],
  members: MemberInfo[]
): Record<string, CurrencyDebtsResult> {
  const currencies = [...new Set(transactions.map(t => t.currency))]
  const result: Record<string, CurrencyDebtsResult> = {}

  for (const currency of currencies) {
    const txs = transactions.filter(t => t.currency === currency)

    // Balances tracked in integer cents throughout — no floating-point accumulation
    const balanceMap = new Map<string, { name: string; balance: number }>()
    for (const { userId, name } of members) {
      balanceMap.set(userId, { name, balance: 0 })
    }

    for (const tx of txs) {
      for (const split of tx.splits) {
        const payer = balanceMap.get(tx.paidById)
        if (payer) payer.balance += split.amount

        const splitUser = balanceMap.get(split.userId)
        if (splitUser) splitUser.balance -= split.amount
      }
    }

    const rawBalances: RawBalance[] = Array.from(balanceMap.entries()).map(([userId, { name, balance }]) => ({
      userId,
      name,
      balance, // integer cents
    }))

    const balancesForSimplifier: Balance[] = rawBalances.map(b => ({
      userId: b.userId,
      name: b.name,
      balance: b.balance,
    }))

    result[currency] = {
      rawBalances,
      simplifiedDebts: simplifyDebts(balancesForSimplifier),
    }
  }

  return result
}
