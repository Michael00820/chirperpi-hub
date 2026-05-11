# ChirperPi Hub

A decentralized social networking platform built for the Pi Network ecosystem. Features real-time messaging, community governance (proposals and voting), Pi cryptocurrency transactions, social posts, groups, and user profiles.

## Architecture

This is a monorepo with three workspaces:

- `client/` — React + Vite frontend (TypeScript, Tailwind CSS, Framer Motion, Socket.io-client)
- `server/` — Node.js + Express backend (TypeScript, PostgreSQL, Redis, Socket.io)
- `shared/` — Shared TypeScript types used by both client and server

## Workflows

- **Start application** — Runs `cd client && npm run dev` on port 5000 (webview)
- **Backend API** — Runs Redis + `cd server && npm run dev` on port 3001 (console)

## Environment Variables

All environment variables are configured in Replit secrets/env vars. Key vars:
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `REDIS_URL` — Redis connection (defaults to `redis://localhost:6379`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `CSRF_SECRET`
- `PI_API_KEY`, `PI_SECRET` — Pi Network API credentials (user must provide)
- `PINATA_API_KEY`, `PINATA_API_SECRET` — IPFS storage (user must provide)
- `SENTRY_DSN` — Error tracking (optional)

## Database

Uses Replit's built-in PostgreSQL. Migrations are in `server/migrations/` and tracked in `_migrations` table. Run with:
```
cd server && npm run migrate
```

## Development Notes

- Redis must be running before the server starts (handled by Backend API workflow)
- The `shared` package must be built before client/server: `cd shared && npm run build`
- Client uses Vite alias `shared -> ../shared/src` for TypeScript imports
- Server uses relative path `../../../shared/src/auth` for shared imports

## User Preferences

- No emojis in code or comments unless explicitly requested
