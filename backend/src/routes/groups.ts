import { Router } from 'express'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { config } from '../config'

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
      // Accumulate in integer cents to avoid floating-point errors
      const netBalancesCents: Record<string, number> = {}
      for (const tx of group.transactions) {
        const cur = (tx as any).currency || 'USD'
        if (!netBalancesCents[cur]) netBalancesCents[cur] = 0
        if (tx.paidById === req.user!.id) {
          for (const split of tx.splits) {
            if (split.userId !== req.user!.id) {
              netBalancesCents[cur] += split.amount // already integer cents
            }
          }
        } else {
          const mySplit = tx.splits.find((s: { userId: string; amount: unknown }) => s.userId === req.user!.id)
          if (mySplit) netBalancesCents[cur] -= mySplit.amount // already integer cents
        }
      }
      // Convert to dollars for the API response
      const netBalances: Record<string, number> = {}
      for (const cur of Object.keys(netBalancesCents)) {
        netBalances[cur] = netBalancesCents[cur] / 100
      }

      return {
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        netBalances,
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
        },
        invites: {
          where: { claimedAt: null },
          select: { id: true, invitedName: true, email: true, token: true, createdAt: true, expiresAt: true }
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

// GET /groups/:id/join-link (auth required, member only)
groupsRouter.get('/groups/:id/join-link', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } },
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    let group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    if (!group.joinCode) {
      const joinCode = randomBytes(12).toString('base64url')
      group = await prisma.group.update({ where: { id: req.params.id }, data: { joinCode } })
    }

    const joinUrl = `${config.frontendUrl}/join/${group.joinCode}`
    res.json({ joinUrl })
  } catch (err) {
    next(err)
  }
})

// POST /groups/:id/regenerate-join-link (OWNER only)
groupsRouter.post('/groups/:id/regenerate-join-link', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } },
    })
    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the group owner can regenerate the join link' })
    }

    const joinCode = randomBytes(12).toString('base64url')
    await prisma.group.update({ where: { id: req.params.id }, data: { joinCode } })

    const joinUrl = `${config.frontendUrl}/join/${joinCode}`
    res.json({ joinUrl })
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
