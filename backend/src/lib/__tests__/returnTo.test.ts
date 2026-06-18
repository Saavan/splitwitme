import { describe, it, expect } from 'vitest'
import { validateReturnTo } from '../returnTo'

describe('validateReturnTo', () => {
  it('accepts valid join path', () => {
    expect(validateReturnTo('/join/abc123')).toBe('/join/abc123')
  })

  it('accepts valid group path', () => {
    expect(validateReturnTo('/groups/g-1')).toBe('/groups/g-1')
  })

  it('accepts valid path with query string', () => {
    expect(validateReturnTo('/invite/token?ref=email')).toBe('/invite/token?ref=email')
  })

  it('rejects undefined and empty string', () => {
    expect(validateReturnTo(undefined)).toBeNull()
    expect(validateReturnTo('')).toBeNull()
  })

  it('rejects /login to prevent redirect loops', () => {
    expect(validateReturnTo('/login')).toBeNull()
  })

  it('rejects protocol-relative URLs', () => {
    expect(validateReturnTo('//evil.com')).toBeNull()
  })

  it('rejects absolute URLs', () => {
    expect(validateReturnTo('https://evil.com')).toBeNull()
  })

  it('rejects scheme injection', () => {
    expect(validateReturnTo('javascript:alert(1)')).toBeNull()
  })

  it('rejects paths without leading slash', () => {
    expect(validateReturnTo('groups/g-1')).toBeNull()
  })
})
