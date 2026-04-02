import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { computeDebtsPerCurrency } from '../lib/currencyDebts'
import { buildVenmoUrl, buildVenmoRequestUrl } from '../lib/venmo'
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
      group.transactions.map((tx: { paidById: string; amount: number; currency: string; splits: Array<{ userId: string; amount: number }> }) => ({
        paidById: tx.paidById,
        amount: tx.amount, // integer cents from DB
        currency: tx.currency,
        splits: tx.splits.map((s) => ({ userId: s.userId, amount: s.amount })), // integer cents
      })),
      group.members.map((m: { user: { id: string; name: string } }) => ({ userId: m.user.id, name: m.user.name }))
    )

    // Convert cents to dollars at the API boundary
    const perCurrency = Object.fromEntries(
      Object.entries(rawDebts).map(([currency, data]) => [
        currency,
        {
          rawBalances: data.rawBalances.map(b => ({ ...b, balance: b.balance / 100 })),
          simplifiedDebts: data.simplifiedDebts.map(s => {
            const amountDollars = s.amount / 100
            return {
              ...s,
              amount: amountDollars,
              currency,
              venmoLink: currency === 'USD' && venmoMap.get(s.toId)
                ? buildVenmoUrl(venmoMap.get(s.toId) as string, amountDollars, `SplitWitMe: ${group.name}`)
                : null,
              venmoRequestLink: currency === 'USD' && venmoMap.get(s.fromId)
                ? buildVenmoRequestUrl(venmoMap.get(s.fromId) as string, amountDollars, `SplitWitMe: ${group.name}`)
                : null,
            }
          }),
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

// POST /groups/:id/debts/remind-all
// Sends a reminder to every person who owes the current user money in this group
debtsRouter.post('/remind-all', requireAuth, async (req, res, next) => {
  try {
    const { level } = z.object({ level: z.enum(['friendly', 'medium', 'angry']).default('medium') }).parse(req.body)

    const [membership, group] = await Promise.all([
      prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: req.params.id, userId: req.user!.id } },
      }),
      prisma.group.findUnique({
        where: { id: req.params.id },
        include: {
          members: { include: { user: true } },
          transactions: { include: { splits: true } },
        },
      }),
    ])
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' })
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const rawDebts = computeDebtsPerCurrency(
      group.transactions.map((tx: { paidById: string; amount: number; currency: string; splits: Array<{ userId: string; amount: number }> }) => ({
        paidById: tx.paidById,
        amount: tx.amount,
        currency: tx.currency,
        splits: tx.splits.map((s) => ({ userId: s.userId, amount: s.amount })),
      })),
      group.members.map((m: { user: { id: string; name: string } }) => ({ userId: m.user.id, name: m.user.name }))
    )

    const userMap = new Map(group.members.map((m: { user: { id: string; name: string; email: string } }) => [m.user.id, m.user]))
    const groupUrl = `${config.frontendUrl}/groups/${req.params.id}`
    const sym: Record<string, string> = { USD: '$', CAD: 'CA$' }

    let sent = 0
    if (config.resendApiKey) {
      for (const [currency, data] of Object.entries(rawDebts)) {
        for (const debt of data.simplifiedDebts) {
          if (debt.toId !== req.user!.id) continue
          const debtor = userMap.get(debt.fromId)
          if (!debtor) continue
          const amountStr = `${sym[currency] ?? currency}${(debt.amount / 100).toFixed(2)}`
          sendBalanceReminderEmail(debtor.email, debtor.name, req.user!.name, amountStr, group.name, groupUrl, level)
            .catch(err => console.error('Failed to send reminder email:', err))
          sent++
        }
      }
    }

    res.json({ sent })
  } catch (err) {
    next(err)
  }
})
