import { Router } from 'express'
import { authRouter } from './auth'
import { groupsRouter } from './groups'
import { membersRouter } from './members'
import { transactionsRouter } from './transactions'
import { debtsRouter } from './debts'

export const router = Router()

router.use(authRouter)
router.use(groupsRouter)
router.use('/groups/:id/members', membersRouter)
router.use('/groups/:id/transactions', transactionsRouter)
router.use('/groups/:id/debts', debtsRouter)
