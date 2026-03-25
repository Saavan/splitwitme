import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { usersRouter } from '../members'
import { prisma } from '../../db'
import { requireAuth } from '../../middleware/requireAuth'

vi.mock('../../db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../middleware/requireAuth', () => ({
  requireAuth: vi.fn(),
}))

const testUser = { id: 'user-1', email: 'alice@test.com', name: 'Alice', avatarUrl: null, venmoHandle: null }

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
  app.use(usersRouter)
  return app
}

// ---------------------------------------------------------------------------
// GET /users/search
// ---------------------------------------------------------------------------
describe('GET /users/search', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    asUnauthed()
    const res = await request(buildApp()).get('/users/search?q=alice')
    expect(res.status).toBe(401)
  })

  it('returns an empty array when query is less than 2 characters', async () => {
    asAuthed()
    const res = await request(buildApp()).get('/users/search?q=a')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns an empty array when query is missing', async () => {
    asAuthed()
    const res = await request(buildApp()).get('/users/search')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('searches by name or email with 2+ character query', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Bob Smith', email: 'bob@test.com', avatarUrl: null },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=bo')

    expect(res.status).toBe(200)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                { name: { contains: 'bo', mode: 'insensitive' } },
                { email: { contains: 'bo', mode: 'insensitive' } },
              ],
            }),
          ]),
        }),
        take: 8,
      })
    )
  })

  it('excludes the current user from results', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    expect(callArgs.where.AND).toContainEqual({ id: { not: testUser.id } })
  })

  it('returns at most 8 results', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice')

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 })
    )
  })

  it('trims whitespace from the query before searching', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=%20alice%20')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    const orClause = callArgs.where.AND[0].OR
    expect(orClause[0].name.contains).toBe('alice')
  })

  // ---------------------------------------------------------------------------
  // isMember flag
  // ---------------------------------------------------------------------------

  it('sets isMember=false for users not in the group', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Bob', email: 'bob@test.com', avatarUrl: null, groupMemberships: [] },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=bo&groupId=group-1')

    expect(res.status).toBe(200)
    expect(res.body[0].isMember).toBe(false)
  })

  it('sets isMember=true for users already in the group', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Bob', email: 'bob@test.com', avatarUrl: null, groupMemberships: [{ groupId: 'group-1' }] },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=bo&groupId=group-1')

    expect(res.status).toBe(200)
    expect(res.body[0].isMember).toBe(true)
  })

  it('strips the groupMemberships field from the response', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Bob', email: 'bob@test.com', avatarUrl: null, groupMemberships: [] },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=bo&groupId=group-1')

    expect(res.body[0]).not.toHaveProperty('groupMemberships')
  })

  it('requests groupMemberships filtered to the given groupId when groupId is provided', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice&groupId=group-1')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    expect(callArgs.select.groupMemberships).toMatchObject({
      where: { groupId: 'group-1' },
    })
  })

  it('does not request groupMemberships when groupId is absent, isMember defaults to false', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Bob', email: 'bob@test.com', avatarUrl: null },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=bo')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    expect(callArgs.select.groupMemberships).toBeUndefined()
    expect(res.body[0].isMember).toBe(false)
  })

  it('returns multiple results with correct isMember values', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-2', name: 'Alice B', email: 'aliceb@test.com', avatarUrl: null, groupMemberships: [{ groupId: 'group-1' }] },
      { id: 'user-3', name: 'Alice C', email: 'alicec@test.com', avatarUrl: null, groupMemberships: [] },
    ] as any)

    const res = await request(buildApp()).get('/users/search?q=alice&groupId=group-1')

    expect(res.body).toHaveLength(2)
    expect(res.body[0].isMember).toBe(true)
    expect(res.body[1].isMember).toBe(false)
  })
})
