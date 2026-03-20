import { Router } from 'express'
import passport from 'passport'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { config } from '../config'

export const authRouter = Router()

authRouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

authRouter.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.frontendUrl}/login?error=auth_failed` }),
  (_req, res) => {
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
