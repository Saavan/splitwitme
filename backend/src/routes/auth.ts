import { Router } from 'express'
import passport from 'passport'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { config } from '../config'

declare module 'express-session' {
  interface SessionData {
    inviteToken?: string
    joinCode?: string
  }
}

export const authRouter = Router()

authRouter.get('/auth/google', (req, res, next) => {
  const { inviteToken, joinCode } = req.query
  if (inviteToken) req.session.inviteToken = inviteToken as string
  if (joinCode) req.session.joinCode = joinCode as string
  const authOptions = { scope: ['profile', 'email'], prompt: 'select_account' } as any
  if (inviteToken || joinCode) {
    req.session.save(() => passport.authenticate('google', authOptions)(req, res, next))
  } else {
    passport.authenticate('google', authOptions)(req, res, next)
  }
})

authRouter.get(
  '/auth/google/callback',
  // Passport 0.6+ calls req.session.regenerate() after login to prevent session fixation.
  // This wipes any data stored before the OAuth redirect (inviteToken, joinCode).
  // Copy them off the session onto req before passport runs so they survive regeneration.
  (req, res, next) => {
    ;(req as any)._pendingInviteToken = req.session.inviteToken
    ;(req as any)._pendingJoinCode = req.session.joinCode
    next()
  },
  passport.authenticate('google', { failureRedirect: `${config.frontendUrl}/login?error=auth_failed` }),
  async (req, res) => {
    const inviteToken: string | undefined = (req as any)._pendingInviteToken
    const joinCode: string | undefined = (req as any)._pendingJoinCode

    // Handle invite token claim
    if (inviteToken) {
      try {
        const invite = await prisma.groupInvite.findUnique({ where: { token: inviteToken } })
        if (invite && !invite.claimedAt && !(invite.expiresAt && invite.expiresAt < new Date())) {
          const existing = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: invite.groupId, userId: req.user!.id } },
          })
          if (!existing) {
            await prisma.$transaction([
              prisma.groupMember.create({ data: { groupId: invite.groupId, userId: req.user!.id, role: 'MEMBER' } }),
              prisma.groupInvite.update({
                where: { token: inviteToken },
                data: { claimedAt: new Date(), claimedByUserId: req.user!.id },
              }),
            ])
          }
          return res.redirect(`${config.frontendUrl}/groups/${invite.groupId}`)
        }
      } catch (err) {
        console.error('Failed to claim invite:', err)
      }
    }

    // Handle join code
    if (joinCode) {
      try {
        const group = await prisma.group.findUnique({ where: { joinCode } })
        if (group) {
          await prisma.groupMember.upsert({
            where: { groupId_userId: { groupId: group.id, userId: req.user!.id } },
            update: {},
            create: { groupId: group.id, userId: req.user!.id, role: 'MEMBER' },
          })
          return res.redirect(`${config.frontendUrl}/groups/${group.id}`)
        }
      } catch (err) {
        console.error('Failed to join via join link:', err)
      }
    }

    res.redirect(config.frontendUrl)
  }
)

authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json(req.user)
})

authRouter.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy(() => {
      res.clearCookie('connect.sid')
      res.json({ success: true })
    })
  })
})

authRouter.patch('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ venmoHandle: z.string().optional().nullable() })
    const { venmoHandle } = schema.parse(req.body)

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { venmoHandle },
    })

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      venmoHandle: updated.venmoHandle,
    })
  } catch (err) {
    next(err)
  }
})
