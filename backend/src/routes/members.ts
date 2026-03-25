import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'

export const membersRouter = Router({ mergeParams: true })
export const usersRouter = Router()

// GET /users/search?q=&excludeGroupId=
usersRouter.get('/users/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim()
    const excludeGroupId = req.query.excludeGroupId ? String(req.query.excludeGroupId) : undefined

    if (q.length < 2) return res.json([])

    // Find users whose name or email contains the query (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          // Exclude the current user
          { id: { not: req.user!.id } },
          // Exclude users already in the target group
          ...(excludeGroupId
            ? [{ groupMemberships: { none: { groupId: excludeGroupId } } }]
            : []),
        ],
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 8,
      orderBy: { name: 'asc' },
    })

    res.json(users)
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/members
membersRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const schema = z.object({ email: z.string().email() })
    const { email } = schema.parse(req.body)

    const targetUser = await prisma.user.findUnique({ where: { email } })
    if (!targetUser) {
      return res.status(404).json({ error: "No account found — ask them to sign in to SplitWitMe first." })
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: targetUser.id } }
    })
    if (existing) return res.status(409).json({ error: 'User is already a member of this group' })

    const newMember = await prisma.groupMember.create({
      data: { groupId: req.params.id, userId: targetUser.id, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
    })

    res.status(201).json(newMember)
  } catch (err) {
    next(err)
  }
})

// DELETE /groups/:id/members/:userId
membersRouter.delete('/:userId', requireAuth, async (req, res, next) => {
  try {
    const requesterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!requesterMembership) return res.status(403).json({ error: 'Not a member of this group' })

    const isOwner = requesterMembership.role === 'OWNER'
    const isSelf = req.user!.id === req.params.userId

    if (!isOwner && !isSelf) {
      return res.status(403).json({ error: 'Only the group owner can remove other members' })
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } }
    })

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
