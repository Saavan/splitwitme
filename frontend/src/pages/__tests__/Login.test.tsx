import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from '../Login'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/auth', () => ({
  signInWithGoogle: vi.fn(),
}))

import { signInWithGoogle } from '@/lib/auth'

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards returnTo query param to signInWithGoogle', async () => {
    renderWithProviders(<Login />, { route: '/login?returnTo=%2Fjoin%2Fabc' })

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    expect(signInWithGoogle).toHaveBeenCalledWith({ returnTo: '/join/abc' })
  })
})
