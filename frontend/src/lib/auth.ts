export type SignInOptions = {
  returnTo?: string
  joinCode?: string
  inviteToken?: string
}

export function validateReturnTo(path: string | undefined): string | null {
  if (!path) return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path.includes('://')) return null
  if (path === '/login') return null
  return path
}

export function buildSignInUrl(options: SignInOptions = {}, apiBase = ''): string {
  const params = new URLSearchParams()
  if (options.joinCode) params.set('joinCode', options.joinCode)
  if (options.inviteToken) params.set('inviteToken', options.inviteToken)
  const returnTo = validateReturnTo(options.returnTo)
  if (returnTo) params.set('returnTo', returnTo)
  const query = params.toString()
  return `${apiBase}/auth/google${query ? `?${query}` : ''}`
}

export function signInWithGoogle(options: SignInOptions = {}): void {
  const apiBase = import.meta.env.VITE_API_URL || ''
  window.location.href = buildSignInUrl(options, apiBase)
}
