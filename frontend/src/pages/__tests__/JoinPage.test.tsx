import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { JoinPage } from '../JoinPage'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/useInvites', () => ({
  useJoinViaCode: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  })),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

vi.mock('@/lib/auth', () => ({
  signInWithGoogle: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { signInWithGoogle } from '@/lib/auth'

describe('JoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      isLoading: false,
    } as any)
    vi.mocked(useQuery).mockReturnValue({
      data: {
        groupId: 'g-1',
        groupName: 'Road Trip',
        joinCode: 'abc123',
        isMember: false,
      },
      isLoading: false,
      error: null,
    } as any)
  })

  it('calls signInWithGoogle with joinCode and returnTo when signing in', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/join/:joinCode" element={<JoinPage />} />
      </Routes>,
      { route: '/join/abc123' }
    )

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    expect(signInWithGoogle).toHaveBeenCalledWith({
      joinCode: 'abc123',
      returnTo: '/join/abc123',
    })
  })
})
