import { Link, useNavigate } from 'react-router-dom'
import { LogOut, SplitSquareHorizontal } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function Navbar() {
  const { data: user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await apiClient.post('/auth/logout')
    qc.clear()
    navigate('/login')
  }

  return (
    <nav className="border-b bg-background">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <SplitSquareHorizontal className="h-5 w-5" />
          SplitWitMe
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : (
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              )}
            </Avatar>
            <span className="text-sm hidden sm:block">{user.name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
