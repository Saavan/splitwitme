import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'

export const transactionsRouter = Router({ mergeParams: true })

// GET /groups/:id/transactions
transactionsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const transactions = await prisma.transaction.findMany({
      where: { groupId: req.params.id },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { date: 'desc' }
    })

    res.json(transactions)
  } catch (err) {
    next(err)
  }
})

const splitSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
})

const txBodySchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  paidById: z.string(),
  splits: z.array(splitSchema).min(1),
})

async function validateSplits(
  groupId: string,
  paidById: string,
  amount: number,
  splits: { userId: string; amount: number }[]
): Promise<string | null> {
  const total = splits.reduce((sum, s) => sum + s.amount, 0)
  if (Math.abs(total - amount) > 0.01) {
    return `Splits sum (${total.toFixed(2)}) must equal transaction amount (${amount.toFixed(2)})`
  }

  const members = await prisma.groupMember.findMany({ where: { groupId } })
  const memberIds = new Set(members.map((m: { userId: string }) => m.userId))

  if (!memberIds.has(paidById)) return 'Payer is not a member of this group'

  for (const split of splits) {
    if (!memberIds.has(split.userId)) {
      return `User ${split.userId} is not a member of this group`
    }
  }

  return null
}

// POST /groups/:id/transactions
transactionsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const body = txBodySchema.parse(req.body)
    const error = await validateSplits(req.params.id, body.paidById, body.amount, body.splits)
    if (error) return res.status(400).json({ error })

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return tx.transaction.create({
        data: {
          groupId: req.params.id,
          paidById: body.paidById,
          description: body.description,
          amount: body.amount,
          date: body.date ? new Date(body.date) : new Date(),
          splits: {
            create: body.splits.map(s => ({ userId: s.userId, amount: s.amount }))
          }
        },
        include: {
          paidBy: { select: { id: true, name: true, avatarUrl: true } },
          splits: { include: { user: { select: { id: true, name: true } } } }
        }
      })
    })

    res.status(201).json(transaction)
  } catch (err) {
    next(err)
  }
})

// PATCH /groups/:id/transactions/:txId
transactionsRouter.patch('/:txId', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.txId, groupId: req.params.id }
    })
    if (!existing) return res.status(404).json({ error: 'Transaction not found' })

    const body = txBodySchema.parse(req.body)
    const error = await validateSplits(req.params.id, body.paidById, body.amount, body.splits)
    if (error) return res.status(400).json({ error })

    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.transactionSplit.deleteMany({ where: { transactionId: req.params.txId } })
      return tx.transaction.update({
        where: { id: req.params.txId },
        data: {
          paidById: body.paidById,
          description: body.description,
          amount: body.amount,
          date: body.date ? new Date(body.date) : existing.date,
          splits: {
            create: body.splits.map(s => ({ userId: s.userId, amount: s.amount }))
          }
        },
        include: {
          paidBy: { select: { id: true, name: true, avatarUrl: true } },
          splits: { include: { user: { select: { id: true, name: true } } } }
        }
      })
    })

    res.json(transaction)
  } catch (err) {
    next(err)
  }
})

// DELETE /groups/:id/transactions/:txId
transactionsRouter.delete('/:txId', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.txId, groupId: req.params.id }
    })
    if (!existing) return res.status(404).json({ error: 'Transaction not found' })

    await prisma.transaction.delete({ where: { id: req.params.txId } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
