# MyPrideWont — Roadmap

What's built, what's next, and what's deferred.

---

## Phase 1: Web App Foundation (current plan)

**Plan:** `2026-03-19-mypridewont-web-app.md`
**Status:** Not started

Covers:
- T3 scaffold + Prisma schema + seed data
- Tailwind theme + design system (fonts, colors, cards)
- Shared password auth + login page
- App shell (nav, bottom nav, FAB, user picker)
- tRPC routers (user, activity, goal with plan import parser)
- Dashboard (countdown, fighter cards, activity feed)
- Manual activity entry modal
- Calendar (past/current/future week views)
- Activity log + detail pages
- Goals page (plan view timeline + import plans)

**Not included** (deferred to later phases):
- Streak computation (hardcoded to 0)
- Past-week stamp earned/failed calculation (hardcoded)
- Shame mark tallies (hardcoded to 0)
- Route maps (placeholder, needs Leaflet)
- Dynamic timeline window on goals page (hardcoded Mar–Aug 2026)

---

## Phase 2: Strava Sync

**Plan:** TBD
**Depends on:** Phase 1

### OAuth Flow
- Strava OAuth 2.0 consent screen
- Encrypted token storage in User.stravaToken
- Token refresh on expiry
- "Connect Strava" button on Activity Log page
- Per-user connection status indicator

### Manual Sync
- "Sync" button on Activity Log page
- Fetch activities since last sync via `GET /athlete/activities`
- Dedup by externalId (Strava activity ID)
- Map Strava activity types → our types
- Fetch splits/streams via `GET /activities/{id}/streams`
- Save Activity + Splits to DB
- Import summary toast ("Synced 3 new activities")

### Automatic Sync (Worker Cron)
- Runs at 10am, 3pm, 5pm, 10pm, 1am ET
- Same sync logic as manual
- Failures logged silently (no Signal spam)

### Route Maps
- Leaflet + OpenStreetMap integration
- Decode routePolyline → render on map in Activity Detail page
- No API key needed (OSM is free)

---

## Phase 3: Signal Worker

**Plan:** TBD
**Depends on:** Phase 1 (Phase 2 optional but nice-to-have for richer notifications)

### Infrastructure
- Separate Node.js container (mypridewont-worker)
- signal-cli running as daemon, communicating via JSON-RPC
- Dedicated phone number registered to Signal
- Shared DATABASE_URL with main app (Prisma)
- Internal HTTP endpoint on port 3001 for notifications from main app

### Inbound Messages (Activity Logging)
- Watch incoming Signal group messages
- Phone-to-user mapping via AppConfig
- Natural language parser for formats like:
  - "ran 5 miles 42 min"
  - "bike 12mi"
  - "yoga 45min"
  - "strength 30 min"
- On parse success: create Activity record + confirm in group chat
- On parse failure: reply with format hint

### Outbound Messages

**Activity logged** (real-time, triggered via internal HTTP from main app):
```
🏃 Jake logged a run
5.2 mi · 42:03 · 8:05/mi
Run 2/3 this week
```

**Shame report** (Monday morning cron):
```
🔔 Week 12 shame report

😤 Son — missed Run goal (1/3)
😤 Calder — missed Yoga goal (0/2)
✅ Jake — all goals met 💪
```

**Weekly summary** (Monday morning, after shame report):
```
📊 Week 12 Recap

Jake: 15.4 mi running · 2 strength sessions
Calder: 22.1 mi running · 38 mi biking · 1 yoga
Son: 8.2 mi running · 1 swim

23 weeks until marathon
```

### Cron Jobs (node-cron)
- Monday morning: shame report + weekly summary
- Strava auto-sync schedule (if Phase 2 complete)

---

## Phase 4: Computed Stats + Polish

**Plan:** TBD
**Depends on:** Phase 1

Things deferred from Phase 1 that need real data to be meaningful:

- **Streak computation** — count consecutive weeks where all goals were met per user
- **Past-week stamp status** — earned/failed based on goal completion for historical weeks
- **Shame mark tallies** — count total failed weeks per user
- **Dynamic goals timeline** — compute month window from actual goal date ranges + marathon date instead of hardcoded Mar–Aug
- **Activity log pagination** — cursor-based infinite scroll (router supports it, UI needs it)
- **Swipe-to-expand** on activity log rows (spec mentions touch-friendly interaction)

---

## Phase 5: Deployment

**Plan:** TBD
**Depends on:** Phase 1 (minimum), ideally Phase 2+3

### Target Environment
- **Host:** Personal NAS running Coolify
- **Domain:** mypridewontletmedownloadanapp.com
- **Access:** Tunnel from domain to deployed instance ports on NAS

### Coolify Services
- **mypridewont-app** — Next.js container, port 3000, public via tunnel
- **mypridewont-worker** — Node.js container, port 3001, internal only (app→worker on Coolify network)
- **mypridewont-db** — PostgreSQL, provisioned via Coolify, internal only
- Shared DATABASE_URL across app + worker
- Environment variables: SESSION_SECRET, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SIGNAL_PHONE_NUMBER

### Dockerfiles
- `Dockerfile.app` — multi-stage Next.js build
- `Dockerfile.worker` — Node.js + signal-cli daemon

### Local Dev
- `docker-compose.yml` already in Phase 1 plan (Postgres only)
- Can extend to include app + worker containers for full-stack local dev later

### DNS + SSL + Tunnel
- Cloudflare Tunnel routes mypridewontletmedownloadanapp.com → NAS Coolify ports
- SSL terminates at Cloudflare — Coolify serves HTTP internally
- Next.js config should trust `X-Forwarded-*` headers from Cloudflare (for cookies, redirects)
- No need for Let's Encrypt — Cloudflare handles certs

---

## Open Questions

- **Marathon date:** March or May 2027? Stored in AppConfig, configurable anytime.
- **Signal phone number:** Calder's friend's spare number — need to confirm availability and register with signal-cli before Phase 3.
- **Strava API rate limits:** 100 requests per 15 minutes, 1000 per day. With 2 users syncing 5x/day this is fine, but worth monitoring.
