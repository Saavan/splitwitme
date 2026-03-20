import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'

export const groupsRouter = Router()

// GET /groups - list user's groups with memberCount and netBalance
groupsRouter.get('/groups', requireAuth, async (req, res, next) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.id },
      include: {
        group: {
          include: {
            members: true,
            transactions: {
              include: { splits: true }
            }
          }
        }
      }
    })

    const groups = memberships.map(({ group }: { group: typeof memberships[number]['group'] }) => {
      let netBalance = 0
      for (const tx of group.transactions) {
        if (tx.paidById === req.user!.id) {
          // I paid: others owe me their splits
          for (const split of tx.splits) {
            if (split.userId !== req.user!.id) {
              netBalance += Number(split.amount)
            }
          }
        } else {
          // Someone else paid: I owe my split
          const mySplit = tx.splits.find((s: { userId: string; amount: unknown }) => s.userId === req.user!.id)
          if (mySplit) netBalance -= Number(mySplit.amount)
        }
      }

      return {
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        netBalance: Math.round(netBalance * 100) / 100,
        createdAt: group.createdAt,
      }
    })

    res.json(groups)
  } catch (err) {
    next(err)
  }
})

// POST /groups - create group
groupsRouter.post('/groups', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(1).max(100) })
    const { name } = schema.parse(req.body)

    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: { userId: req.user!.id, role: 'OWNER' }
        }
      },
      include: { members: true }
    })

    res.status(201).json(group)
  } catch (err) {
    next(err)
  }
})

// GET /groups/:id - group detail
groupsRouter.get('/groups/:id', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, venmoHandle: true } } }
        }
      }
    })

    res.json(group)
  } catch (err) {
    next(err)
  }
})

// PATCH /groups/:id - update name (OWNER only)
groupsRouter.patch('/groups/:id', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the group owner can update the group' })
    }

    const schema = z.object({ name: z.string().min(1).max(100) })
    const { name } = schema.parse(req.body)

    const group = await prisma.group.update({
      where: { id: req.params.id },
      data: { name }
    })

    res.json(group)
  } catch (err) {
    next(err)
  }
})

// DELETE /groups/:id (OWNER only)
groupsRouter.delete('/groups/:id', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the group owner can delete the group' })
    }

    await prisma.group.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
