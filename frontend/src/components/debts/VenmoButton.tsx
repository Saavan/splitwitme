import { Button } from '@/components/ui/button'

interface VenmoButtonProps {
  venmoLink: string | null
  amount: number
  recipientName: string
}

export function VenmoButton({ venmoLink, amount, recipientName }: VenmoButtonProps) {
  if (!venmoLink) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title={`${recipientName} hasn't set their Venmo handle`}
        className="opacity-50 cursor-not-allowed"
      >
        Pay on Venmo
      </Button>
    )
  }

  return (
    <a href={venmoLink} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
        Pay ${amount.toFixed(2)} on Venmo
      </Button>
    </a>
  )
}
