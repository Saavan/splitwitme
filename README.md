# SplitWitMe

A Splitwise clone for splitting expenses with friends.

## Features

- Google OAuth authentication
- Create groups and add members
- Log expenses with flexible splits (equal or custom)
- Debt simplification algorithm (minimizes number of settlements)
- Venmo payment links for settling up

## Tech Stack

**Backend**: Express + TypeScript + Prisma + PostgreSQL (Neon) + Passport.js
**Frontend**: React + Vite + TypeScript + TanStack Query + Tailwind CSS

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- Google OAuth credentials

### Backend Setup

1. Copy `.env.example` to `backend/.env` and fill in values
2. Run database migrations:
   ```bash
   npm run db:migrate --workspace=backend
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

### Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://...
SESSION_SECRET=<64-char hex>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:3001
```

## Deployment

### Vercel + Neon

1. Push to GitHub
2. Create two Vercel projects from the same repo:
   - Frontend: root dir = `frontend/`
   - Backend: root dir = `backend/`
3. Add Neon PostgreSQL via Vercel Dashboard → Storage
4. Set environment variables in each Vercel project

### Google OAuth Setup

1. Create OAuth 2.0 credentials at console.cloud.google.com
2. Add authorized redirect URIs:
   - Dev: `http://localhost:3001/auth/google/callback`
   - Prod: `https://your-backend.vercel.app/auth/google/callback`
