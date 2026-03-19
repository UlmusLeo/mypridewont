# MyPrideWont — Design Spec

A marathon training tracker built because Calder won't download Strava. Three friends (Jake, Calder, Son) training for a marathon in early 2027 need a private way to track activities, share progress, and hold each other accountable via shame marks.

## Stack

- **Main App:** T3 Stack — Next.js, tRPC, Prisma, Tailwind, TypeScript
- **Worker:** Node.js sidecar — signal-cli daemon, node-cron, Prisma
- **Database:** PostgreSQL, provisioned via Coolify
- **Maps:** Leaflet + OpenStreetMap (free, no API key)
- **Deployment:** Coolify on personal server — 2 containers (app + worker) + Postgres

## Users & Data Sources

| User   | Platform | Sync Source          | Other Input             |
|--------|----------|----------------------|-------------------------|
| Jake   | Android  | Strava API (OAuth)   | Signal logging, manual  |
| Son    | iPhone   | Strava API (OAuth)   | Signal logging, manual  |
| Calder | Android  | None                 | Signal logging, manual  |

All three can log activities via Signal messages to the group chat. The bot parses natural language like "ran 5mi 42min" and creates an activity record.

## Authentication

Single shared password — no usernames, no accounts. A login page accepts the password and sets a session cookie. All routes check for it. Once inside, a user picker in the nav bar switches between Jake, Calder, and Son (stored in localStorage). All data is visible to everyone regardless of selected user.

## Data Model

### User

| Field       | Type    | Notes                              |
|-------------|---------|-------------------------------------|
| id          | String  | cuid                                |
| name        | String  | "Jake", "Calder", "Son"            |
| dataSource  | String  | "strava" \| "manual"               |
| stravaToken | String? | Encrypted OAuth token               |

### Activity

| Field         | Type     | Notes                                      |
|---------------|----------|--------------------------------------------|
| id            | String   | cuid                                       |
| userId        | String   | FK → User                                  |
| date          | Date     | Date only, no time-of-day                  |
| type          | String   | "run" \| "bike" \| "swim" \| "strength" \| "yoga" \| "hike" \| "walk" \| "other" |
| source        | String   | "manual" \| "strava" \| "signal"           |
| externalId    | String?  | Unique, for dedup on sync                  |
| notes         | String?  |                                             |
| durationSec   | Int      | Always required                            |
| distanceMi    | Float?   | Null for strength/yoga                     |
| paceSecPerMi  | Int?     | Computed and stored at write time, runs only |
| elevGainFt    | Float?   | From sync                                  |
| avgHeartRate  | Int?     | From sync                                  |
| maxHeartRate  | Int?     | From sync                                  |
| calories      | Int?     | From sync                                  |
| routePolyline | String?  | Encoded polyline for runs & rides          |

### Split

| Field        | Type   | Notes                    |
|--------------|--------|--------------------------|
| id           | String | cuid                     |
| activityId   | String | FK → Activity            |
| mileNumber   | Int    | 1, 2, 3...              |
| durationSec  | Int    | Time for this mile       |
| paceSecPerMi | Int    | Pace for this mile       |
| elevGainFt   | Float? | Elevation gain this mile |
| avgHeartRate | Int?   | Avg HR this mile         |

### WeeklyGoal

| Field             | Type     | Notes                                 |
|-------------------|----------|---------------------------------------|
| id                | String   | cuid                                  |
| userId            | String   | FK → User                             |
| activityType      | String   | "run" \| "bike" \| "strength" \| etc. |
| timesPerWeek      | Int      | e.g. 3                                |
| targetDistanceMi  | Float?   | Optional min distance per session     |
| targetDurationMin | Int?     | Optional min duration per session     |
| startDate         | Date     |                                       |
| endDate           | Date?    | Null = ongoing                        |

Goals are composable. A user can have multiple goals of the same activity type to represent ramping intensity. Example: "run 2x/week at 3mi" + "run 1x/week at 6mi". Each goal is checked independently at end of week.

### AppConfig

Key-value store for settings: marathon date, Signal group ID, phone-to-user mappings.

## Pages

### Login
Shared password input. Sets session cookie on success.

### Dashboard (Home)
- Per-person cards showing this week's goal progress (progress bars)
- Recent activity feed (last 10 activities across all users)
- Marathon countdown ("X weeks until marathon")
- Current streak per person (weeks without a shame mark)

### Calendar
Scrollable weekly tape with "Today" button that centers the current week. Shows 5 weeks at a time with top/bottom fade to indicate scroll.

- **Past weeks:** Day grid with activity pills (initial + type + distance). Week header shows earned/failed stamps per person.
- **Current week:** Expanded day grid with checkmark validation on completed activities. Goal tally below showing progress against each composable goal (e.g. "J: Run 3mi 2/2, Run 4mi 0/1"). Today column highlighted.
- **Future weeks:** No day grid — goal banners spanning the full width showing each person's plan as frequency targets (e.g. "J | Run 3mi ×2").

### Activity Log
- Filterable list of all activities (by person, type, date range)
- Each row: date, person, type, distance, duration, pace
- Click to expand: splits, route map, HR data, notes
- "+ Log Activity" button for manual entry form
- "Sync" button for Strava OAuth flow and activity import

### Goals (two tabs: Plan View / Import Plans)

**Plan View:**
- Per-person cards with timeline visualization showing goals as horizontal bars across months
- Red "NOW" marker on timeline to show current position
- Shame mark tally badge per person
- "+ Add Goal" inline form on each card for quick single-goal entry (activity type, distance, frequency, date range)

**Import Plans:**
- One card per person with a monospace text editor
- "Upload File" button to load a `.txt` plan file per person
- "Apply Plan" button to parse and create WeeklyGoals
- Plan file format (one goal per line):
  ```
  run 3mi x2, mar 23 - may 31
  run 4mi x1, mar 23 - may 31
  strength x2, mar 23           # no end = ongoing
  run 5mi x2, jun 1 - aug 31   # ramp up phase
  ```
- Can also paste/edit directly in the text area

### Activity Detail
- Full stats: distance, duration, pace, elevation, HR, calories
- Mile splits table (if available from sync)
- Route map via Leaflet + OpenStreetMap (if polyline exists)
- Notes

### Navigation
Top nav bar: logo/name, Dashboard, Calendar, Activity Log, Goals, user picker dropdown.

### Floating Action Button
Red "+" FAB in bottom-right corner (above bottom nav) on every page. Opens the manual activity entry form (dark full-screen modal).

### Design System
Vintage athletic club aesthetic. See `docs/superpowers/mockups/` for reference HTML mockups.
- **Fonts:** Bebas Neue (headers), Barlow Condensed (labels/badges), Barlow (body)
- **Colors:** Cream paper background (#f5f0e8), ink (#1a1714), red (#c4342d) for shame/accents, green (#2d6b4a) for success. User colors: Jake (steel blue #4a6277), Calder (amber #c47d1a), Son (muted purple #6b5278).
- **Cards:** White background, 2px ink border, 3px hard box-shadow. No soft drop-shadows.
- **Texture:** Subtle noise overlay on backgrounds.
- **Login button:** "GET IN ME" (inside joke).

### Mobile-First UI
All pages must be mobile-friendly — this is primarily a phone app for checking on the go. Tailwind responsive utilities throughout. Key considerations:
- Nav bar collapses to hamburger menu on mobile
- Dashboard cards stack vertically
- Calendar adapts to week view on small screens
- Activity log rows are touch-friendly with swipe-to-expand
- Manual entry form is thumb-reachable

## Signal Integration

Uses signal-cli running as a daemon in the worker container. A dedicated phone number (Calder's friend's spare number) is registered and added to the group chat with all three users.

### Outbound Messages

**Activity logged** (real-time, triggered via internal HTTP from main app to worker):
```
🏃 Jake logged a run
5.2 mi · 42:03 · 8:05/mi
Run 2/3 this week
```

**Shame report** (Monday morning, cron):
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

### Inbound Messages (Activity Logging via Signal)

The worker watches incoming Signal messages. Phone numbers are mapped to users via AppConfig.

Supported formats (flexible parsing):
- "ran 5 miles 42 min"
- "bike 12mi"
- "yoga 45min"
- "strength 30 min"

On successful parse, the bot confirms:
```
✅ Logged for Calder: Run · 5.0 mi · 42:00 · 8:24/mi
```

On parse failure:
```
Calder, I didn't catch that. Try something like: ran 5mi 42min
```

### Worker Architecture

- **signal-cli** runs as a daemon, worker communicates via JSON-RPC
- **node-cron** schedules Monday morning jobs (shame report + weekly summary)
- **Internal HTTP endpoint** receives notifications from main app when activities are logged via web UI or Strava sync
- **Message listener** on signal-cli for inbound activity logging
- **Prisma** shared schema for DB access

## Strava Sync

OAuth 2.0 flow for Jake and Son.

### Manual Sync
1. User clicks "Sync" on Activity Log page
2. If no token: redirect to Strava OAuth consent → store encrypted token
3. If token exists: refresh if expired, then proceed
4. Fetch activities since last sync from `GET /athlete/activities`
5. For each activity:
   - Check externalId (Strava activity ID) — skip if already imported
   - Map Strava activity type to our types
   - Fetch splits/streams from `GET /activities/{id}/streams`
   - Save Activity + Splits to DB
6. Notify worker for each new activity (Signal messages)
7. Show import summary: "Synced 3 new activities"

### Automatic Sync (Worker Cron)
The worker runs automatic Strava syncs for all connected users on this schedule (all times ET):
- 10:00 AM ET
- 3:00 PM ET (noon PT)
- 5:00 PM ET (afternoon)
- 10:00 PM ET
- 1:00 AM ET (10:00 PM PT)

Same sync logic as manual — fetch since last sync, dedup, save, notify Signal. Failures are logged silently (no Signal spam for sync errors).

Strava provides: distance, duration, pace, splits, elevation, HR, calories, route polyline, activity type.

## Deployment (Coolify)

Three services in Coolify:

1. **mypridewont-app** — Next.js container (T3 app), exposes port 3000
2. **mypridewont-worker** — Node.js container (signal-cli + cron + message listener), exposes port 3001 (internal only)
3. **mypridewont-db** — PostgreSQL, provisioned via Coolify, internal network only

The app container calls the worker's internal HTTP endpoint for activity notifications. Both containers share the same DATABASE_URL.

## Marathon Target

March or May 2027 (TBD). Stored in AppConfig as `marathon_date`, configurable. Displayed as a countdown on the dashboard.
