import express from 'express'
import cors from 'cors'
import { config } from './config'
import { sessionMiddleware } from './auth/session'
import { initPassport } from './auth/passport'
import { router } from './routes'
import { errorHandler } from './middleware/errorHandler'

export const app = express()

// Trust proxy (required for Vercel/Render/Railway)
app.set('trust proxy', 1)

// CORS must be before session middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session
app.use(sessionMiddleware)

// Passport
initPassport(app)

// Routes
app.use(router)

// Error handler (last)
app.use(errorHandler)

export default app
