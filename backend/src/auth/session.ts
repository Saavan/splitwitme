import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { config } from '../config'

const PgStore = connectPgSimple(session)

export const sessionMiddleware = session({
  store: new PgStore({
    conString: config.databaseUrl,
    createTableIfMissing: true,
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
})
