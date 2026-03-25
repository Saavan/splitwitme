import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { config } from '../config'
import { sendAddedToGroupEmail } from '../lib/email'

export const membersRouter = Router({ mergeParams: true })
export const usersRouter = Router()

// GET /users/search?q=&groupId=
// Returns matching users with isMember:true when they're already in the group.
usersRouter.get('/users/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim()
    const groupId = req.query.groupId ? String(req.query.groupId) : undefined

    if (q.length < 2) return res.json([])

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          { id: { not: req.user!.id } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        ...(groupId
          ? { groupMemberships: { where: { groupId }, select: { groupId: true } } }
          : {}),
      },
      take: 8,
      orderBy: { name: 'asc' },
    })

    const result = users.map(({ groupMemberships, ...u }: any) => ({
      ...u,
      isMember: groupMemberships ? groupMemberships.length > 0 : false,
    }))

    res.json(result)
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

    const [targetUser, group] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.group.findUnique({ where: { id: req.params.id }, select: { name: true } }),
    ])
    if (!targetUser) {
      return res.status(404).json({ error: "No account found — ask them to sign in to SplitWitMe first." })
    }
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: targetUser.id } }
    })
    if (existing) return res.status(409).json({ error: 'User is already a member of this group' })

    const newMember = await prisma.groupMember.create({
      data: { groupId: req.params.id, userId: targetUser.id, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
    })

    res.status(201).json(newMember)

    // Send notification email in the background — never blocks the response
    if (config.resendApiKey) {
      const groupUrl = `${config.frontendUrl}/groups/${req.params.id}`
      sendAddedToGroupEmail(targetUser.email, targetUser.name, req.user!.name, group.name, groupUrl)
        .catch(err => console.error('Failed to send group-added email:', err))
    }
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
