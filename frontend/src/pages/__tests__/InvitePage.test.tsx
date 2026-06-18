import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { InvitePage } from '../InvitePage'
import { renderWithProviders } from '@/test/render'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/useInvites', () => ({
  useInviteInfo: vi.fn(),
  useClaimInvite: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  })),
}))

vi.mock('@/lib/auth', () => ({
  signInWithGoogle: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'
import { useInviteInfo } from '@/hooks/useInvites'
import { signInWithGoogle } from '@/lib/auth'

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      isLoading: false,
    } as any)
    vi.mocked(useInviteInfo).mockReturnValue({
      data: {
        groupName: 'Road Trip',
        groupId: 'g-1',
        invitedName: 'Bob',
        claimed: false,
      },
      isLoading: false,
      error: null,
      failureReason: null,
    } as any)
  })

  it('calls signInWithGoogle with inviteToken and returnTo when signing in', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/invite/:token" element={<InvitePage />} />
      </Routes>,
      { route: '/invite/tok-abc' }
    )

    await userEvent.click(screen.getByRole('button', { name: /sign in with google to accept/i }))

    expect(signInWithGoogle).toHaveBeenCalledWith({
      inviteToken: 'tok-abc',
      returnTo: '/invite/tok-abc',
    })
  })
})
