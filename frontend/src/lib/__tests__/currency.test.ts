import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOL,
  DEFAULT_USD_RATES,
  currencySymbol,
  balanceToUsd,
} from '../currency'

describe('SUPPORTED_CURRENCIES', () => {
  it('includes USD, CAD, and EUR', () => {
    expect(SUPPORTED_CURRENCIES).toEqual(['USD', 'CAD', 'EUR'])
  })
})

describe('currencySymbol', () => {
  it('returns correct symbols for supported currencies', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('CAD')).toBe('CA$')
    expect(currencySymbol('EUR')).toBe('€')
  })

  it('falls back to currency code for unknown currencies', () => {
    expect(currencySymbol('GBP')).toBe('GBP')
  })
})

describe('DEFAULT_USD_RATES', () => {
  it('defines default rates for CAD and EUR', () => {
    expect(DEFAULT_USD_RATES.CAD).toBe(1.39)
    expect(DEFAULT_USD_RATES.EUR).toBe(0.86)
  })
})

describe('balanceToUsd', () => {
  const rates = { CAD: 1.39, EUR: 0.86 }

  it('returns USD balance unchanged', () => {
    expect(balanceToUsd(100, 'USD', rates)).toBe(100)
  })

  it('converts CAD to USD using rate', () => {
    expect(balanceToUsd(139, 'CAD', rates)).toBeCloseTo(100)
  })

  it('converts EUR to USD using rate', () => {
    expect(balanceToUsd(86, 'EUR', rates)).toBeCloseTo(100)
  })

  it('uses default rates when not provided in rates map', () => {
    expect(balanceToUsd(86, 'EUR', {})).toBeCloseTo(100)
    expect(balanceToUsd(139, 'CAD', {})).toBeCloseTo(100)
  })
})
