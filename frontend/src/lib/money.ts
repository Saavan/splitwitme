/** Convert a dollar amount (potentially floating-point) to integer cents. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/** Convert integer cents to a dollar amount. */
export function toDollars(cents: number): number {
  return cents / 100
}

/**
 * Split a dollar amount equally among `count` people.
 * Returns amounts in dollars, rounded down to the cent.
 * Remaining cents are distributed randomly so the total is exact.
 */
export function splitEqually(totalDollars: number, count: number): number[] {
  if (count <= 0 || totalDollars <= 0) return []
  const totalCents = toCents(totalDollars)
  const baseCents = Math.floor(totalCents / count)
  const remainder = totalCents - baseCents * count
  // Randomly decide which indices get the extra cent
  const indices = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5)
  const bumped = new Set(indices.slice(0, remainder))
  return Array.from({ length: count }, (_, i) => toDollars(bumped.has(i) ? baseCents + 1 : baseCents))
}

/**
 * Sum split amounts in cents to avoid float accumulation.
 * Returns the total in dollars.
 */
export function sumSplits(amounts: number[]): number {
  return toDollars(amounts.reduce((sum, a) => sum + toCents(a), 0))
}

/**
 * Check whether split amounts (dollars) exactly equal a total (dollars),
 * using integer cent comparison.
 */
export function splitsMatchTotal(amounts: number[], total: number): boolean {
  const splitCents = amounts.reduce((sum, a) => sum + toCents(a), 0)
  return splitCents === toCents(total)
}
