import { describe, it, expect } from 'vitest'
import { buildVenmoUrl, buildVenmoDeepLink } from '../venmo'

describe('buildVenmoUrl', () => {
  it('generates correct https venmo URL', () => {
    const url = buildVenmoUrl('johndoe', 25, 'SplitWitMe: Road Trip')
    expect(url).toContain('https://venmo.com')
    expect(url).toContain('txn=pay')
    expect(url).toContain('recipients=johndoe')
    expect(url).toContain('amount=25.00')
  })

  it('encodes spaces in note correctly', () => {
    const url = buildVenmoUrl('user123', 10, 'SplitWitMe: Road Trip')
    // URLSearchParams encodes spaces as +
    expect(url).toContain('note=')
    // Replace + back to spaces before decoding, as URLSearchParams uses + for spaces
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('SplitWitMe: Road Trip')
  })

  it('formats amount with two decimal places', () => {
    const url = buildVenmoUrl('user', 10.5, 'test')
    expect(url).toContain('amount=10.50')
  })

  it('handles integer amounts', () => {
    const url = buildVenmoUrl('user', 100, 'test')
    expect(url).toContain('amount=100.00')
  })
})

describe('buildVenmoDeepLink', () => {
  it('generates correct venmo:// deep link', () => {
    const url = buildVenmoDeepLink('johndoe', 25, 'SplitWitMe: test')
    expect(url).toContain('venmo://paycharge')
    expect(url).toContain('recipients=johndoe')
    expect(url).toContain('amount=25.00')
  })
})
