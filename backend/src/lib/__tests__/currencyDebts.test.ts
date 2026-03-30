import { describe, it, expect } from 'vitest'
import { computeDebtsPerCurrency, type MemberInfo, type TransactionInfo } from '../currencyDebts'

// All transaction and split amounts are in integer cents.

const members: MemberInfo[] = [
  { userId: 'a', name: 'Alice' },
  { userId: 'b', name: 'Bob' },
  { userId: 'c', name: 'Carol' },
]

describe('computeDebtsPerCurrency', () => {
  it('returns empty object when there are no transactions', () => {
    expect(computeDebtsPerCurrency([], members)).toEqual({})
  })

  it('returns only USD when all transactions are USD', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 3000, // $30.00
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
          { userId: 'c', amount: 1000 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result)).toEqual(['USD'])
    expect(result.USD.simplifiedDebts).toHaveLength(2)
    result.USD.simplifiedDebts.forEach(d => expect(d.toId).toBe('a'))
  })

  it('returns only CAD when all transactions are CAD', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'b',
        amount: 2000, // CA$20.00
        currency: 'CAD',
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result)).toEqual(['CAD'])
    expect(result.CAD.simplifiedDebts).toHaveLength(1)
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 1000 })
  })

  it('separates USD and CAD debts independently', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 2000, // $20 USD
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
        ],
      },
      {
        paidById: 'b',
        amount: 4000, // CA$40
        currency: 'CAD',
        splits: [
          { userId: 'a', amount: 2000 },
          { userId: 'b', amount: 2000 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result).sort()).toEqual(['CAD', 'USD'])
    expect(result.USD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 1000 })
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 2000 })
  })

  it('USD and CAD debts do not cancel each other out', () => {
    const txs: TransactionInfo[] = [
      { paidById: 'a', amount: 1000, currency: 'USD', splits: [{ userId: 'b', amount: 1000 }] },
      { paidById: 'b', amount: 1000, currency: 'CAD', splits: [{ userId: 'a', amount: 1000 }] },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(result.USD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 1000 })
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 1000 })
  })

  it('correctly computes raw balances in cents', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 3000,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 1000 },
          { userId: 'b', amount: 1000 },
          { userId: 'c', amount: 1000 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    const usdBalances = Object.fromEntries(result.USD.rawBalances.map(b => [b.userId, b.balance]))
    expect(usdBalances['a']).toBe(2000)  // exact integer, not toBeCloseTo
    expect(usdBalances['b']).toBe(-1000)
    expect(usdBalances['c']).toBe(-1000)
  })

  it('handles multiple transactions accumulating without float error', () => {
    // Classic float trap: $0.10 paid 3 times = $0.30 exactly
    // In floats: 10 + 10 + 10 = 30 (fine as ints), but 0.1 + 0.1 + 0.1 = 0.30000000000000004
    const txs: TransactionInfo[] = [
      { paidById: 'a', amount: 10, currency: 'USD', splits: [{ userId: 'b', amount: 10 }] },
      { paidById: 'a', amount: 10, currency: 'USD', splits: [{ userId: 'b', amount: 10 }] },
      { paidById: 'a', amount: 10, currency: 'USD', splits: [{ userId: 'b', amount: 10 }] },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    const balances = Object.fromEntries(result.USD.rawBalances.map(b => [b.userId, b.balance]))
    expect(balances['a']).toBe(30)   // exactly 30, not 30.000000000000004
    expect(balances['b']).toBe(-30)
    expect(Number.isInteger(balances['a'])).toBe(true)
    expect(Number.isInteger(balances['b'])).toBe(true)
  })

  it('settlement amounts are all integers', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 1000,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 333 },
          { userId: 'b', amount: 333 },
          { userId: 'c', amount: 334 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    for (const d of result.USD.simplifiedDebts) {
      expect(Number.isInteger(d.amount)).toBe(true)
    }
  })

  it('total settled equals total owed — strict integer equality', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 10000, // $100.00
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 1429 },
          { userId: 'b', amount: 1429 },
          { userId: 'c', amount: 1429 },
          { userId: 'd', amount: 1429 },
          { userId: 'e', amount: 1428 },
          { userId: 'f', amount: 1428 },
          { userId: 'g', amount: 1428 },
        ],
      },
    ]
    const extendedMembers = [
      ...members,
      { userId: 'd', name: 'Dave' },
      { userId: 'e', name: 'Eve' },
      { userId: 'f', name: 'Frank' },
      { userId: 'g', name: 'Grace' },
    ]
    const result = computeDebtsPerCurrency(txs, extendedMembers)
    const totalSettled = result.USD.simplifiedDebts.reduce((sum, d) => sum + d.amount, 0)
    // Alice's balance = 10000 - 1429 = 8571 cents
    expect(totalSettled).toBe(8571)
    expect(Number.isInteger(totalSettled)).toBe(true)
  })
})
