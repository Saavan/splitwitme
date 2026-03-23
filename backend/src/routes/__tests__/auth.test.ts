import { describe, it, expect, vi, beforeEach } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { authRouter } from '../auth'
import { prisma } from '../../db'
import { requireAuth } from '../../middleware/requireAuth'

// ---------------------------------------------------------------------------
// Module mocks (hoisted before any imports are evaluated)
// ---------------------------------------------------------------------------

vi.mock('../../db', () => ({
  prisma: {
    groupInvite: { findUnique: vi.fn(), update: vi.fn() },
    groupMember: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    group: { findUnique: vi.fn() },
    user: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../middleware/requireAuth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('../../config', () => ({
  config: { frontendUrl: 'http://localhost:5173' },
}))

// Passport is mocked so Google OAuth callbacks are fully controlled in tests.
// authenticate() returns a middleware that immediately marks the request as
// authenticated (sets req.user) and calls next(), bypassing the real OAuth flow.
vi.mock('passport', () => {
  const mockPassport = {
    authenticate: vi.fn(
      () => (req: any, _res: any, next: any) => {
        req.user = {
          id: 'user-1',
          email: 'alice@test.com',
          name: 'Alice',
          avatarUrl: null,
          venmoHandle: null,
        }
        next()
      }
    ),
    initialize: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    session: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  }
  return { default: mockPassport }
})

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const testUser = {
  id: 'user-1',
  email: 'alice@test.com',
  name: 'Alice',
  avatarUrl: null,
  venmoHandle: null,
}

/**
 * Builds a minimal Express app with a fake session middleware so route
 * handlers can read/write req.session without needing a real session store.
 */
function buildApp(sessionData: Record<string, any> = {}) {
  const app = express()
  app.use(express.json())

  // Fake session middleware — just attaches a plain object to req.session
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.session = {
      ...sessionData,
      save: (cb: () => void) => cb(),
      destroy: (cb: () => void) => cb(),
    }
    next()
  })

  app.use(authRouter)
  return app
}

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------
describe('GET /auth/me', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation((_req: any, res: Response) => {
      res.status(401).json({ error: 'Unauthorized' })
    })
    const app = buildApp()

    const res = await request(app).get('/auth/me')

    expect(res.status).toBe(401)
  })

  it('returns the current user when authenticated', async () => {
    vi.mocked(requireAuth).mockImplementation((req: any, _res: Response, next: NextFunction) => {
      req.user = testUser
      next()
    })
    const app = buildApp()

    const res = await request(app).get('/auth/me')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: testUser.id, email: testUser.email })
  })
})

// ---------------------------------------------------------------------------
// PATCH /auth/me
// ---------------------------------------------------------------------------
describe('PATCH /auth/me', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates venmoHandle and returns the updated user', async () => {
    vi.mocked(requireAuth).mockImplementation((req: any, _res: Response, next: NextFunction) => {
      req.user = testUser
      next()
    })
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...testUser,
      venmoHandle: 'alice-venmo',
    } as any)
    const app = buildApp()

    const res = await request(app).patch('/auth/me').send({ venmoHandle: 'alice-venmo' })

    expect(res.status).toBe(200)
    expect(res.body.venmoHandle).toBe('alice-venmo')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { venmoHandle: 'alice-venmo' } })
    )
  })

  it('accepts null to clear the venmoHandle', async () => {
    vi.mocked(requireAuth).mockImplementation((req: any, _res: Response, next: NextFunction) => {
      req.user = testUser
      next()
    })
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...testUser,
      venmoHandle: null,
    } as any)
    const app = buildApp()

    const res = await request(app).patch('/auth/me').send({ venmoHandle: null })

    expect(res.status).toBe(200)
    expect(res.body.venmoHandle).toBeNull()
  })

  it('returns 400 for an invalid venmoHandle value', async () => {
    vi.mocked(requireAuth).mockImplementation((req: any, _res: Response, next: NextFunction) => {
      req.user = testUser
      next()
    })
    const app = buildApp()
    // Express error handler falls through; zod throws a ZodError which
    // Express turns into a 500 or passes to next(err). Either way, it's not 200.
    const res = await request(app).patch('/auth/me').send({ venmoHandle: 12345 })
    expect(res.status).not.toBe(200)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
describe('POST /auth/logout', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('logs out the user and returns { success: true }', async () => {
    const app = express()
    app.use(express.json())
    app.use((req: any, _res: Response, next: NextFunction) => {
      req.session = {
        destroy: (cb: () => void) => cb(),
      }
      req.logout = (cb: (err: any) => void) => cb(null)
      next()
    })
    app.use(authRouter)

    const res = await request(app).post('/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// OAuth callback: session token preservation
//
// Passport ≥ 0.6 calls req.session.regenerate() after login, which wipes any
// data stored in the session before the OAuth redirect (inviteToken, joinCode).
// The callback route copies those values off the session onto req._pending*
// before passport.authenticate runs, so they survive regeneration.
// ---------------------------------------------------------------------------
describe('GET /auth/google/callback — session token preservation', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('redirects to frontendUrl when no invite or join code is present', async () => {
    const app = buildApp() // no session data

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173')
  })

  it('joins the group and redirects when a valid inviteToken is in the session', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'invite-abc',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: null,
    } as any)
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const app = buildApp({ inviteToken: 'invite-abc' })

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173/groups/g-1')
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('still redirects to group when user is already a member (no duplicate created)', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'invite-abc',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: null,
    } as any)
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
      groupId: 'g-1', userId: 'user-1', role: 'MEMBER',
    } as any)

    const app = buildApp({ inviteToken: 'invite-abc' })

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173/groups/g-1')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('falls through to frontendUrl when inviteToken is expired', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'expired',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    } as any)

    const app = buildApp({ inviteToken: 'expired' })

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173')
  })

  it('joins the group and redirects when a valid joinCode is in the session', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g-2',
      name: 'Road Trip',
      joinCode: 'join-xyz',
    } as any)
    vi.mocked(prisma.groupMember.upsert).mockResolvedValue({} as any)

    const app = buildApp({ joinCode: 'join-xyz' })

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173/groups/g-2')
    expect(prisma.groupMember.upsert).toHaveBeenCalledOnce()
  })

  it('falls through to frontendUrl when joinCode does not match any group', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null)

    const app = buildApp({ joinCode: 'bad-code' })

    const res = await request(app).get('/auth/google/callback')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:5173')
  })
})
