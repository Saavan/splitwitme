import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Group } from '@/hooks/useGroups'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', CAD: 'CA$' }

interface GroupCardProps {
  group: Group
}

export function GroupCard({ group }: GroupCardProps) {
  const nonZeroBalances = Object.entries(group.netBalances).filter(([, v]) => Math.abs(v) > 0.001)

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
              <p className="text-xs text-muted-foreground mb-1">your balance</p>
              {nonZeroBalances.length === 0 ? (
                <p className="font-semibold text-muted-foreground">settled up</p>
              ) : (
                <div className="space-y-0.5">
                  {nonZeroBalances.map(([currency, balance]) => (
                    <p key={currency} className={cn(
                      'font-semibold text-sm',
                      balance > 0 && 'text-green-600',
                      balance < 0 && 'text-red-600',
                    )}>
                      {balance > 0 ? '+' : ''}{CURRENCY_SYMBOL[currency] ?? currency}{Math.abs(balance).toFixed(2)}
                    </p>
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
