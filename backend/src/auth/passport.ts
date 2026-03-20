import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Express } from 'express'
import { prisma } from '../db'
import { config } from '../config'

declare global {
  namespace Express {
    interface User {
      id: string
      email: string
      name: string
      avatarUrl: string | null
      venmoHandle: string | null
    }
  }
}

export function initPassport(app: Express) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(new Error('No email from Google'))

          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value ?? null,
            },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value ?? null,
            },
          })

          done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            venmoHandle: user.venmoHandle,
          })
        } catch (err) {
          done(err as Error)
        }
      }
    )
  )

  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) return done(null, false)
      done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        venmoHandle: user.venmoHandle,
      })
    } catch (err) {
      done(err)
    }
  })

  app.use(passport.initialize())
  app.use(passport.session())
}
