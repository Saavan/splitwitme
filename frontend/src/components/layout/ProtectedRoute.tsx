import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { VenmoPromptDialog, hasBeenPrompted } from '@/components/VenmoPromptDialog'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useAuth()
  const location = useLocation()
  const [prompted, setPrompted] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  const showVenmoPrompt = !prompted && user.venmoHandle === null && !hasBeenPrompted(user.id)

  return (
    <>
      {children}
      {showVenmoPrompt && (
        <VenmoPromptDialog user={user} onDone={() => setPrompted(true)} />
      )}
    </>
  )
}
