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
| paceSecPerMi  | Int?     | Computed, runs only                        |
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
- Monthly view, all 3 users color-coded
- Activity type dots on days (run, bike, strength, yoga, etc.)
- Shame marks (red) on weeks where goals were missed
- Click a day to see that day's activities for everyone
- Week rows show goal completion status

### Activity Log
- Filterable list of all activities (by person, type, date range)
- Each row: date, person, type, distance, duration, pace
- Click to expand: splits, route map, HR data, notes
- "+ Log Activity" button for manual entry form
- "Sync" button for Strava OAuth flow and activity import

### Goals
- View current active goals for each person
- Add/edit/end goals with activity type, frequency, optional distance/duration targets, start/end dates
- Visual timeline showing how goals ramp up over time
- Historical shame mark tally per person

### Activity Detail
- Full stats: distance, duration, pace, elevation, HR, calories
- Mile splits table (if available from sync)
- Route map via Leaflet + OpenStreetMap (if polyline exists)
- Notes

### Navigation
Top nav bar: logo/name, Dashboard, Calendar, Activity Log, Goals, user picker dropdown.

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

Strava provides: distance, duration, pace, splits, elevation, HR, calories, route polyline, activity type.

## Deployment (Coolify)

Three services in Coolify:

1. **mypridewont-app** — Next.js container (T3 app), exposes port 3000
2. **mypridewont-worker** — Node.js container (signal-cli + cron + message listener), exposes port 3001 (internal only)
3. **mypridewont-db** — PostgreSQL, provisioned via Coolify, internal network only

The app container calls the worker's internal HTTP endpoint for activity notifications. Both containers share the same DATABASE_URL.

## Marathon Target

March or May 2027 (TBD). Stored in AppConfig as `marathon_date`, configurable. Displayed as a countdown on the dashboard.
