export function buildVenmoUrl(
  venmoHandle: string,
  amount: number,
  note: string
): string {
  const params = new URLSearchParams({
    txn: 'pay',
    recipients: venmoHandle,
    amount: amount.toFixed(2),
    note,
  })
  return `https://venmo.com/?${params.toString()}`
}

export function buildVenmoDeepLink(
  venmoHandle: string,
  amount: number,
  note: string
): string {
  const params = new URLSearchParams({
    txn: 'pay',
    recipients: venmoHandle,
    amount: amount.toFixed(2),
    note,
  })
  return `venmo://paycharge?${params.toString()}`
}
