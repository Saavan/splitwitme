import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') })
  }
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
}
