import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { computeDebtsPerCurrency } from '../lib/currencyDebts'
import { buildVenmoUrl } from '../lib/venmo'
import { sendBalanceReminderEmail } from '../lib/email'
import { config } from '../config'

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

// POST /groups/:id/debts/remind
debtsRouter.post('/remind', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      debtorUserId: z.string(),
      amount: z.number().positive(),
      currency: z.string(),
      level: z.enum(['friendly', 'medium', 'angry']).default('medium'),
    })
    const { debtorUserId, amount, currency, level } = schema.parse(req.body)

    const [membership, group, debtor] = await Promise.all([
      prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } },
      }),
      prisma.group.findUnique({ where: { id: req.params.id }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: debtorUserId }, select: { name: true, email: true } }),
    ])
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (!debtor) return res.status(404).json({ error: 'User not found' })

    const sym: Record<string, string> = { USD: '$', CAD: 'CA$' }
    const amountStr = `${sym[currency] ?? currency}${amount.toFixed(2)}`
    const groupUrl = `${config.frontendUrl}/groups/${req.params.id}`

    if (config.resendApiKey) {
      sendBalanceReminderEmail(debtor.email, debtor.name, req.user!.name, amountStr, group.name, groupUrl, level)
        .catch(err => console.error('Failed to send reminder email:', err))
    }

    res.json({ sent: true })
  } catch (err) {
    next(err)
  }
})
