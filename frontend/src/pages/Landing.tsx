import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useGroups } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { GroupCard } from '@/components/groups/GroupCard'
import { Navbar } from '@/components/layout/Navbar'

export function Landing() {
  const { data: groups, isLoading } = useGroups()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Groups</h1>
          <Link to="/groups/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No groups yet.</p>
            <p className="text-sm mt-1">Create a group to start splitting expenses!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups?.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
