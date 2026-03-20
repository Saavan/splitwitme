import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateGroup } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Navbar } from '@/components/layout/Navbar'
import { useToast } from '@/components/ui/toast'

export function NewGroup() {
  const [name, setName] = useState('')
  const createGroup = useCreateGroup()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const group = await createGroup.mutateAsync(name)
      navigate(`/groups/${group.id}`)
    } catch {
      toast('Failed to create group', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Create New Group</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group name</Label>
            <Input
              id="name"
              placeholder="e.g. Road Trip 2024"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
