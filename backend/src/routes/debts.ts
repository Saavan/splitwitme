import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { computeDebtsPerCurrency } from '../lib/currencyDebts'
import { buildVenmoUrl } from '../lib/venmo'

export const debtsRouter = Router({ mergeParams: true })

debtsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } }
    })
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: true } },
        transactions: {
          include: { splits: true }
        }
      }
    })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const venmoMap = new Map(group.members.map((m: { user: { id: string; venmoHandle: string | null } }) => [m.user.id, m.user.venmoHandle]))

    const rawDebts = computeDebtsPerCurrency(
      group.transactions.map((tx: { paidById: string; amount: unknown; currency: string; splits: Array<{ userId: string; amount: unknown }> }) => ({
        paidById: tx.paidById,
        amount: Number(tx.amount),
        currency: tx.currency,
        splits: tx.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
      })),
      group.members.map((m: { user: { id: string; name: string } }) => ({ userId: m.user.id, name: m.user.name }))
    )

    // Attach venmoLinks (USD only — Venmo is US-only)
    const perCurrency = Object.fromEntries(
      Object.entries(rawDebts).map(([currency, data]) => [
        currency,
        {
          ...data,
          simplifiedDebts: data.simplifiedDebts.map(s => ({
            ...s,
            currency,
            venmoLink: currency === 'USD' && venmoMap.get(s.toId)
              ? buildVenmoUrl(venmoMap.get(s.toId) as string, s.amount, `SplitWitMe: ${group.name}`)
              : null,
          })),
        },
      ])
    )

    res.json({ perCurrency })
  } catch (err) {
    next(err)
  }
})
