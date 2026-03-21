# GPS Tracking Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in GPS tracking to the activity timer — collect location points during outdoor activities, compute distance, show routes on a map, and provide a fullscreen lock screen for outdoor use.

**Architecture:** GPS collection runs client-side via `navigator.geolocation.watchPosition()`, buffered in a React hook and batch-synced to the server every 30s. The server stores raw points on `ActiveTimer.gpsPoints` (JSON), then on timer end computes haversine distance and encodes the route as a Google polyline into the existing `Activity.routePolyline` field. A fullscreen lock screen uses the Fullscreen API + Wake Lock API to keep the screen on during outdoor activities. Leaflet renders the saved route on the activity detail page.

**Tech Stack:** Next.js 15 (App Router), tRPC 11, Prisma 6, React 19, Zod, Leaflet + react-leaflet, Tailwind CSS 4, lucide-react

---

## File Structure

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `trackGps` and `gpsPoints` fields to `ActiveTimer` |
| `src/lib/geo.ts` | Haversine distance, polyline encoding, GPS point Zod schema |
| `src/server/api/routers/timer.ts` | Add `addGpsPoints` mutation, update `start`/`end`/`active` |
| `src/hooks/use-gps-tracking.ts` | Client-side GPS collection hook with batch sync |
| `src/components/start-timer-modal.tsx` | Add GPS toggle for outdoor activity types |
| `src/components/timer-panel.tsx` | Add lock button when GPS is active |
| `src/components/gps-lock-screen.tsx` | Fullscreen black lock screen with timer |
| `src/components/end-timer-modal.tsx` | Pre-fill distance from GPS data |
| `src/components/route-map.tsx` | Leaflet map component for activity detail |
| `src/app/activities/[id]/page.tsx` | Replace placeholder with route map |
| `src/components/fab.tsx` | Wire GPS tracking hook + lock screen state |

---

## Task 1: Database — Add GPS fields to ActiveTimer

**Files:**
- Modify: `prisma/schema.prisma:75-86`

- [ ] **Step 1: Add fields to ActiveTimer model**

Add `trackGps` and `gpsPoints` to the `ActiveTimer` model:

```prisma
model ActiveTimer {
  id           String   @id @default(cuid())
  userId       String   @unique
  activityType String
  startedAt    DateTime @default(now())
  segments     Json     // Array of { start: ISO string, end?: ISO string }
  status       String   // "running" | "paused"
  trackGps     Boolean  @default(false)
  gpsPoints    Json?    // Array of { lat, lng, accuracy, timestamp }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name add-gps-to-active-timer
```

Expected: Migration created, Prisma client regenerated. Existing `ActiveTimer` rows (if any) get `trackGps: false` and `gpsPoints: null`.

- [ ] **Step 3: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS — no type errors (new fields are optional/defaulted).

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add trackGps and gpsPoints fields to ActiveTimer"
```

---

## Task 2: Geo utilities — haversine distance + polyline encoding

**Files:**
- Create: `src/lib/geo.ts`

- [ ] **Step 1: Create `src/lib/geo.ts` with GPS point schema, haversine, and polyline encoder**

```typescript
import { z } from "zod";

// --- Zod schema ---

export const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime(),
});

export const gpsPointsSchema = z.array(gpsPointSchema);

export type GpsPoint = z.infer<typeof gpsPointSchema>;

// --- Outdoor types that support GPS ---

export const GPS_ACTIVITY_TYPES = ["run", "hike", "walk", "bike"] as const;

export function isGpsActivityType(type: string): boolean {
  return (GPS_ACTIVITY_TYPES as readonly string[]).includes(type);
}

// --- Haversine distance ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute total distance in miles from an array of GPS points.
 * Filters out points with accuracy > 50m to avoid GPS jumps.
 */
export function haversineDistanceMi(points: GpsPoint[]): number {
  const R = 3959; // Earth radius in miles
  const filtered = points.filter((p) => p.accuracy <= 50);
  let total = 0;
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1]!;
    const curr = filtered[i]!;
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

// --- Google encoded polyline ---

/**
 * Encode an array of GPS points into a Google encoded polyline string.
 * See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function encodePolyline(points: GpsPoint[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let result = "";

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    result += encodeSignedValue(lat - prevLat);
    result += encodeSignedValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }

  return result;
}

function encodeSignedValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
}

/**
 * Decode a Google encoded polyline string into lat/lng pairs.
 */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/geo.ts
git commit -m "feat: add geo utilities — haversine distance + polyline encode/decode"
```

---

## Task 3: API — Update timer router for GPS

**Files:**
- Modify: `src/server/api/routers/timer.ts`

This task has three sub-parts: update `timer.start`, add `timer.addGpsPoints`, and update `timer.end` + `timer.active`.

- [ ] **Step 1: Add imports at top of timer.ts**

Add at line 3 (after existing imports):

```typescript
import { gpsPointsSchema, haversineDistanceMi, encodePolyline } from "~/lib/geo";
```

- [ ] **Step 2: Update `timer.start` input to accept `trackGps`**

Change the input on line 10 from:
```typescript
z.object({ userId: z.string(), activityType: z.string() })
```
to:
```typescript
z.object({ userId: z.string(), activityType: z.string(), trackGps: z.boolean().optional() })
```

And update the `create` data (line 24-28) to include `trackGps`:
```typescript
data: {
  userId: input.userId,
  activityType: input.activityType,
  segments: [{ start: now }],
  status: "running",
  trackGps: input.trackGps ?? false,
},
```

- [ ] **Step 3: Add `timer.addGpsPoints` mutation**

Add this procedure after the `resume` procedure (after line 71):

```typescript
addGpsPoints: publicProcedure
  .input(
    z.object({
      userId: z.string(),
      points: gpsPointsSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const timer = await ctx.db.activeTimer.findUnique({
      where: { userId: input.userId },
    });
    if (!timer) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
    }

    const existing = timer.gpsPoints
      ? gpsPointsSchema.parse(timer.gpsPoints)
      : [];
    const updated = [...existing, ...input.points];

    return ctx.db.activeTimer.update({
      where: { userId: input.userId },
      data: { gpsPoints: updated },
    });
  }),
```

- [ ] **Step 4: Update `timer.end` to compute distance and encode polyline**

In the `timer.end` mutation, after the `durationSec` calculation (line 107) and before the pace computation (line 110), add GPS processing:

```typescript
// GPS: compute distance and encode polyline if GPS data exists
const rawGpsPoints = timer.gpsPoints
  ? gpsPointsSchema.parse(timer.gpsPoints)
  : [];
const hasGpsData = rawGpsPoints.length > 0;

const gpsDistanceMi = hasGpsData
  ? haversineDistanceMi(rawGpsPoints)
  : null;
const routePolyline = hasGpsData
  ? encodePolyline(rawGpsPoints)
  : null;

// Use provided distance, fall back to GPS-computed distance
const finalDistanceMi = input.distanceMi ?? gpsDistanceMi ?? null;
```

Then replace lines 110-136 (from `const paceSecPerMi` through the end of the `$transaction`) with the full updated block:

```typescript
      // Compute pace for runs
      const paceSecPerMi =
        finalDistanceMi && timer.activityType === "run"
          ? computePace(finalDistanceMi, durationSec)
          : null;

      // Use date-only string so @db.Date stores the correct calendar day
      const startDate = timer.startedAt.toISOString().split("T")[0]!;

      // Atomic: create activity + delete timer
      const [activity] = await ctx.db.$transaction([
        ctx.db.activity.create({
          data: {
            userId: input.userId,
            date: new Date(startDate),
            type: timer.activityType,
            durationSec,
            distanceMi: finalDistanceMi,
            paceSecPerMi,
            routePolyline,
            notes: input.notes ?? null,
            source: "timer",
          },
        }),
        ctx.db.activeTimer.delete({
          where: { userId: input.userId },
        }),
      ]);

      return activity;
```

- [ ] **Step 5: Update `timer.active` to return trackGps**

No code change needed — `findUnique` already returns all fields including the new `trackGps` and `gpsPoints`. The client already receives the full `ActiveTimer` object.

- [ ] **Step 6: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/server/api/routers/timer.ts
git commit -m "feat: add GPS support to timer router — addGpsPoints, distance, polyline"
```

---

## Task 4: GPS collection hook — `useGpsTracking`

**Files:**
- Create: `src/hooks/use-gps-tracking.ts`

- [ ] **Step 1: Create the GPS tracking hook**

```typescript
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "~/trpc/react";
import type { GpsPoint } from "~/lib/geo";

const FLUSH_INTERVAL_MS = 30_000;

export function useGpsTracking(
  enabled: boolean,
  userId: string,
): { pointCount: number; error: string | null } {
  const bufferRef = useRef<GpsPoint[]>([]);
  const pointCountRef = useRef(0);
  const errorRef = useRef<string | null>(null);
  const [, setTick] = useState(0); // Force re-render counter

  const addGpsPoints = api.timer.addGpsPoints.useMutation();
  // Store mutate in a ref to avoid dependency churn (useMutation returns a new object each render)
  const mutateRef = useRef(addGpsPoints.mutate);
  mutateRef.current = addGpsPoints.mutate;

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const points = [...bufferRef.current];
    mutateRef.current(
      { userId, points },
      {
        onSuccess: () => {
          // Only clear the points that were successfully sent
          bufferRef.current = bufferRef.current.slice(points.length);
        },
        // On failure: retain points in buffer, retry next interval
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      errorRef.current = "Geolocation not supported";
      setTick((t) => t + 1);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        };
        bufferRef.current.push(point);
        pointCountRef.current += 1;
        errorRef.current = null;
        setTick((t) => t + 1);
      },
      (err) => {
        // Log but don't stop — GPS often recovers
        console.warn("GPS error:", err.message);
        if (err.code === err.PERMISSION_DENIED) {
          errorRef.current = "Location permission denied";
          setTick((t) => t + 1);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    // Periodic flush
    const flushId = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(flushId);
      // Flush remaining points on cleanup
      flush();
    };
  }, [enabled, flush]);

  return {
    pointCount: pointCountRef.current,
    error: errorRef.current,
  };
}
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-gps-tracking.ts
git commit -m "feat: add useGpsTracking hook — watchPosition + batch sync"
```

---

## Task 5: GPS toggle on StartTimerModal

**Files:**
- Modify: `src/components/start-timer-modal.tsx`

- [ ] **Step 1: Add GPS toggle state and permission check**

Update the existing `import { useState } from "react"` (line 3) to also include `useCallback`:
```typescript
import { useState, useCallback } from "react";
```

Add a new import below the existing ones:
```typescript
import { isGpsActivityType } from "~/lib/geo";
```

Inside the component, after the `activityType` state (line 18), add:

```typescript
const [trackGps, setTrackGps] = useState(false);
const [gpsError, setGpsError] = useState<string | null>(null);
const showGpsToggle = isGpsActivityType(activityType);

const handleGpsToggle = useCallback((on: boolean) => {
  if (on) {
    navigator.geolocation.getCurrentPosition(
      () => {
        setTrackGps(true);
        setGpsError(null);
      },
      (err) => {
        setTrackGps(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Could not get location",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  } else {
    setTrackGps(false);
    setGpsError(null);
  }
}, []);
```

Reset GPS state when activity type changes (loses GPS eligibility):
```typescript
// After setActivityType call, if the new type isn't GPS-eligible, reset
const handleTypeSelect = (type: ActivityType) => {
  setActivityType(type);
  if (!isGpsActivityType(type)) {
    setTrackGps(false);
    setGpsError(null);
  }
};
```

- [ ] **Step 2: Update handleStart to pass trackGps**

Change line 25 from:
```typescript
startTimer.mutate({ userId, activityType });
```
to:
```typescript
startTimer.mutate({ userId, activityType, trackGps });
```

- [ ] **Step 3: Add GPS toggle UI between the ActivityTypeGrid and START button**

After the `ActivityTypeGrid` div (after line 60), add:

```tsx
{/* GPS toggle */}
{showGpsToggle && (
  <div className="mb-5">
    <button
      type="button"
      onClick={() => handleGpsToggle(!trackGps)}
      className="flex w-full items-center justify-between rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5"
    >
      <span className="font-condensed text-sm font-bold uppercase tracking-[0.12em] text-cream/80">
        Track GPS
      </span>
      <div
        className={`h-5 w-9 rounded-full border transition-colors ${
          trackGps
            ? "border-[#22c55e] bg-[#22c55e]"
            : "border-cream/20 bg-cream/10"
        }`}
      >
        <div
          className={`mt-0.5 h-4 w-4 rounded-full bg-cream transition-transform ${
            trackGps ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
    {gpsError && (
      <div className="mt-1 font-condensed text-xs text-red">{gpsError}</div>
    )}
  </div>
)}
```

Replace `onSelect={setActivityType}` with `onSelect={handleTypeSelect}` on line 59:
```tsx
<ActivityTypeGrid selected={activityType} onSelect={handleTypeSelect} />
```

- [ ] **Step 4: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/start-timer-modal.tsx
git commit -m "feat: add GPS toggle to start timer modal for outdoor activities"
```

---

## Task 6: GPS lock screen component

**Files:**
- Create: `src/components/gps-lock-screen.tsx`

- [ ] **Step 1: Create the fullscreen lock screen component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";

export function GpsLockScreen({
  segments: rawSegments,
  activityType,
  isRunning,
  onUnlock,
}: {
  segments: unknown;
  activityType: string;
  isRunning: boolean;
  onUnlock: () => void;
}) {
  const segments = segmentsSchema.parse(rawSegments);
  const segmentsKey = JSON.stringify(rawSegments);

  // Live elapsed time
  const [elapsed, setElapsed] = useState(() =>
    Math.floor(computeTotalSeconds(segments)),
  );

  useEffect(() => {
    const parsed = segmentsSchema.parse(JSON.parse(segmentsKey));
    if (!isRunning) {
      setElapsed(Math.floor(computeTotalSeconds(parsed)));
      return;
    }
    const tick = () => setElapsed(Math.floor(computeTotalSeconds(parsed)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [segmentsKey, isRunning]);

  // Format timer display
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const label =
    ACTIVITY_LABELS[activityType as ActivityType] ?? activityType;

  // Fullscreen + Wake Lock
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may not be supported
    }
    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
    } catch {
      // Wake Lock may not be supported
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    if (wakeLock) {
      await wakeLock.release().catch(() => {});
      setWakeLock(null);
    }
  }, [wakeLock]);

  // Enter fullscreen on mount
  useEffect(() => {
    void enterFullscreen();
    return () => {
      void exitFullscreen();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external fullscreen exit (swipe/escape)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        onUnlock();
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [onUnlock]);

  const handleUnlock = async () => {
    await exitFullscreen();
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black">
      <div className="font-condensed text-[13px] font-bold uppercase tracking-[3px] text-[#444]">
        GPS Tracking
      </div>
      <div className="mt-2 font-condensed text-[16px] font-bold uppercase tracking-[2px] text-[#333]">
        {label.toUpperCase()}
      </div>
      <div className="mt-4 font-display text-[64px] leading-none tracking-wider text-[#3a3a3a]">
        {display}
      </div>
      <button
        onClick={() => void handleUnlock()}
        className="mt-8 border border-[#444] bg-transparent px-8 py-2 font-condensed text-[14px] font-bold uppercase tracking-[3px] text-[#444]"
      >
        Unlock
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/gps-lock-screen.tsx
git commit -m "feat: add fullscreen GPS lock screen with wake lock"
```

---

## Task 7: Lock button on TimerPanel

**Files:**
- Modify: `src/components/timer-panel.tsx`

- [ ] **Step 1: Add lock icon import and onLock prop**

Add `Lock` to the lucide-react import (line 4):
```typescript
import { Pause, Play, Square, Lock } from "lucide-react";
```

Update the `Timer` type (line 10-17) to include `trackGps`:
```typescript
type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
  trackGps: boolean;
};
```

Add `onLock` to the component props:
```typescript
export function TimerPanel({
  timer,
  userId,
  onEnd,
  onLock,
}: {
  timer: Timer;
  userId: string;
  onEnd: () => void;
  onLock?: () => void;
}) {
```

- [ ] **Step 2: Add lock button to the button row**

After the segment info div (line 122) and before the buttons div (line 125), add a lock button row:

```tsx
{/* Lock button — GPS only */}
{timer.trackGps && onLock && (
  <div className="mt-2">
    <button
      onClick={onLock}
      className="flex w-full items-center justify-center gap-1.5 rounded-sm border-[1.5px] border-cream/15 bg-cream/5 px-3 py-1.5"
      aria-label="Enter GPS lock screen"
    >
      <Lock size={12} strokeWidth={2.5} className="text-ink-faint" strokeLinecap="square" strokeLinejoin="miter" />
      <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
        Lock Screen
      </span>
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/timer-panel.tsx
git commit -m "feat: add GPS lock button to timer panel"
```

---

## Task 8: Wire GPS tracking + lock screen into Fab

**Files:**
- Modify: `src/components/fab.tsx`

- [ ] **Step 1: Add GPS imports and state**

Add imports:
```typescript
import { useGpsTracking } from "~/hooks/use-gps-tracking";
import { GpsLockScreen } from "~/components/gps-lock-screen";
```

Inside the `Fab` component, add lock screen state:
```typescript
const [showLockScreen, setShowLockScreen] = useState(false);
```

- [ ] **Step 2: Wire up GPS tracking hook**

After the `activeTimer` query, add:
```typescript
const isGpsActive = !!activeTimer.data?.trackGps;
useGpsTracking(isGpsActive && !showEndTimer, userId ?? "");
```

The hook runs when there's an active timer with GPS enabled, and stops when the end modal is open (to avoid collecting points while user is saving).

- [ ] **Step 3: Pass onLock to TimerPanel and render GpsLockScreen**

Update the `TimerPanel` render (around line 58):
```tsx
{timerExists && activeTimer.data && !showEndTimer && !showLockScreen && (
  <TimerPanel
    timer={activeTimer.data}
    userId={userId!}
    onEnd={() => setShowEndTimer(true)}
    onLock={activeTimer.data.trackGps ? () => setShowLockScreen(true) : undefined}
  />
)}

{/* GPS Lock Screen */}
{showLockScreen && activeTimer.data && (
  <GpsLockScreen
    segments={activeTimer.data.segments}
    activityType={activeTimer.data.activityType}
    isRunning={activeTimer.data.status === "running"}
    onUnlock={() => setShowLockScreen(false)}
  />
)}
```

- [ ] **Step 4: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/fab.tsx src/hooks/use-gps-tracking.ts
git commit -m "feat: wire GPS tracking and lock screen into fab"
```

---

## Task 9: Pre-fill distance from GPS in EndTimerModal

**Files:**
- Modify: `src/components/end-timer-modal.tsx`

- [ ] **Step 1: Update Timer type and add GPS distance computation**

Update the `Timer` type to include GPS fields:
```typescript
type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
  trackGps: boolean;
  gpsPoints: unknown;
};
```

Add import:
```typescript
import { gpsPointsSchema, haversineDistanceMi } from "~/lib/geo";
```

After line 35 (`const showDistance = ...`), compute GPS distance:
```typescript
const gpsPoints = timer.gpsPoints
  ? gpsPointsSchema.parse(timer.gpsPoints)
  : [];
const gpsDistanceMi =
  gpsPoints.length > 0 ? haversineDistanceMi(gpsPoints) : null;
```

- [ ] **Step 2: Pre-fill distance field from GPS**

Change the distance state initialization (line 44) from:
```typescript
const [distance, setDistance] = useState("");
```
to:
```typescript
const [distance, setDistance] = useState(
  gpsDistanceMi !== null ? gpsDistanceMi.toFixed(2) : "",
);
```

- [ ] **Step 3: Add "from GPS" label below distance input**

After the "Miles" label div (line 152-154), add:
```tsx
{gpsDistanceMi !== null && (
  <div className="mt-0.5 text-center font-condensed text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#22c55e]/70">
    from GPS
  </div>
)}
```

- [ ] **Step 4: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/end-timer-modal.tsx
git commit -m "feat: pre-fill distance from GPS in end timer modal"
```

---

## Task 10: Route map — install Leaflet + create RouteMap component

**Files:**
- Create: `src/components/route-map.tsx`
- Modify: `src/app/activities/[id]/page.tsx`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install Leaflet dependencies**

Run:
```bash
npm install leaflet react-leaflet && npm install -D @types/leaflet
```

Expected: packages added to package.json

- [ ] **Step 2: Create `src/components/route-map.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decodePolyline } from "~/lib/geo";

export function RouteMap({ polyline }: { polyline: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const points = decodePolyline(polyline);
    if (points.length === 0) return;

    const latLngs = points.map(([lat, lng]) => L.latLng(lat, lng));

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const line = L.polyline(latLngs, {
      color: "#c4342d",
      weight: 3,
      opacity: 0.9,
    }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [20, 20] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [polyline]);

  return <div ref={containerRef} className="h-48 w-full rounded-sm" />;
}
```

- [ ] **Step 3: Update activity detail page to use RouteMap**

In `src/app/activities/[id]/page.tsx`, replace the route map placeholder (lines 112-116):

```tsx
{activity.routePolyline && (
  <div className="mx-5 mb-4">
    <RouteMap polyline={activity.routePolyline} />
  </div>
)}
```

Add the import at the top. **Important:** Leaflet accesses `window`/`document` at import time, so it must be dynamically imported with SSR disabled:
```typescript
import dynamic from "next/dynamic";
const RouteMap = dynamic(
  () => import("~/components/route-map").then((m) => ({ default: m.RouteMap })),
  { ssr: false },
);
```

- [ ] **Step 4: Verify with typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Test the build**

Run: `npm run build`

Expected: Build succeeds. Leaflet CSS and JS are bundled correctly.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/route-map.tsx src/app/activities/\[id\]/page.tsx
git commit -m "feat: add route map with Leaflet on activity detail page"
```

---

## Task 11: Manual integration test

This task verifies the full flow end-to-end in the browser.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test GPS toggle visibility**

1. Open the app, tap the Play FAB to open StartTimerModal
2. Select "Run" — GPS toggle should appear
3. Select "Strength" — GPS toggle should disappear
4. Select "Hike" — GPS toggle should appear
5. Select "Swim" — GPS toggle should NOT appear (swim is distance but not outdoor/GPS)

- [ ] **Step 3: Test GPS tracking flow**

1. Select "Run", toggle GPS on — browser should prompt for location permission
2. Grant permission, tap START
3. TimerPanel should show with a "Lock Screen" button
4. Tap Lock Screen — fullscreen black screen with grey timer should appear
5. Tap UNLOCK — returns to normal TimerPanel
6. Tap End — EndTimerModal should show distance pre-filled with "from GPS" label
7. Save — activity should be created with distance and route polyline

- [ ] **Step 4: Test route map on activity detail**

1. Navigate to the activity just created
2. If GPS data was collected, a Leaflet map should render with the route drawn as a red line
3. Map should be non-interactive (no zoom/drag)

- [ ] **Step 5: Test timer recovery**

1. Start a new GPS-tracked timer
2. Refresh the page
3. TimerPanel should appear with Lock Screen button
4. GPS tracking should resume automatically (check console for watchPosition logs)

- [ ] **Step 6: Test permission denied**

1. Open StartTimerModal, select Run, toggle GPS on
2. Deny the location permission prompt
3. Toggle should turn off and show "Location permission denied" error
4. Timer can still start without GPS
