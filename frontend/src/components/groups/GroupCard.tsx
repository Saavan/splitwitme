import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { Group } from '@/hooks/useGroups'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  group: Group
}

export function GroupCard({ group }: GroupCardProps) {
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
              <p className={cn(
                'font-semibold',
                group.netBalance > 0 && 'text-green-600',
                group.netBalance < 0 && 'text-red-600',
                group.netBalance === 0 && 'text-muted-foreground'
              )}>
                {group.netBalance === 0 ? 'settled up' : (
                  `${group.netBalance > 0 ? '+' : ''}$${Math.abs(group.netBalance).toFixed(2)}`
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
