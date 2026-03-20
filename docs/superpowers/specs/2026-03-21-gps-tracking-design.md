# GPS Tracking Mode — Design Spec

## Overview

Extend the activity timer with an optional GPS tracking mode. When enabled, the app collects location data during a timed activity, computes distance automatically, and saves a route trace for map display. A fullscreen "lock screen" keeps the phone awake and the browser in focus during outdoor activities.

This spec extends the [Activity Timer spec](2026-03-20-activity-timer-design.md) and depends on it being implemented first — the `ActiveTimer` model and `timer` router must exist before this work begins. GPS tracking is an opt-in mode, not enabled by default.

## User Flow

1. User opens **StartTimerModal**, selects an outdoor activity type (run, hike, walk, bike)
2. A **"Track GPS" toggle** appears below the activity type grid (hidden for indoor types like strength, yoga, swim)
3. When toggled on, the browser requests location permission
4. User hits START — timer begins, GPS collection starts in the background
5. **TimerPanel** renders normally with an additional **lock icon button**
6. User taps lock — enters **fullscreen GPS lock screen** (black screen, grey timer, UNLOCK button)
7. User taps UNLOCK — exits fullscreen, returns to normal TimerPanel. GPS keeps tracking.
8. User ends the run — **EndTimerModal** shows distance pre-filled from GPS data (editable)
9. Activity is saved with a route polyline for map display

## Database

### ActiveTimer changes

Add two fields:

```prisma
model ActiveTimer {
  // ... existing fields from timer spec
  trackGps   Boolean @default(false)
  gpsPoints  Json?   // Array of { lat: number, lng: number, accuracy: number, timestamp: string }
}
```

### GPS points format

```json
[
  { "lat": 40.7128, "lng": -74.0060, "accuracy": 8.5, "timestamp": "2026-03-20T10:00:01Z" },
  { "lat": 40.7130, "lng": -74.0058, "accuracy": 6.2, "timestamp": "2026-03-20T10:00:04Z" }
]
```

### GPS points validation (Zod)

```typescript
const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime(),
});
const gpsPointsSchema = z.array(gpsPointSchema);
```

### Activity model — no changes

The existing `routePolyline` field stores the encoded route trace. The existing `distanceMi` field stores the GPS-computed distance. No schema changes needed.

## API

### New mutation: `timer.addGpsPoints`

| Procedure | Type | Input | Purpose |
|-----------|------|-------|---------|
| `timer.addGpsPoints` | mutation | `{ userId, points: GpsPoint[] }` | Append GPS points to active timer's `gpsPoints` array |

Implementation: read current `gpsPoints` (or `[]`), concat new points, write back. This is an append-only operation.

### Changes to existing timer API

| Procedure | Change |
|-----------|--------|
| `timer.start` | Add optional `trackGps: boolean` input. Sets `trackGps` on the ActiveTimer. |
| `timer.active` | Returns `trackGps` flag so the client knows to resume GPS on recovery. |
| `timer.end` | If `gpsPoints` exist: compute `distanceMi` via haversine, encode points into `routePolyline` (Google encoded polyline format), save both on the Activity. If `distanceMi` is provided in the `timer.end` input, use it as-is. Otherwise, compute from GPS points. The EndTimerModal always sends `distanceMi` (pre-filled from GPS, possibly edited by user), so the server always receives a value when GPS was active. |

### Distance computation (server-side)

```typescript
function haversineDistanceMi(points: GpsPoint[]): number {
  const R = 3959; // Earth radius in miles
  let total = 0;
  const filtered = points.filter((p) => p.accuracy <= 50);
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1];
    const curr = filtered[i];
    const dLat = toRad(curr.lat - prev.lat);
    const dLng = toRad(curr.lng - prev.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(prev.lat)) *
        Math.cos(toRad(curr.lat)) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return total;
}
```

Points with `accuracy > 50m` are filtered out to avoid GPS jumps.

### Polyline encoding

Use the Google encoded polyline algorithm to compress the GPS trace into the existing `routePolyline` string field. This is a well-known lossless-ish encoding that reduces storage significantly (e.g., 3,600 points → ~10KB string vs ~180KB JSON).

## UI Components

### 1. GPS toggle on StartTimerModal

Below the activity type grid, render a toggle row:
- Only visible when selected type is `run`, `hike`, `walk`, or `bike`
- Label: "Track GPS" (Barlow Condensed, uppercase)
- Standard toggle switch
- When toggled on, immediately call `navigator.geolocation.getCurrentPosition()` to trigger the permission prompt. If denied, show an inline error and disable the toggle.

### 2. Lock button on TimerPanel

When `trackGps` is true on the active timer:
- Add a small **lock icon button** (Lucide `Lock` icon) to the TimerPanel
- Tapping it enters the fullscreen GPS lock screen

### 3. GpsLockScreen (fullscreen component)

Pure black fullscreen overlay. Layout (centered vertically):
- "GPS TRACKING" — Barlow Condensed, 13px, letter-spacing 3px, uppercase, dark grey (#444)
- Activity type label (e.g., "RUN") — Barlow Condensed, 16px, dark grey (#333)
- Running timer — Bebas Neue, 64px, dark grey (#3a3a3a), computed from segments (same logic as TimerPanel)
- "UNLOCK" button — 1px border #444, transparent background, Barlow Condensed 14px, letter-spacing 3px

**Fullscreen mechanics:**
- Enter: `document.documentElement.requestFullscreen()`
- Also request Wake Lock: `navigator.wakeLock.request('screen')` (prevents sleep even if Fullscreen API alone doesn't)
- Exit: UNLOCK button calls `document.exitFullscreen()` and releases wake lock
- Listen for `fullscreenchange` event — if user exits via browser gesture (swipe/escape), component detects it and returns to normal TimerPanel
- No pause/end controls on this screen — user must unlock first

### 4. EndTimerModal changes

When GPS data exists:
- **Distance field** is pre-filled with the GPS-computed value (editable, user can override)
- Small label below: "from GPS" to indicate the source

### 5. Activity detail — route map

On the activity detail page (`/activities/[id]`), if `routePolyline` exists:
- Render a Leaflet map with OpenStreetMap tiles
- Decode the polyline and draw it as a colored line on the map
- Auto-fit the map bounds to the route
- No interaction needed — just a static visual of the route

## GPS Collection Engine

### React hook: `useGpsTracking`

```typescript
function useGpsTracking(
  enabled: boolean,
  userId: string,
): { isTracking: boolean; pointCount: number; error: string | null }
```

**Behavior:**
- When `enabled` is true, calls `navigator.geolocation.watchPosition()` with:
  ```js
  { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  ```
- Buffers incoming points in a ref
- Every 30 seconds, flushes the buffer via `timer.addGpsPoints` mutation
- On unmount (or when `enabled` changes to false), flushes any remaining points
- **On flush failure** (network error), retain the points in the buffer and retry on the next 30-second interval. Points are only cleared from the buffer after a successful mutation.
- Returns tracking status for UI feedback (not displayed on lock screen, but useful for debugging)

### Error handling

- **Permission denied:** Show inline error on StartTimerModal, disable GPS toggle. Timer can still start without GPS.
- **Position unavailable / timeout:** Skip the point, continue tracking. Brief GPS gaps are fine — connect with straight lines.
- **watchPosition error after start:** Log it, keep trying. GPS often recovers after brief signal loss.

## Timer Recovery with GPS

On app reload:
1. `timer.active` returns `trackGps: true`
2. The `useGpsTracking` hook restarts `watchPosition()` and resumes batch syncing
3. The lock screen is **not** re-entered automatically — user sees normal TimerPanel and can tap lock again
4. Any gap in GPS points (from the app being closed) is connected with a straight line — acceptable for a workout tracker

## File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `trackGps` and `gpsPoints` to `ActiveTimer` |
| `src/server/api/routers/timer.ts` | Add `addGpsPoints` mutation, update `start`/`end`/`active` |
| `src/lib/geo.ts` | New file — haversine distance, polyline encoding |
| `src/hooks/use-gps-tracking.ts` | New file — GPS collection hook |
| `src/components/gps-lock-screen.tsx` | New file — fullscreen lock screen |
| `src/components/start-timer-modal.tsx` | Add GPS toggle for outdoor types |
| `src/components/timer-panel.tsx` | Add lock button when GPS is active |
| `src/components/end-timer-modal.tsx` | Pre-fill distance from GPS |
| `src/app/activities/[id]/page.tsx` | Add route map when polyline exists |
| `package.json` | Add `leaflet`, `react-leaflet`, `@types/leaflet` |

## Dependencies

| Package | Purpose |
|---------|---------|
| `leaflet` | Map rendering on activity detail |
| `react-leaflet` | React bindings for Leaflet |
| `@types/leaflet` | TypeScript types |

No external API keys required. OpenStreetMap tiles are free.
