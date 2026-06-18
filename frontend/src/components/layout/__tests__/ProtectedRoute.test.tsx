import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

function LoginCapture() {
  const [params] = useSearchParams()
  return <div>login page returnTo={params.get('returnTo')}</div>
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unsigned-in user to login with returnTo', async () => {
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      isLoading: false,
    } as any)

    renderWithProviders(
      <Routes>
        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginCapture />} />
      </Routes>,
      { route: '/groups/g-1' }
    )

    expect(await screen.findByText('login page returnTo=/groups/g-1')).toBeTruthy()
  })
})
