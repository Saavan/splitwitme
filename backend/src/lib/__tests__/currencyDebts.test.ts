import { describe, it, expect } from 'vitest'
import { computeDebtsPerCurrency, type MemberInfo, type TransactionInfo } from '../currencyDebts'

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
        amount: 30,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 10 },
          { userId: 'b', amount: 10 },
          { userId: 'c', amount: 10 },
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
        amount: 20,
        currency: 'CAD',
        splits: [
          { userId: 'a', amount: 10 },
          { userId: 'b', amount: 10 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result)).toEqual(['CAD'])
    expect(result.CAD.simplifiedDebts).toHaveLength(1)
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 10 })
  })

  it('separates USD and CAD debts independently', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 20,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 10 },
          { userId: 'b', amount: 10 },
        ],
      },
      {
        paidById: 'b',
        amount: 40,
        currency: 'CAD',
        splits: [
          { userId: 'a', amount: 20 },
          { userId: 'b', amount: 20 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result).sort()).toEqual(['CAD', 'USD'])

    // USD: Bob owes Alice $10
    expect(result.USD.simplifiedDebts).toHaveLength(1)
    expect(result.USD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 10 })

    // CAD: Alice owes Bob CA$20
    expect(result.CAD.simplifiedDebts).toHaveLength(1)
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 20 })
  })

  it('USD and CAD debts do not cancel each other out', () => {
    // A is owed $10 USD by B, but A owes B CA$10
    // These should NOT net to zero — they are separate currencies
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 10,
        currency: 'USD',
        splits: [{ userId: 'b', amount: 10 }],
      },
      {
        paidById: 'b',
        amount: 10,
        currency: 'CAD',
        splits: [{ userId: 'a', amount: 10 }],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)

    // USD debt still exists: Bob owes Alice $10 USD
    expect(result.USD.simplifiedDebts).toHaveLength(1)
    expect(result.USD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a', amount: 10 })

    // CAD debt still exists: Alice owes Bob CA$10
    expect(result.CAD.simplifiedDebts).toHaveLength(1)
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b', amount: 10 })
  })

  it('correctly computes raw balances per currency', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 30,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 10 },
          { userId: 'b', amount: 10 },
          { userId: 'c', amount: 10 },
        ],
      },
      {
        paidById: 'b',
        amount: 60,
        currency: 'CAD',
        splits: [
          { userId: 'a', amount: 20 },
          { userId: 'b', amount: 20 },
          { userId: 'c', amount: 20 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)

    const usdBalances = Object.fromEntries(result.USD.rawBalances.map(b => [b.userId, b.balance]))
    expect(usdBalances['a']).toBeCloseTo(20)
    expect(usdBalances['b']).toBeCloseTo(-10)
    expect(usdBalances['c']).toBeCloseTo(-10)

    const cadBalances = Object.fromEntries(result.CAD.rawBalances.map(b => [b.userId, b.balance]))
    expect(cadBalances['a']).toBeCloseTo(-20)
    expect(cadBalances['b']).toBeCloseTo(40)
    expect(cadBalances['c']).toBeCloseTo(-20)
  })

  it('handles multiple transactions in the same currency correctly', () => {
    const txs: TransactionInfo[] = [
      {
        paidById: 'a',
        amount: 20,
        currency: 'USD',
        splits: [
          { userId: 'a', amount: 10 },
          { userId: 'b', amount: 10 },
        ],
      },
      {
        paidById: 'b',
        amount: 30,
        currency: 'USD',
        splits: [
          { userId: 'b', amount: 10 },
          { userId: 'c', amount: 20 },
        ],
      },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result)).toEqual(['USD'])

    const usdBalances = Object.fromEntries(result.USD.rawBalances.map(b => [b.userId, b.balance]))
    // Alice: paid $20, owes $10 → net +10
    expect(usdBalances['a']).toBeCloseTo(10)
    // Bob: paid $30, owes $10 (to A) + $10 (own split) → net +10
    expect(usdBalances['b']).toBeCloseTo(10)
    // Carol: owes $20 → net -20
    expect(usdBalances['c']).toBeCloseTo(-20)

    const total = result.USD.simplifiedDebts.reduce((sum, d) => sum + d.amount, 0)
    expect(total).toBeCloseTo(20)
  })

  it('three-currency scenario tracks all independently', () => {
    // Hypothetical: if we added a third currency
    const txs: TransactionInfo[] = [
      { paidById: 'a', amount: 10, currency: 'USD', splits: [{ userId: 'b', amount: 10 }] },
      { paidById: 'a', amount: 10, currency: 'CAD', splits: [{ userId: 'b', amount: 10 }] },
      { paidById: 'b', amount: 10, currency: 'EUR', splits: [{ userId: 'a', amount: 10 }] },
    ]
    const result = computeDebtsPerCurrency(txs, members)
    expect(Object.keys(result).sort()).toEqual(['CAD', 'EUR', 'USD'])
    expect(result.USD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a' })
    expect(result.CAD.simplifiedDebts[0]).toMatchObject({ fromId: 'b', toId: 'a' })
    expect(result.EUR.simplifiedDebts[0]).toMatchObject({ fromId: 'a', toId: 'b' })
  })
})
