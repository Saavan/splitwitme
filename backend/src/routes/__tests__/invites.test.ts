import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { publicInvitesRouter } from '../invites'
import { prisma } from '../../db'
import { requireAuth } from '../../middleware/requireAuth'

vi.mock('../../db', () => ({
  prisma: {
    groupInvite: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../../middleware/requireAuth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('../../config', () => ({
  config: { frontendUrl: 'http://localhost:5173', resendApiKey: '' },
}))

vi.mock('../../lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}))

const testUser = {
  id: 'user-1',
  email: 'alice@test.com',
  name: 'Alice',
  avatarUrl: null,
  venmoHandle: null,
}

function asAuthed() {
  vi.mocked(requireAuth).mockImplementation((req: any, _res: any, next: any) => {
    req.user = testUser
    next()
  })
}

function asUnauthed() {
  vi.mocked(requireAuth).mockImplementation((_req: any, res: any) => {
    res.status(401).json({ error: 'Unauthorized' })
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/invites', publicInvitesRouter)
  return app
}

// ---------------------------------------------------------------------------
// GET /invites/:token — invite info (public)
// ---------------------------------------------------------------------------
describe('GET /invites/:token', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildApp()
  })

  it('returns 404 when the token does not exist', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue(null)

    const res = await request(app).get('/invites/no-such-token')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns 410 when the invite is past its expiry date', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'exp-token',
      groupId: 'g-1',
      invitedName: 'Bob',
      claimedAt: null,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      group: { name: 'Dinner', id: 'g-1' },
    } as any)

    const res = await request(app).get('/invites/exp-token')

    expect(res.status).toBe(410)
  })

  it('returns invite info for a valid, unclaimed invite', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'good-token',
      groupId: 'g-1',
      invitedName: 'Bob',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 86400_000),
      group: { name: 'Trip Expenses', id: 'g-1' },
    } as any)

    const res = await request(app).get('/invites/good-token')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      groupName: 'Trip Expenses',
      groupId: 'g-1',
      invitedName: 'Bob',
      claimed: false,
    })
  })

  it('returns claimed=true when invite has already been accepted', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'claimed-token',
      groupId: 'g-1',
      invitedName: 'Bob',
      claimedAt: new Date(),
      expiresAt: null,
      group: { name: 'Trip Expenses', id: 'g-1' },
    } as any)

    const res = await request(app).get('/invites/claimed-token')

    expect(res.status).toBe(200)
    expect(res.body.claimed).toBe(true)
  })

  it('returns claimed=false and does not 410 when invite has no expiry', async () => {
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'no-exp',
      groupId: 'g-1',
      invitedName: 'Carol',
      claimedAt: null,
      expiresAt: null,
      group: { name: 'Group', id: 'g-1' },
    } as any)

    const res = await request(app).get('/invites/no-exp')

    expect(res.status).toBe(200)
    expect(res.body.claimed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// POST /invites/:token/claim — logged-in user claims invite
// ---------------------------------------------------------------------------
describe('POST /invites/:token/claim', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildApp()
  })

  it('returns 401 when not authenticated', async () => {
    asUnauthed()
    const res = await request(app).post('/invites/any-token/claim')
    expect(res.status).toBe(401)
  })

  it('returns 404 when token does not exist', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue(null)

    const res = await request(app).post('/invites/bad-token/claim')

    expect(res.status).toBe(404)
  })

  it('returns 410 when invite is expired', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'exp',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    } as any)

    const res = await request(app).post('/invites/exp/claim')

    expect(res.status).toBe(410)
  })

  it('returns 409 when invite was already claimed', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'used',
      groupId: 'g-1',
      claimedAt: new Date(),
      expiresAt: null,
    } as any)

    const res = await request(app).post('/invites/used/claim')

    expect(res.status).toBe(409)
  })

  it('creates membership and marks invite claimed for a new member', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'valid',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: null,
    } as any)
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null) // not a member yet
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const res = await request(app).post('/invites/valid/claim')

    expect(res.status).toBe(200)
    expect(res.body.groupId).toBe('g-1')
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    // Transaction args should include both a create and an update
    const txArgs = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as any[]
    expect(txArgs).toHaveLength(2)
  })

  it('skips creating membership if user is already a group member', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'valid',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: null,
    } as any)
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
      groupId: 'g-1',
      userId: testUser.id,
      role: 'MEMBER',
    } as any)

    const res = await request(app).post('/invites/valid/claim')

    expect(res.status).toBe(200)
    expect(res.body.groupId).toBe('g-1')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('works with an invite that has a future expiry date', async () => {
    asAuthed()
    vi.mocked(prisma.groupInvite.findUnique).mockResolvedValue({
      token: 'future-exp',
      groupId: 'g-1',
      claimedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as any)
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const res = await request(app).post('/invites/future-exp/claim')

    expect(res.status).toBe(200)
    expect(res.body.groupId).toBe('g-1')
  })
})

// ---------------------------------------------------------------------------
// GET /invites/join/:joinCode — join link info (public)
// ---------------------------------------------------------------------------
describe('GET /invites/join/:joinCode', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildApp()
  })

  it('returns 404 when join code does not match any group', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null)

    const res = await request(app).get('/invites/join/bad-code')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found|regenerated/i)
  })

  it('returns groupId, groupName, and joinCode for a valid code', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g-1',
      name: 'Road Trip 2026',
      joinCode: 'abc123',
    } as any)

    const res = await request(app).get('/invites/join/abc123')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      groupId: 'g-1',
      groupName: 'Road Trip 2026',
      joinCode: 'abc123',
    })
  })
})

// ---------------------------------------------------------------------------
// POST /invites/join/:joinCode/join — logged-in user joins via join link
// ---------------------------------------------------------------------------
describe('POST /invites/join/:joinCode/join', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = buildApp()
  })

  it('returns 401 when not authenticated', async () => {
    asUnauthed()
    const res = await request(app).post('/invites/join/abc123/join')
    expect(res.status).toBe(401)
  })

  it('returns 404 when join code does not match any group', async () => {
    asAuthed()
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null)

    const res = await request(app).post('/invites/join/bad-code/join')

    expect(res.status).toBe(404)
  })

  it('adds user to group and returns groupId', async () => {
    asAuthed()
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g-1',
      name: 'Road Trip',
      joinCode: 'abc123',
    } as any)
    vi.mocked(prisma.groupMember.upsert).mockResolvedValue({
      groupId: 'g-1',
      userId: testUser.id,
      role: 'MEMBER',
    } as any)

    const res = await request(app).post('/invites/join/abc123/join')

    expect(res.status).toBe(200)
    expect(res.body.groupId).toBe('g-1')
    expect(prisma.groupMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId_userId: { groupId: 'g-1', userId: testUser.id } },
        create: expect.objectContaining({ groupId: 'g-1', userId: testUser.id, role: 'MEMBER' }),
        update: {},
      })
    )
  })

  it('succeeds idempotently when user is already a member (upsert semantics)', async () => {
    asAuthed()
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g-1',
      name: 'Road Trip',
      joinCode: 'abc123',
    } as any)
    // upsert resolves with the existing row
    vi.mocked(prisma.groupMember.upsert).mockResolvedValue({
      groupId: 'g-1',
      userId: testUser.id,
      role: 'MEMBER',
    } as any)

    const res = await request(app).post('/invites/join/abc123/join')

    expect(res.status).toBe(200)
    expect(res.body.groupId).toBe('g-1')
    // upsert is still called (idempotent, not a 409)
    expect(prisma.groupMember.upsert).toHaveBeenCalledOnce()
  })
})
