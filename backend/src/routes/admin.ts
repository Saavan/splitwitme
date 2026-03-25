import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'

export const adminRouter = Router()

const ADMIN_EMAIL = 'saavs94@gmail.com'

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

// GET /admin/users
adminRouter.get('/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

// DELETE /admin/users/:id
adminRouter.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
