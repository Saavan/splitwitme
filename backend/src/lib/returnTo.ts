export function validateReturnTo(path: string | undefined): string | null {
  if (!path) return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (path.includes('://')) return null
  if (path === '/login') return null
  return path
}
