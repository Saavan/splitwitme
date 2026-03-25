import { Router } from 'express'
import { authRouter } from './auth'
import { groupsRouter } from './groups'
import { membersRouter, usersRouter } from './members'
import { transactionsRouter } from './transactions'
import { debtsRouter } from './debts'
import { invitesRouter, publicInvitesRouter } from './invites'

export const router = Router()

router.use(authRouter)
router.use(usersRouter)
router.use(groupsRouter)
router.use('/groups/:id/members', membersRouter)
router.use('/groups/:id/transactions', transactionsRouter)
router.use('/groups/:id/debts', debtsRouter)
router.use('/groups/:id/invites', invitesRouter)
router.use('/invites', publicInvitesRouter)
