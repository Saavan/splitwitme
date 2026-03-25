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
    const mockUsers = [
      { id: 'user-2', name: 'Bob Smith', email: 'bob@test.com', avatarUrl: null },
    ]
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const res = await request(buildApp()).get('/users/search?q=bo')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockUsers)
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
    const andClauses = callArgs.where.AND
    expect(andClauses).toContainEqual({ id: { not: testUser.id } })
  })

  it('excludes users already in the specified group when excludeGroupId is provided', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice&excludeGroupId=group-1')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    const andClauses = callArgs.where.AND
    expect(andClauses).toContainEqual({ groupMemberships: { none: { groupId: 'group-1' } } })
  })

  it('does not add group exclusion filter when excludeGroupId is absent', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    const andClauses = callArgs.where.AND
    expect(andClauses).not.toContainEqual(
      expect.objectContaining({ groupMemberships: expect.anything() })
    )
  })

  it('returns at most 8 results', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=alice')

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 })
    )
  })

  it('returns multiple matching users', async () => {
    asAuthed()
    const mockUsers = [
      { id: 'user-2', name: 'Alice B', email: 'aliceb@test.com', avatarUrl: null },
      { id: 'user-3', name: 'Alice C', email: 'alicec@test.com', avatarUrl: 'https://img' },
    ]
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

    const res = await request(buildApp()).get('/users/search?q=alice')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].name).toBe('Alice B')
    expect(res.body[1].avatarUrl).toBe('https://img')
  })

  it('trims whitespace from the query before searching', async () => {
    asAuthed()
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await request(buildApp()).get('/users/search?q=%20alice%20')

    const callArgs = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    const orClause = callArgs.where.AND[0].OR
    expect(orClause[0].name.contains).toBe('alice')
  })
})
