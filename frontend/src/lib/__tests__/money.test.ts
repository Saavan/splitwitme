import { describe, it, expect } from 'vitest'
import { toCents, toDollars, splitEqually, sumSplits, splitsMatchTotal } from '../money'

describe('toCents', () => {
  it('converts whole dollar amounts', () => {
    expect(toCents(10)).toBe(1000)
    expect(toCents(0)).toBe(0)
    expect(toCents(100)).toBe(10000)
  })

  it('converts dollar amounts with cents', () => {
    expect(toCents(10.50)).toBe(1050)
    expect(toCents(3.33)).toBe(333)
    expect(toCents(3.34)).toBe(334)
  })

  it('rounds floating-point inputs correctly', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754 — toCents should give 30
    expect(toCents(0.1 + 0.2)).toBe(30)
    // $9.99 stored as float can drift
    expect(toCents(9.99)).toBe(999)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(toCents(3.33))).toBe(true)
    expect(Number.isInteger(toCents(1.01))).toBe(true)
    expect(Number.isInteger(toCents(99.99))).toBe(true)
  })
})

describe('toDollars', () => {
  it('converts integer cents to dollars', () => {
    expect(toDollars(1000)).toBe(10)
    expect(toDollars(1050)).toBe(10.5)
    expect(toDollars(333)).toBeCloseTo(3.33)
  })
})

describe('splitEqually', () => {
  it('splits evenly divisible amounts exactly', () => {
    const result = splitEqually(10, 2)
    expect(result).toHaveLength(2)
    expect(result.every(a => a === 5)).toBe(true)
  })

  it('splits $10 among 3 people: amounts are 3.33 and 3.34', () => {
    const result = splitEqually(10, 3)
    expect(result).toHaveLength(3)
    // Each amount must be either $3.33 or $3.34
    result.forEach(a => {
      expect([3.33, 3.34]).toContain(a)
    })
  })

  it('total always equals the original amount — no float leakage', () => {
    const cases = [
      [10, 3],
      [100, 7],
      [1, 3],
      [0.01, 1],
      [99.99, 4],
      [33.33, 6],
    ] as [number, number][]

    for (const [total, count] of cases) {
      const result = splitEqually(total, count)
      const sum = result.reduce((s, a) => s + toCents(a), 0)
      expect(sum).toBe(toCents(total))
    }
  })

  it('each amount is a valid cent value — two decimal places max', () => {
    const result = splitEqually(10, 3)
    result.forEach(a => {
      expect(Number.isInteger(toCents(a))).toBe(true)
    })
  })

  it('all amounts within 1 cent of each other', () => {
    const result = splitEqually(100, 7)
    const min = Math.min(...result.map(toCents))
    const max = Math.max(...result.map(toCents))
    expect(max - min).toBeLessThanOrEqual(1)
  })

  it('returns empty array for zero count or zero amount', () => {
    expect(splitEqually(10, 0)).toEqual([])
    expect(splitEqually(0, 3)).toEqual([])
  })

  it('handles $0.01 for 1 person', () => {
    const result = splitEqually(0.01, 1)
    expect(result).toEqual([0.01])
  })
})

describe('sumSplits', () => {
  it('sums dollar amounts using integer cents', () => {
    // Classic float trap: 0.1 + 0.2 should be 0.30, not 0.30000000000000004
    expect(sumSplits([0.1, 0.2])).toBeCloseTo(0.3)
    expect(toCents(sumSplits([0.1, 0.2]))).toBe(30) // exact integer
  })

  it('returns exact dollar value for clean amounts', () => {
    expect(sumSplits([3.33, 3.33, 3.34])).toBe(10)
    expect(sumSplits([5, 5])).toBe(10)
  })

  it('returns 0 for empty array', () => {
    expect(sumSplits([])).toBe(0)
  })
})

describe('splitsMatchTotal', () => {
  it('returns true when splits exactly equal total', () => {
    expect(splitsMatchTotal([3.33, 3.33, 3.34], 10)).toBe(true)
    expect(splitsMatchTotal([5, 5], 10)).toBe(true)
  })

  it('returns false when splits do not equal total', () => {
    expect(splitsMatchTotal([3.33, 3.33, 3.33], 10)).toBe(false)
    expect(splitsMatchTotal([5, 4], 10)).toBe(false)
  })

  it('handles floating-point inputs without false negatives', () => {
    // 0.1 + 0.2 !== 0.3 in floats, but splitsMatchTotal uses cents
    expect(splitsMatchTotal([0.1, 0.2], 0.3)).toBe(true)
  })
})
