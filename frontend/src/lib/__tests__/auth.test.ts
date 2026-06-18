import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateReturnTo, buildSignInUrl, signInWithGoogle } from '../auth'

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

describe('buildSignInUrl', () => {
  it('returns bare auth path with no options', () => {
    expect(buildSignInUrl()).toBe('/auth/google')
  })

  it('prefixes api base when provided', () => {
    expect(buildSignInUrl({ joinCode: 'abc' }, 'http://localhost:3001')).toBe(
      'http://localhost:3001/auth/google?joinCode=abc'
    )
  })

  it('includes joinCode only', () => {
    expect(buildSignInUrl({ joinCode: 'abc' })).toBe('/auth/google?joinCode=abc')
  })

  it('includes inviteToken only', () => {
    expect(buildSignInUrl({ inviteToken: 'tok' })).toBe('/auth/google?inviteToken=tok')
  })

  it('includes encoded returnTo when valid', () => {
    expect(buildSignInUrl({ returnTo: '/groups/g-1' })).toBe(
      '/auth/google?returnTo=%2Fgroups%2Fg-1'
    )
  })

  it('omits invalid returnTo from query', () => {
    expect(buildSignInUrl({ returnTo: '//evil.com', joinCode: 'abc' })).toBe(
      '/auth/google?joinCode=abc'
    )
  })

  it('includes all params together', () => {
    const url = buildSignInUrl({
      joinCode: 'abc',
      inviteToken: 'tok',
      returnTo: '/groups/g-1',
    })
    expect(url).toContain('joinCode=abc')
    expect(url).toContain('inviteToken=tok')
    expect(url).toContain('returnTo=%2Fgroups%2Fg-1')
  })

  it('URL-encodes returnTo with query string in path', () => {
    expect(buildSignInUrl({ returnTo: '/groups/g-1?tab=debts' })).toBe(
      '/auth/google?returnTo=%2Fgroups%2Fg-1%3Ftab%3Ddebts'
    )
  })
})

describe('signInWithGoogle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets window.location.href to the built sign-in URL', () => {
    const location = { href: '' }
    vi.stubGlobal('location', location)

    signInWithGoogle({ joinCode: 'abc', returnTo: '/join/abc' })

    expect(location.href).toBe('/auth/google?joinCode=abc&returnTo=%2Fjoin%2Fabc')
  })
})
