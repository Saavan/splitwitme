import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { config } from '../config'
import { sendInviteEmail } from '../lib/email'

export const invitesRouter = Router({ mergeParams: true })

// POST /groups/:id/invites
invitesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      invitedName: z.string().min(1).max(100),
      email: z.string().email().optional(),
    })
    const { invitedName, email } = schema.parse(req.body)

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } },
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const invite = await prisma.groupInvite.create({
      data: {
        groupId: req.params.id,
        invitedName,
        email,
        createdById: req.user!.id,
        expiresAt,
      },
    })

    const inviteUrl = `${config.frontendUrl}/invite/${invite.token}`
    let emailSent = false

    if (email && config.resendApiKey) {
      try {
        await sendInviteEmail(email, invitedName, req.user!.name, group.name, inviteUrl)
        emailSent = true
      } catch (err) {
        console.error('Failed to send invite email:', err)
      }
    }

    res.status(201).json({ token: invite.token, inviteUrl, emailSent })
  } catch (err) {
    next(err)
  }
})

export const publicInvitesRouter = Router()

// GET /invites/:token
publicInvitesRouter.get('/:token', async (req, res, next) => {
  try {
    const invite = await prisma.groupInvite.findUnique({
      where: { token: req.params.token },
      include: { group: { select: { name: true, id: true } } },
    })

    if (!invite) return res.status(404).json({ error: 'Invite not found' })
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite has expired' })
    }

    res.json({
      groupName: invite.group.name,
      groupId: invite.group.id,
      invitedName: invite.invitedName,
      claimed: !!invite.claimedAt,
    })
  } catch (err) {
    next(err)
  }
})

// GET /join/:joinCode
publicInvitesRouter.get('/join/:joinCode', async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { joinCode: req.params.joinCode },
      select: { id: true, name: true, joinCode: true },
    })
    if (!group) return res.status(404).json({ error: 'Join link not found or has been regenerated' })
    res.json({ groupId: group.id, groupName: group.name, joinCode: group.joinCode })
  } catch (err) {
    next(err)
  }
})

// POST /invites/:token/claim — for already-logged-in users
publicInvitesRouter.post('/:token/claim', requireAuth, async (req, res, next) => {
  try {
    const invite = await prisma.groupInvite.findUnique({ where: { token: req.params.token } })
    if (!invite) return res.status(404).json({ error: 'Invite not found' })
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite has expired' })
    }
    if (invite.claimedAt) return res.status(409).json({ error: 'Invite already claimed' })

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId: req.user!.id } },
    })
    if (!existing) {
      await prisma.$transaction([
        prisma.groupMember.create({ data: { groupId: invite.groupId, userId: req.user!.id, role: 'MEMBER' } }),
        prisma.groupInvite.update({
          where: { token: req.params.token },
          data: { claimedAt: new Date(), claimedByUserId: req.user!.id },
        }),
      ])
    }
    res.json({ groupId: invite.groupId })
  } catch (err) {
    next(err)
  }
})

// POST /join/:joinCode/join — for already-logged-in users
publicInvitesRouter.post('/join/:joinCode/join', requireAuth, async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({ where: { joinCode: req.params.joinCode } })
    if (!group) return res.status(404).json({ error: 'Join link not found or has been regenerated' })

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: req.user!.id } },
      update: {},
      create: { groupId: group.id, userId: req.user!.id, role: 'MEMBER' },
    })
    res.json({ groupId: group.id })
  } catch (err) {
    next(err)
  }
})
