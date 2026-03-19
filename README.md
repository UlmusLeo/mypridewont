# MyPrideWont

Marathon training tracker for Jake, Calder, and Son.

Built with the T3 stack: Next.js 15, tRPC v11, Prisma, Tailwind CSS v4, TypeScript, PostgreSQL.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for Postgres)

### Setup

```bash
# Install dependencies
npm install

# Start Postgres (runs on port 5433 to avoid conflicts)
docker compose up -d db

# Run database migration
npx prisma migrate dev

# Seed the database (creates users + marathon date config)
npx prisma db seed

# Start the dev server
npm run dev
```

The app will be running at http://localhost:3000. The first password you enter on the login page becomes the shared password.

### Useful Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run typecheck    # TypeScript type check
npx prisma studio    # Browse database in GUI
npx prisma migrate dev --name <name>  # Create a new migration
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (default: port 5433) |
| `SESSION_SECRET` | Secret for session tokens (any string in dev) |

### Project Structure

```
src/
  app/                  # Next.js App Router pages
    login/              # Shared password login
    dashboard/          # Fighter cards, countdown, feed
    calendar/           # Weekly tape with past/current/future views
    activities/         # Activity log + detail pages
    goals/              # Plan view timeline + import plans
  components/           # React components
    dashboard/          # Countdown, fighter card, feed
    calendar/           # Week-past, week-current, week-future
    goals/              # Plan card, add goal form, import card
    shell.tsx           # App shell (nav + bottom nav + FAB)
    log-modal.tsx       # Manual activity entry modal
  server/
    api/routers/        # tRPC routers (auth, user, activity, goal)
    auth.ts             # Password hashing + session tokens
    db.ts               # Prisma client singleton
  lib/
    constants.ts        # Users, activity types, Tailwind class maps
    utils.ts            # Date/time/pace formatting helpers
prisma/
  schema.prisma         # Database schema
  seed.ts               # Seed data (3 users + marathon config)
```

## TODO

### Phase 2: Strava Sync
- [ ] Strava OAuth 2.0 flow + encrypted token storage
- [ ] Manual sync button (fetch activities, dedup by externalId, import splits)
- [ ] Automatic sync via worker cron (10am, 3pm, 5pm, 10pm, 1am ET)
- [ ] Route maps with Leaflet + OpenStreetMap (decode routePolyline on activity detail)

### Phase 3: Signal Worker
- [ ] Separate Node.js container with signal-cli daemon (JSON-RPC)
- [ ] Inbound: parse natural language activity messages from Signal group
- [ ] Outbound: activity logged confirmation with goal progress
- [ ] Outbound: Monday morning shame report (who missed goals)
- [ ] Outbound: weekly recap summary

### Phase 4: Computed Stats + Polish
- [ ] Streak computation (consecutive weeks with all goals met)
- [ ] Past-week stamp status (earned/failed from goal completion history)
- [ ] Shame mark tallies (total failed weeks per user)
- [ ] Dynamic goals timeline (compute month window from goal dates + marathon date)
- [ ] Activity log infinite scroll (cursor pagination)

### Phase 5: Deployment
- [ ] Dockerfiles for app + worker
- [ ] Deploy to Coolify on NAS
- [ ] Cloudflare Tunnel to mypridewontletmedownloadanapp.com
- [ ] Production environment variables + secrets
