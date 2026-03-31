import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Group } from '@/hooks/useGroups'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toCents, toDollars } from '@/lib/money'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'CA$' }
const DEFAULT_USD_TO_CAD = 1.39

interface GroupCardProps {
  group: Group
}

export function GroupCard({ group }: GroupCardProps) {
  const nonZeroBalances = Object.entries(group.netBalances).filter(([, v]) => Math.abs(v) > 0.001)
  const isMultiCurrency = nonZeroBalances.length > 1

  // When multiple currencies, combine into a single USD balance using default rate
  const combinedUsdBalance: number | null = isMultiCurrency
    ? toDollars(
        nonZeroBalances.reduce((sum, [currency, balance]) => {
          const usdBalance = currency === 'CAD' ? balance / DEFAULT_USD_TO_CAD : balance
          return sum + toCents(usdBalance)
        }, 0)
      )
    : null

  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-lg">{group.name}</h2>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Users className="h-3.5 w-3.5" />
                <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="text-right">
              {nonZeroBalances.length === 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mb-1">your balance</p>
                  <p className="font-semibold text-muted-foreground">settled up</p>
                </>
              ) : isMultiCurrency && combinedUsdBalance !== null ? (
                <>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {combinedUsdBalance > 0 ? 'you are owed' : 'you owe'}
                  </p>
                  <p className={cn(
                    'font-semibold text-sm',
                    combinedUsdBalance > 0 && 'text-green-600',
                    combinedUsdBalance < 0 && 'text-red-600',
                  )}>
                    ~${Math.abs(combinedUsdBalance).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">USD (converted)</p>
                </>
              ) : (
                <div className="space-y-1">
                  {nonZeroBalances.map(([currency, balance]) => (
                    <div key={currency}>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {balance > 0 ? 'you are owed' : 'you owe'}
                      </p>
                      <p className={cn(
                        'font-semibold text-sm',
                        balance > 0 && 'text-green-600',
                        balance < 0 && 'text-red-600',
                      )}>
                        {CURRENCY_SYMBOL[currency] ?? currency}{Math.abs(balance).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
