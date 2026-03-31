import { Button } from '@/components/ui/button'

interface VenmoButtonProps {
  venmoLink: string | null
  amount: number
  recipientName: string
  onAfterOpen?: () => void
}

export function VenmoButton({ venmoLink, amount, recipientName, onAfterOpen }: VenmoButtonProps) {
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

  const handleClick = () => {
    window.open(venmoLink, '_blank', 'noopener,noreferrer')
    onAfterOpen?.()
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-blue-500 text-blue-600 hover:bg-blue-50"
      onClick={handleClick}
    >
      <span className="hidden sm:inline">Pay ${amount.toFixed(2)} on </span>Venmo
    </Button>
  )
}
