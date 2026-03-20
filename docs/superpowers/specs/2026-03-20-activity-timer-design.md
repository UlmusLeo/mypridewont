# Activity Timer Feature — Design Spec

## Overview

Add a live activity timer to the marathon training tracker. Users select an activity type, start a timer, pause/resume (creating segments), and end it to save. Timer state persists in the database so the app can be closed and resumed. Saved activities can be edited after the fact for manual corrections.

As part of this work, migrate all Unicode character icons across the app to Lucide React for visual consistency.

## Mockups

Visual mockups from the brainstorming session are in `.superpowers/brainstorm/1631-1774038482/`:

- [`timer-ui-states.html`](../../.superpowers/brainstorm/1631-1774038482/timer-ui-states.html) — All 6 UI states: idle FABs, activity select, running, paused, end/save, edit activity
- [`timer-running-v5.html`](../../.superpowers/brainstorm/1631-1774038482/timer-running-v5.html) — Final timer running/paused design: full-width bottom panel, 72px Bebas Neue clock, icon-only Lucide buttons (Pause/Square, Play/Square)

## Database

### New model: `ActiveTimer`

```prisma
model ActiveTimer {
  id           String   @id @default(cuid())
  userId       String
  activityType String
  startedAt    DateTime @default(now())
  segments     Json     // Array of { start: ISO string, end?: ISO string }
  status       String   // "running" | "paused"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@unique([userId]) // one active timer per user
}
```

**Segments format:**
```json
[
  { "start": "2026-03-20T10:00:00Z", "end": "2026-03-20T10:23:47Z" },
  { "start": "2026-03-20T10:25:00Z" }
]
```

- On start: create timer with one segment `[{ start: now }]`
- On pause: set `end` on the last segment, set status to `"paused"`
- On resume: push a new segment `{ start: now }`, set status to `"running"`
- On end: if running, close the last segment first. Compute total duration from all segments. Create Activity record, delete ActiveTimer. **This must be wrapped in a Prisma `$transaction`** to ensure atomicity.

### Segments validation (Zod)

All reads of the `segments` JSON field must be validated with a Zod schema:

```typescript
const segmentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
});
const segmentsSchema = z.array(segmentSchema);
```

Parse after every DB read: `segmentsSchema.parse(timer.segments)`.

### Activity model changes

No schema changes. The existing `Activity` model already has all needed fields. The new `activity.update` mutation enables editing saved activities.

### User model changes

Add relation:
```prisma
model User {
  // ... existing fields
  activeTimer ActiveTimer?
}
```

## API (tRPC routes)

### New router: `timer`

| Procedure | Type | Input | Purpose |
|-----------|------|-------|---------|
| `timer.start` | mutation | `{ userId, activityType }` | Create ActiveTimer with first segment |
| `timer.pause` | mutation | `{ userId }` | Close current segment, set status "paused" |
| `timer.resume` | mutation | `{ userId }` | Add new segment, set status "running" |
| `timer.end` | mutation | `{ userId, distanceMi?, durationOverrideSec?, notes? }` | Close segment if running, compute total duration (or use override), create Activity with `date` = `startedAt` date, delete timer. Wrapped in `$transaction`. |
| `timer.active` | query | `{ userId }` | Get active timer for user (or null) |

### New mutation on activity router: `activity.update`

| Procedure | Type | Input | Purpose |
|-----------|------|-------|---------|
| `activity.update` | mutation | `{ id, date?, type?, durationSec?, distanceMi?, notes? }` | Update any field on a saved activity. Recomputes pace for runs (same rule as `activity.create`). If type changes away from "run", clear pace. If type changes to "run" and distance+duration exist, compute pace. |

### Duration computation

```typescript
function computeTotalSeconds(segments: Segment[]): number {
  return segments.reduce((total, seg) => {
    const start = new Date(seg.start).getTime();
    const end = seg.end ? new Date(seg.end).getTime() : Date.now();
    return total + (end - start) / 1000;
  }, 0);
}
```

### Error handling and edge cases

- **Conflict:** `timer.start` returns an error if a timer already exists for the user. UI disables the start button when a timer is active.
- **Stale timer:** On recovery, if a timer has been running for more than 24 hours, show a warning banner: "Timer has been running for X hours. You can adjust the duration when you save." The timer still shows the real elapsed time but flags it.
- **Mutation pending:** Disable pause/resume/end buttons while a mutation is in flight to prevent double-taps.
- **`timer.end` failure:** Keep the EndTimerModal open so the user can retry.
- **Activity date:** The saved activity's `date` field uses the `startedAt` date (not the end date). If a timer starts at 11:50 PM and ends at 12:10 AM, the activity is recorded for the start date.
- **Known limitation:** Server-side `Date.now()` is used to close segments on end. Network latency may add a few seconds to the final segment — acceptable for a workout timer.

## UI Components

### 1. Stacked FABs (idle state)

In `fab.tsx`, render two buttons stacked vertically on the right:
- **Top:** Red (+) button — opens existing LogModal (unchanged)
- **Bottom:** Green (Play icon) button — opens StartTimerModal

Both hidden when a timer is active (replaced by timer panel).

### 2. StartTimerModal

Full-screen modal matching LogModal's style. Contains:
- Header: "START TIMER" (Bebas Neue, red accent)
- Activity type grid — extract into shared `ActivityTypeGrid` component (`src/components/activity-type-grid.tsx`) with props `{ selected: ActivityType; onSelect: (t: ActivityType) => void }`
- Green "START" button (Bebas Neue, full width)
- Back button

On start: calls `timer.start`, closes modal, timer panel appears.

### 3. TimerPanel (running state)

Replaces the FAB area. Anchored to the bottom of the screen, full-width panel:
- **Activity label:** Barlow Condensed, uppercase, muted (e.g., "RUN")
- **Timer display:** Bebas Neue, 72px, green (#22c55e), shows `MM:SS` or `H:MM:SS`
- **Segment label:** Barlow Condensed, small, muted (e.g., "Segment 1")
- **Buttons:** Two equal-width buttons side by side
  - Pause: yellow (#eab308) with Lucide `Pause` icon (32px)
  - End: red (#c32530) with Lucide `Square` icon (32px)
- Hard corners, 2px borders, 3px box shadows — matching the app's card style
- Timer panel z-index: `z-[51]` (same as FAB — above bottom nav, below modals)
- All icon-only buttons must have `aria-label` attributes for accessibility

Timer updates every second via `setInterval`. Computes elapsed from segments data (not a local counter) so it stays accurate across re-renders and app restores.

### 4. TimerPanel (paused state)

Same panel, different styling:
- **Status label:** "PAUSED" in yellow
- **Timer display:** Yellow (#eab308), 70% opacity
- **Segment info:** Shows completed segment duration
- **Border-top:** Yellow accent instead of white
- **Buttons:**
  - Resume: green (#22c55e) with Lucide `Play` icon (32px)
  - End: red (#c32530) with Lucide `Square` icon (32px)

### 5. EndTimerModal (save screen)

Full-screen modal shown when user hits End:
- Header: "SAVE [TYPE]" (Bebas Neue, red accent)
- **Total duration:** Large Bebas Neue display (computed from segments)
- **Segment breakdown:** List showing each segment's duration
- **Distance input:** Same style as LogModal (shown for distance-type activities)
- **Duration override:** Editable field pre-filled with computed time (for manual correction)
- **Notes:** Optional textarea
- **"SAVE IT" button:** Red, full width, Bebas Neue

On save: calls `timer.end` which creates the Activity and deletes the timer.

### 6. Edit Activity

On the existing activity detail page (`/activities/[id]`), add an "EDIT" button that opens an EditActivityModal:
- Pre-filled form with all current values
- Editable fields: type, date, distance, duration, notes
- "SAVE CHANGES" button
- Calls `activity.update` mutation

## Timer Recovery

On app load (in the Shell component or a provider):
1. Query `timer.active` for the current user
2. If an active timer exists, render the TimerPanel in the correct state (running/paused)
3. Timer display computes elapsed time from the persisted segments — no data loss even if the app was closed for hours
4. If the timer has been running for more than 24 hours, show a warning banner suggesting the user may have forgotten to stop it
5. Timer mutations should invalidate the `timer` query cache. `timer.end` must also invalidate the `activity` and `goal` caches since it creates a new Activity record.

## Lucide React Migration

Install `lucide-react` and replace all Unicode character icons:

### Activity type icons

Create a new `src/components/activity-icons.tsx` that maps activity types to Lucide components. Keep `constants.ts` as pure data (no React imports) since it's used in server-side code. The new file exports an `ACTIVITY_ICON_COMPONENTS: Record<ActivityType, LucideIcon>` map.

| Type | Current Unicode | Lucide Icon |
|------|----------------|-------------|
| run | `\u25B6` (▶) | `Footprints` |
| bike | `\u25CF` (●) | `Bike` |
| swim | `\u2248` (≈) | `Waves` |
| strength | `\u25B2` (▲) | `Dumbbell` |
| yoga | `\u2726` (✦) | `Flower2` |
| hike | `\u25B2` (▲) | `Mountain` |
| walk | `\u2022` (•) | `PersonStanding` |
| other | `\u22EF` (⋯) | `Ellipsis` |

### Navigation icons (`bottom-nav.tsx`, `sidebar.tsx`)

| Nav item | Current Unicode | Lucide Icon |
|----------|----------------|-------------|
| Home | `■` / `\u25A0` | `Home` |
| Calendar | `□` / `\u25A1` | `Calendar` |
| Log | `☰` / `\u2630` | `ClipboardList` |
| Goals | `▲` / `\u25B2` | `Target` |

### Other icons

| Location | Current | Lucide Icon |
|----------|---------|-------------|
| LogModal back button | `&larr;` | `ArrowLeft` |
| Activity detail back | `&larr;` | `ArrowLeft` |
| Calendar checkmark | `&#10003;` | `Check` |
| FAB add button | `+` text | `Plus` |
| FAB start button | (new) | `Play` |

### Timer-specific icons

| Usage | Lucide Icon |
|-------|-------------|
| Pause button | `Pause` |
| Stop/End button | `Square` |
| Resume button | `Play` |

## File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ActiveTimer` model, add relation on `User` |
| `src/server/api/root.ts` | Register `timerRouter` |
| `src/server/api/routers/timer.ts` | New file — timer CRUD procedures |
| `src/server/api/routers/activity.ts` | Add `activity.update` mutation |
| `src/lib/constants.ts` | Remove `ACTIVITY_ICONS` string map (keep other exports unchanged) |
| `src/components/activity-icons.tsx` | New file — Lucide icon map for activity types |
| `src/components/fab.tsx` | Stacked FABs + timer panel integration |
| `src/components/start-timer-modal.tsx` | New file — activity select + start |
| `src/components/timer-panel.tsx` | New file — running/paused timer display |
| `src/components/end-timer-modal.tsx` | New file — save screen after ending |
| `src/components/edit-activity-modal.tsx` | New file — edit saved activity |
| `src/components/log-modal.tsx` | Extract shared activity type grid, use Lucide icons |
| `src/components/bottom-nav.tsx` | Replace Unicode with Lucide icons |
| `src/components/sidebar.tsx` | Replace Unicode with Lucide icons |
| `src/components/shell.tsx` | Add timer recovery check on mount |
| `src/app/activities/[id]/page.tsx` | Add edit button, replace back arrow |
| `src/components/calendar/week-current.tsx` | Replace checkmark with Lucide `Check` |
| `package.json` | Add `lucide-react` dependency |
