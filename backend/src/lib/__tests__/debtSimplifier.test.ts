import { describe, it, expect } from 'vitest'
import { simplifyDebts, type Balance } from '../debtSimplifier'

// All balances and settlement amounts are in integer cents.

describe('simplifyDebts', () => {
  it('returns empty for no balances', () => {
    expect(simplifyDebts([])).toEqual([])
  })

  it('returns empty when all balances are zero', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 0 },
      { userId: 'b', name: 'Bob', balance: 0 },
    ]
    expect(simplifyDebts(balances)).toEqual([])
  })

  it('two people: A is owed 500 cents ($5.00)', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 500 },
      { userId: 'b', name: 'Bob', balance: -500 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      fromId: 'b', fromName: 'Bob',
      toId: 'a', toName: 'Alice',
      amount: 500,
    })
  })

  it('three people equal split: A paid 3000 cents ($30.00) for all', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 2000 },  // paid 3000, owes 1000 → +2000
      { userId: 'b', name: 'Bob', balance: -1000 },
      { userId: 'c', name: 'Carol', balance: -1000 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(2)
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBe(2000) // strict integer equality
    result.forEach(s => expect(s.toId).toBe('a'))
  })

  it('cross-debts simplify: A owes B $10, B owes C $10 → A pays C $10', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: -1000 },
      { userId: 'b', name: 'Bob', balance: 0 },
      { userId: 'c', name: 'Carol', balance: 1000 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ fromId: 'a', toId: 'c', amount: 1000 })
  })

  it('minimises settlements for 4 people', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'A', balance: 1500 },
      { userId: 'b', name: 'B', balance: 500 },
      { userId: 'c', name: 'C', balance: -1000 },
      { userId: 'd', name: 'D', balance: -1000 },
    ]
    const result = simplifyDebts(balances)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  // --- Integer arithmetic correctness ---

  it('all settlement amounts are integers (no floating-point residue)', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'A', balance: 667 },  // $6.67
      { userId: 'b', name: 'B', balance: -333 }, // $3.33
      { userId: 'c', name: 'C', balance: -334 }, // $3.34
    ]
    const result = simplifyDebts(balances)
    for (const s of result) {
      expect(Number.isInteger(s.amount)).toBe(true)
    }
    // Total settled must equal exactly what was owed
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBe(667)
  })

  it('amounts that would produce 0.1+0.2 float error work exactly in cents', () => {
    // 10 + 20 = 30 exactly as integers; in floats 0.1 + 0.2 = 0.30000000000000004
    const balances: Balance[] = [
      { userId: 'a', name: 'A', balance: 30 },
      { userId: 'b', name: 'B', balance: -10 },
      { userId: 'c', name: 'C', balance: -20 },
    ]
    const result = simplifyDebts(balances)
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBe(30) // not 29.999... or 30.000...001
    for (const s of result) {
      expect(Number.isInteger(s.amount)).toBe(true)
    }
  })

  it('7-way split without float leakage', () => {
    // $100.00 = 10000 cents / 7 people
    // 6 people owe 1428 cents, 1 person owes 1429 cents (10000 - 6*1428 = 1432... wait)
    // Actually: 10000 / 7 = 1428.57, floor = 1428, remainder = 10000 - 7*1428 = 10000 - 9996 = 4
    // So 4 people owe 1429 cents, 3 people owe 1428 cents
    // Payer (a) is owed: 10000 - 1429 = 8571 cents (their own share is 1429)
    const balances: Balance[] = [
      { userId: 'a', name: 'Payer', balance: 8571 },
      { userId: 'b', name: 'B', balance: -1429 },
      { userId: 'c', name: 'C', balance: -1429 },
      { userId: 'd', name: 'D', balance: -1429 },
      { userId: 'e', name: 'E', balance: -1428 },
      { userId: 'f', name: 'F', balance: -1428 },
      { userId: 'g', name: 'G', balance: -1428 },
    ]
    const result = simplifyDebts(balances)
    for (const s of result) {
      expect(Number.isInteger(s.amount)).toBe(true)
      expect(s.amount).toBeGreaterThan(0)
    }
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBe(8571)
  })

  it('accumulated float scenario: 3 transactions each $0.10 (10 cents each)', () => {
    // 3 × 10 cents = 30 cents exactly; in float: 3 × 0.1 = 0.30000000000000004
    const balances: Balance[] = [
      { userId: 'a', name: 'A', balance: 30 },
      { userId: 'b', name: 'B', balance: -30 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(30)
    expect(Number.isInteger(result[0].amount)).toBe(true)
  })
})
