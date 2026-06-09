# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install              # Install dependencies
npm run dev:all          # Start frontend (port 3010) + backend (port 3000) concurrently
npm run dev              # Frontend only (Vite dev server on port 3010)
npm run dev:server       # Backend only (tsx watch on port 3000)
npm run build            # Production build (outputs to dist/)
```

Docker:
```bash
docker-compose up -d     # Build and run
docker-compose logs -f   # Tail logs
```

## Required Environment Variables

```bash
GOOGLE_CLIENT_ID=        # Google OAuth 2.0 client ID (required)
JWT_SECRET=              # Min 32 chars; generate with: openssl rand -hex 32
PORT=3000                # Optional, defaults to 3000
DB_PATH=./data/zeptrack.db  # Optional SQLite path
```

## Architecture

**Two-process dev setup**: Vite (port 3010) proxies `/api/*` → Express (port 3000). In production Docker, Express serves the built Vite output as static files.

**Frontend** (React 19 + TypeScript + Tailwind):
- `index.tsx` / `App.tsx` — entry point and root component
- `types.ts` — shared TypeScript interfaces (single source of truth for `WeightEntry`, `User`, `AuthState`, etc.)
- `contexts/AuthContext.tsx` — auth state and actions via `useAuth()` hook
- `services/storageService.ts` — all API calls for entries/profile
- `services/authService.ts` — all API calls for auth (login, MFA, sessions)
- `components/` — UI components; `components/auth/` for auth flows, `components/ui/` for shared primitives

**Backend** (`server/`):
- `server/index.ts` — Express app setup, rate limiting (in-memory), CORS, middleware wiring
- `server/database.ts` — All SQLite access via `better-sqlite3`; single `Database` class instance passed via `req.db`
- `server/routes/` — `auth.ts`, `entries.ts`, `profile.ts`, `admin.ts`
- `server/middleware/auth.ts` — `authRequired`, `adminRequired`, `mfaPending` middleware; extends `express.Request` with `userId`, `userRole`, `mfaVerified`
- `server/services/` — `oauth.ts` (Google token verification), `jwt.ts` (sign/verify JWTs), `mfa.ts` (TOTP + email codes), `email.ts` (nodemailer)
- `server/validation.ts` — Input validation/sanitization for all entry and profile fields

**Auth flow**: Google OAuth ID token → verified server-side → JWT in HTTP-only cookie. MFA state tracked in JWT payload (`mfaVerified` field). Sessions also stored in SQLite for revocation. First registered user becomes admin automatically.

**Database**: SQLite via `better-sqlite3` (synchronous API). DB is initialized at startup via `db.initialize()`. The `Database` instance is attached to each request as `req.db` by middleware in `server/index.ts`.

**MFA**: Two methods — TOTP (otplib, SHA1/6-digit/30s) and email codes (bcrypt-hashed). Brute-force protection: 5 attempts before 15-minute block, tracked in-memory per user. TOTP replay protection tracked in DB. Backup codes are bcrypt-hashed and stored in DB.
