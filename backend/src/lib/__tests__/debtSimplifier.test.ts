import { describe, it, expect } from 'vitest'
import { simplifyDebts, type Balance } from '../debtSimplifier'

describe('simplifyDebts', () => {
  it('handles empty balances', () => {
    expect(simplifyDebts([])).toEqual([])
  })

  it('handles all-zero balances', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 0 },
      { userId: 'b', name: 'Bob', balance: 0 },
    ]
    expect(simplifyDebts(balances)).toEqual([])
  })

  it('two people: A paid $10, B owes $5 net', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 5 },
      { userId: 'b', name: 'Bob', balance: -5 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      fromId: 'b',
      fromName: 'Bob',
      toId: 'a',
      toName: 'Alice',
      amount: 5,
    })
  })

  it('three people equal split: A paid $30 for all', () => {
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 20 },  // paid $30, owes $10 = +20
      { userId: 'b', name: 'Bob', balance: -10 },
      { userId: 'c', name: 'Carol', balance: -10 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(2)
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(Math.abs(total - 20)).toBeLessThan(0.01)
    // All settlements should be to Alice
    result.forEach(s => expect(s.toId).toBe('a'))
  })

  it('cross-debts simplify to fewer transactions', () => {
    // A owes B $10, B owes C $10 => A pays C $10 directly
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: -10 },
      { userId: 'b', name: 'Bob', balance: 0 },
      { userId: 'c', name: 'Carol', balance: 10 },
    ]
    const result = simplifyDebts(balances)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      fromId: 'a',
      toId: 'c',
      amount: 10,
    })
  })

  it('handles rounding correctly', () => {
    // $10 split among 3 people
    const balances: Balance[] = [
      { userId: 'a', name: 'Alice', balance: 6.67 },  // paid $10, owes $3.33
      { userId: 'b', name: 'Bob', balance: -3.33 },
      { userId: 'c', name: 'Carol', balance: -3.34 },
    ]
    const result = simplifyDebts(balances)
    expect(result.length).toBeGreaterThan(0)
    // Total settlements should sum to ~6.67
    const total = result.reduce((sum, s) => sum + s.amount, 0)
    expect(Math.abs(total - 6.67)).toBeLessThan(0.02)
  })

  it('minimizes number of settlements', () => {
    // 4 people with complex debts - should simplify
    const balances: Balance[] = [
      { userId: 'a', name: 'A', balance: 15 },
      { userId: 'b', name: 'B', balance: 5 },
      { userId: 'c', name: 'C', balance: -10 },
      { userId: 'd', name: 'D', balance: -10 },
    ]
    const result = simplifyDebts(balances)
    // Should need at most 3 settlements (N-1 is optimal)
    expect(result.length).toBeLessThanOrEqual(3)
  })
})
