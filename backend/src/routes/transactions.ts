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

    res.json(transactions.map(toApiTx))
  } catch (err) {
    next(err)
  }
})

const splitSchema = z.object({
  userId: z.string(),
  amount: z.number().min(0), // 0 means excluded (unchecked); filtered out before storage
})

const txBodySchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'CAD']).default('USD'),
  date: z.string().optional(),
  paidById: z.string(),
  splits: z.array(splitSchema).min(1),
})

// Convert a dollar amount (from the API) to integer cents, rounding to avoid float errors
function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Convert integer cents back to dollars for API responses
function toDollars(cents: number): number {
  return cents / 100
}

// Map a Prisma transaction (amounts in cents) to the API response shape (amounts in dollars)
function toApiTx(tx: any) {
  return {
    ...tx,
    amount: toDollars(tx.amount),
    splits: tx.splits.map((s: any) => ({ ...s, amount: toDollars(s.amount) })),
  }
}

async function validateSplits(
  groupId: string,
  paidById: string,
  amount: number,
  splits: { userId: string; amount: number }[]
): Promise<string | null> {
  // Ignore zero-amount splits (unchecked members)
  const activeSplits = splits.filter(s => s.amount > 0)
  // Compare in integer cents — strict equality, no floating-point tolerance needed
  const totalCents = activeSplits.reduce((sum, s) => sum + toCents(s.amount), 0)
  const amountCents = toCents(amount)
  if (totalCents !== amountCents) {
    return `Splits sum (${toDollars(totalCents).toFixed(2)}) must equal transaction amount (${amount.toFixed(2)})`
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
          amount: toCents(body.amount),
          currency: body.currency,
          date: body.date ? new Date(body.date) : new Date(),
          splits: {
            create: body.splits
              .filter(s => s.amount > 0)
              .map(s => ({ userId: s.userId, amount: toCents(s.amount) }))
          }
        },
        include: {
          paidBy: { select: { id: true, name: true, avatarUrl: true } },
          splits: { include: { user: { select: { id: true, name: true } } } }
        }
      })
    })

    res.status(201).json(toApiTx(transaction))
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
          amount: toCents(body.amount),
          date: body.date ? new Date(body.date) : existing.date,
          splits: {
            create: body.splits
              .filter(s => s.amount > 0)
              .map(s => ({ userId: s.userId, amount: toCents(s.amount) }))
          }
        },
        include: {
          paidBy: { select: { id: true, name: true, avatarUrl: true } },
          splits: { include: { user: { select: { id: true, name: true } } } }
        }
      })
    })

    res.json(toApiTx(transaction))
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
