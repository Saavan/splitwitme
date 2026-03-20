import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/requireAuth'
import { simplifyDebts } from '../lib/debtSimplifier'
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

    // Calculate net balances
    const balanceMap = new Map<string, { name: string; balance: number }>()
    for (const { user } of group.members) {
      balanceMap.set(user.id, { name: user.name, balance: 0 })
    }

    for (const tx of group.transactions) {
      for (const split of tx.splits) {
        const splitAmount = Number(split.amount)
        // Payer gets credited
        const payer = balanceMap.get(tx.paidById)
        if (payer) payer.balance += splitAmount

        // Split user gets debited
        const splitUser = balanceMap.get(split.userId)
        if (splitUser) splitUser.balance -= splitAmount
      }
    }

    const rawBalances = Array.from(balanceMap.entries()).map(([userId, { name, balance }]) => ({
      userId,
      name,
      balance: Math.round(balance * 100) / 100,
    }))

    const settlements = simplifyDebts(rawBalances)

    // Build venmo links
    const userVenmoMap = new Map(group.members.map((m: { user: { id: string; venmoHandle: string | null } }) => [m.user.id, m.user.venmoHandle]))
    const simplifiedDebts = settlements.map(s => ({
      ...s,
      venmoLink: userVenmoMap.get(s.toId)
        ? buildVenmoUrl(userVenmoMap.get(s.toId) as string, s.amount, `SplitWitMe: ${group.name}`)
        : null,
    }))

    res.json({ rawBalances, simplifiedDebts })
  } catch (err) {
    next(err)
  }
})
