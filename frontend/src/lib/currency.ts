export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'EUR'] as const
export type Currency = (typeof SUPPORTED_CURRENCIES)[number]

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  CAD: 'CA$',
  EUR: '€',
}

/** Default exchange rates: 1 USD = rate units of the foreign currency. */
export const DEFAULT_USD_RATES: Record<string, number> = {
  CAD: 1.39,
  EUR: 0.86,
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency
}

/** Convert a balance in the given currency to USD using 1 USD = rate foreign units. */
export function balanceToUsd(balance: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'USD') return balance
  const rate = rates[currency] ?? DEFAULT_USD_RATES[currency]
  return rate ? balance / rate : balance
}
