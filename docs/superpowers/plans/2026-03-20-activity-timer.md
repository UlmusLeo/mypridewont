# Activity Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live activity timer with pause/resume, persistent state, and activity editing — plus migrate all Unicode icons to Lucide React.

**Architecture:** Server-persisted timer state (ActiveTimer model) with segment-based time tracking. Timer UI renders from DB segments so elapsed time survives app restarts. Lucide React replaces all Unicode character icons for visual consistency.

**Tech Stack:** Next.js 15, tRPC 11, Prisma 6 (PostgreSQL), React 19, Zod, Tailwind CSS, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-20-activity-timer-design.md`

**Mockups:** `.superpowers/brainstorm/1631-1774038482/timer-ui-states.html` and `timer-running-v5.html`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `ActiveTimer` model, `User.activeTimer` relation |
| `src/lib/timer.ts` | Segment Zod schemas, `computeTotalSeconds()` utility |
| `src/server/api/routers/timer.ts` | Timer CRUD: start, pause, resume, end, active |
| `src/server/api/routers/activity.ts` | Add `activity.update` mutation |
| `src/server/api/root.ts` | Register `timerRouter` |
| `src/components/activity-icons.tsx` | `ACTIVITY_ICON_COMPONENTS` map (Lucide icons) |
| `src/components/activity-type-grid.tsx` | Shared activity type selector grid |
| `src/components/fab.tsx` | Stacked FABs + timer-active state |
| `src/components/start-timer-modal.tsx` | Activity select + start timer |
| `src/components/timer-panel.tsx` | Running/paused timer display |
| `src/components/end-timer-modal.tsx` | Save screen after ending timer |
| `src/components/edit-activity-modal.tsx` | Edit saved activity |
| `src/components/shell.tsx` | Timer recovery on mount |
| `src/components/bottom-nav.tsx` | Replace Unicode → Lucide icons |
| `src/components/sidebar.tsx` | Replace Unicode → Lucide icons |
| `src/components/log-modal.tsx` | Use shared ActivityTypeGrid + Lucide icons |
| `src/components/calendar/week-current.tsx` | Replace checkmark → Lucide `Check` |
| `src/app/activities/[id]/page.tsx` | Add edit button, replace back arrow |

---

## Task 1: Install lucide-react and Create Activity Icon Map

**Files:**
- Modify: `package.json`
- Create: `src/components/activity-icons.tsx`

- [ ] **Step 1: Install lucide-react**

Run: `npm install lucide-react`

- [ ] **Step 2: Create the activity icon component map**

Create `src/components/activity-icons.tsx`:

```tsx
import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Flower2,
  Mountain,
  PersonStanding,
  Ellipsis,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityType } from "~/lib/constants";

export const ACTIVITY_ICON_COMPONENTS: Record<ActivityType, LucideIcon> = {
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  yoga: Flower2,
  hike: Mountain,
  walk: PersonStanding,
  other: Ellipsis,
};
```

- [ ] **Step 3: Verify the app compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/activity-icons.tsx
git commit -m "feat: add lucide-react and activity icon component map"
```

---

## Task 2: Lucide Icon Migration — Navigation and Calendar

**Files:**
- Modify: `src/components/bottom-nav.tsx`
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/calendar/week-current.tsx`

- [ ] **Step 1: Migrate bottom-nav.tsx**

Replace the `tabs` array and icon rendering in `src/components/bottom-nav.tsx`. Import Lucide icons and use JSX elements instead of Unicode strings:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ClipboardList, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/activities", label: "Log", Icon: ClipboardList },
  { href: "/goals", label: "Goals", Icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t-2 border-red bg-ink pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-2 sm:hidden">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex flex-col items-center gap-0.5 font-condensed text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${
            pathname.startsWith(tab.href) ? "text-cream" : "text-cream/50"
          }`}
        >
          <tab.Icon size={20} strokeWidth={2.5} />
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Migrate sidebar.tsx**

Same pattern — replace Unicode with Lucide icons in `src/components/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ClipboardList, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/activities", label: "Log", Icon: ClipboardList },
  { href: "/goals", label: "Goals", Icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-48 shrink-0 border-r-2 border-red bg-ink sm:block">
      <div className="px-5 py-4">
        <Link href="/dashboard" className="font-display text-2xl leading-none tracking-wider text-cream">
          MY<span className="text-red">PRIDE</span>WONT
        </Link>
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-3 rounded-sm px-3 py-2.5 font-condensed text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
              pathname.startsWith(tab.href)
                ? "bg-cream/10 text-cream"
                : "text-cream/50 hover:bg-cream/5 hover:text-cream/70"
            }`}
          >
            <tab.Icon size={16} strokeWidth={2.5} />
            {tab.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Migrate calendar checkmark**

In `src/components/calendar/week-current.tsx`, replace the `&#10003;` HTML entity with a Lucide `Check` icon.

Add import at top:
```tsx
import { Check } from "lucide-react";
```

Replace line 78 (`<span className="ml-0.5 font-bold text-green">&#10003;</span>`) with:
```tsx
<Check size={10} strokeWidth={3} className="ml-0.5 inline text-green" />
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev`
Check: Bottom nav icons render on mobile, sidebar icons render on desktop, calendar checkmarks display as Lucide Check icons.

- [ ] **Step 5: Commit**

```bash
git add src/components/bottom-nav.tsx src/components/sidebar.tsx src/components/calendar/week-current.tsx
git commit -m "feat: migrate nav and calendar icons to Lucide React"
```

---

## Task 3: Lucide Icon Migration — LogModal and Activity Detail

**Files:**
- Modify: `src/components/log-modal.tsx`
- Modify: `src/app/activities/[id]/page.tsx`

- [ ] **Step 1: Migrate LogModal icons**

In `src/components/log-modal.tsx`:

Add imports:
```tsx
import { ArrowLeft } from "lucide-react";
import { ACTIVITY_ICON_COMPONENTS } from "~/components/activity-icons";
```

Remove `ACTIVITY_ICONS` from the constants import (line 5) — keep `ACTIVITY_TYPES`, `ACTIVITY_LABELS`, `DISTANCE_TYPES`.

Replace the back button text `&larr; Back` (line 82) with:
```tsx
<><ArrowLeft size={14} strokeWidth={2.5} className="inline" /> Back</>
```

Replace the icon in the activity grid (line 107) — change `{ACTIVITY_ICONS[t]}` to:
```tsx
{(() => { const Icon = ACTIVITY_ICON_COMPONENTS[t]; return <Icon size={20} strokeWidth={2} />; })()}
```

- [ ] **Step 2: Migrate activity detail back arrow**

In `src/app/activities/[id]/page.tsx`:

Add import:
```tsx
import { ArrowLeft } from "lucide-react";
```

Replace `&larr; Back to log` (line 22) with:
```tsx
<><ArrowLeft size={12} strokeWidth={2.5} className="inline" /> Back to log</>
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Check: LogModal activity type grid shows Lucide icons. Back buttons in LogModal and activity detail show arrow icon.

- [ ] **Step 4: Commit**

```bash
git add src/components/log-modal.tsx src/app/activities/[id]/page.tsx
git commit -m "feat: migrate LogModal and activity detail icons to Lucide React"
```

---

## Task 4: Remove ACTIVITY_ICONS from Constants

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Verify no remaining references to ACTIVITY_ICONS**

Run: `grep -r "ACTIVITY_ICONS" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (all references were replaced in Tasks 2-3).

- [ ] **Step 2: Remove the ACTIVITY_ICONS export**

In `src/lib/constants.ts`, delete the `ACTIVITY_ICONS` record (lines 39-48 approximately):

```typescript
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  run: "\u25B6",
  bike: "\u25CF",
  swim: "\u2248",
  strength: "\u25B2",
  yoga: "\u2726",
  hike: "\u25B2",
  walk: "\u2022",
  other: "\u22EF",
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.ts
git commit -m "refactor: remove unused ACTIVITY_ICONS unicode map"
```

---

## Task 5: Prisma Schema — ActiveTimer Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ActiveTimer model and User relation**

Add to `prisma/schema.prisma` after the `User` model:

```prisma
model ActiveTimer {
  id           String   @id @default(cuid())
  userId       String   @unique
  activityType String
  startedAt    DateTime @default(now())
  segments     Json     // Array of { start: ISO string, end?: ISO string }
  status       String   // "running" | "paused"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

Add to the `User` model (after the `goals` line):
```prisma
  activeTimer ActiveTimer?
```

- [ ] **Step 2: Generate Prisma client and create migration**

Run:
```bash
npx prisma migrate dev --name add-active-timer
```
Expected: Migration created and applied successfully.

- [ ] **Step 3: Verify generated client**

Run: `npx prisma generate`
Expected: Prisma client generated with `ActiveTimer` model accessible via `db.activeTimer`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ActiveTimer model for persistent timer state"
```

---

## Task 6: Timer Utility Functions

**Files:**
- Create: `src/lib/timer.ts`

- [ ] **Step 1: Create timer utilities**

Create `src/lib/timer.ts` with Zod schemas and duration computation:

```typescript
import { z } from "zod";

export const segmentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
});

export const segmentsSchema = z.array(segmentSchema);

export type Segment = z.infer<typeof segmentSchema>;

/**
 * Compute total elapsed seconds from an array of timer segments.
 * Open segments (no `end`) use Date.now() as the end time.
 */
export function computeTotalSeconds(segments: Segment[]): number {
  return segments.reduce((total, seg) => {
    const start = new Date(seg.start).getTime();
    const end = seg.end ? new Date(seg.end).getTime() : Date.now();
    return total + (end - start) / 1000;
  }, 0);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/timer.ts
git commit -m "feat: add timer segment schemas and duration utility"
```

---

## Task 7: Timer tRPC Router

**Files:**
- Create: `src/server/api/routers/timer.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the timer router**

Create `src/server/api/routers/timer.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { segmentsSchema } from "~/lib/timer";
import type { Segment } from "~/lib/timer";
import { computePace } from "~/lib/utils";
import { TRPCError } from "@trpc/server";

export const timerRouter = createTRPCRouter({
  start: publicProcedure
    .input(z.object({ userId: z.string(), activityType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A timer is already running for this user",
        });
      }

      const now = new Date().toISOString();
      return ctx.db.activeTimer.create({
        data: {
          userId: input.userId,
          activityType: input.activityType,
          segments: [{ start: now }],
          status: "running",
        },
      });
    }),

  pause: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);
      const last = segments[segments.length - 1]!;
      last.end = new Date().toISOString();

      return ctx.db.activeTimer.update({
        where: { userId: input.userId },
        data: { segments, status: "paused" },
      });
    }),

  resume: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);
      const now = new Date().toISOString();
      segments.push({ start: now });

      return ctx.db.activeTimer.update({
        where: { userId: input.userId },
        data: { segments, status: "running" },
      });
    }),

  end: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        distanceMi: z.number().positive().optional(),
        durationOverrideSec: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);

      // Close last segment if still running
      const last = segments[segments.length - 1]!;
      if (!last.end) {
        last.end = new Date().toISOString();
      }

      // Compute total duration from segments
      const computedSec = Math.round(
        segments.reduce((total: number, seg: Segment) => {
          const start = new Date(seg.start).getTime();
          const end = new Date(seg.end!).getTime();
          return total + (end - start) / 1000;
        }, 0),
      );

      const durationSec = input.durationOverrideSec ?? computedSec;

      // Compute pace for runs
      const paceSecPerMi =
        input.distanceMi && timer.activityType === "run"
          ? computePace(input.distanceMi, durationSec)
          : null;

      // Atomic: create activity + delete timer
      const [activity] = await ctx.db.$transaction([
        ctx.db.activity.create({
          data: {
            userId: input.userId,
            date: new Date(timer.startedAt),
            type: timer.activityType,
            durationSec,
            distanceMi: input.distanceMi ?? null,
            paceSecPerMi,
            notes: input.notes ?? null,
            source: "timer",
          },
        }),
        ctx.db.activeTimer.delete({
          where: { userId: input.userId },
        }),
      ]);

      return activity;
    }),

  active: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) return null;

      // Validate segments on read
      segmentsSchema.parse(timer.segments);
      return timer;
    }),
});
```

- [ ] **Step 2: Register the timer router**

In `src/server/api/root.ts`, add:

Import:
```typescript
import { timerRouter } from "~/server/api/routers/timer";
```

Add to the router object:
```typescript
timer: timerRouter,
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/timer.ts src/server/api/root.ts
git commit -m "feat: add timer tRPC router with start/pause/resume/end/active"
```

---

## Task 8: Activity Update Mutation

**Files:**
- Modify: `src/server/api/routers/activity.ts`

- [ ] **Step 1: Add the update mutation**

In `src/server/api/routers/activity.ts`, add after the `delete` procedure (after line 90):

```typescript
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
        type: z.string().optional(),
        durationSec: z.number().int().positive().optional(),
        distanceMi: z.number().positive().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;

      // Get existing activity to compute pace if needed
      const existing = await ctx.db.activity.findUniqueOrThrow({
        where: { id },
      });

      const newType = fields.type ?? existing.type;
      const newDuration = fields.durationSec ?? existing.durationSec;
      const newDistance =
        fields.distanceMi !== undefined
          ? fields.distanceMi
          : existing.distanceMi;

      // Recompute pace
      let paceSecPerMi: number | null = null;
      if (newType === "run" && newDistance && newDuration) {
        paceSecPerMi = computePace(newDistance, newDuration);
      }

      return ctx.db.activity.update({
        where: { id },
        data: {
          ...(fields.date !== undefined && { date: new Date(fields.date) }),
          ...(fields.type !== undefined && { type: fields.type }),
          ...(fields.durationSec !== undefined && {
            durationSec: fields.durationSec,
          }),
          ...(fields.distanceMi !== undefined && {
            distanceMi: fields.distanceMi,
          }),
          ...(fields.notes !== undefined && { notes: fields.notes }),
          paceSecPerMi,
        },
      });
    }),
```

Also add the import if not present — `computePace` is already imported at line 3.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/activity.ts
git commit -m "feat: add activity.update mutation with pace recomputation"
```

---

## Task 9: Extract Shared ActivityTypeGrid Component

**Files:**
- Create: `src/components/activity-type-grid.tsx`
- Modify: `src/components/log-modal.tsx`

- [ ] **Step 1: Create the shared component**

Create `src/components/activity-type-grid.tsx`:

```tsx
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";
import { ACTIVITY_ICON_COMPONENTS } from "~/components/activity-icons";

export function ActivityTypeGrid({
  selected,
  onSelect,
}: {
  selected: ActivityType;
  onSelect: (t: ActivityType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {ACTIVITY_TYPES.map((t) => {
        const Icon = ACTIVITY_ICON_COMPONENTS[t];
        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`flex flex-col items-center gap-1 rounded-sm border-[1.5px] px-1 py-2.5 transition-all ${
              selected === t
                ? "border-red bg-red text-cream shadow-[2px_2px_0_rgba(245,240,232,0.1)]"
                : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="font-condensed text-[0.65rem] font-bold uppercase tracking-wider">
              {ACTIVITY_LABELS[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Refactor LogModal to use ActivityTypeGrid**

In `src/components/log-modal.tsx`:

Add import:
```tsx
import { ActivityTypeGrid } from "~/components/activity-type-grid";
```

Remove `ACTIVITY_ICON_COMPONENTS` import if present (was added in Task 3). Remove `ACTIVITY_TYPES` and `ACTIVITY_LABELS` from the constants import (they're only used in the grid now — but check if they're used elsewhere in the file first; `DISTANCE_TYPES` is used on line 66, and `ACTIVITY_TYPES` is not used outside the grid).

Replace the entire activity type grid `<div>` block (lines 92-114, the `grid grid-cols-4` section) with:
```tsx
<ActivityTypeGrid selected={activityType} onSelect={setActivityType} />
```

Keep the label wrapper `<div className="mb-5">` and `<label>` above it — just replace the grid div itself.

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Check: LogModal activity type grid renders identically with Lucide icons.

- [ ] **Step 4: Commit**

```bash
git add src/components/activity-type-grid.tsx src/components/log-modal.tsx
git commit -m "refactor: extract shared ActivityTypeGrid component"
```

---

## Task 10: Stacked FABs with Timer State

**Files:**
- Modify: `src/components/fab.tsx`

This task rewrites the FAB to show two stacked buttons (Log + Timer), and hide them when a timer is active. The FAB component becomes the orchestrator that manages which modal/panel is visible.

- [ ] **Step 1: Rewrite fab.tsx**

Replace `src/components/fab.tsx` entirely:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Play } from "lucide-react";
import { api } from "~/trpc/react";
import { USERS } from "~/lib/constants";
import type { UserName } from "~/lib/constants";
import { LogModal } from "~/components/log-modal";
import { StartTimerModal } from "~/components/start-timer-modal";
import { TimerPanel } from "~/components/timer-panel";
import { EndTimerModal } from "~/components/end-timer-modal";

export function Fab() {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showStartTimer, setShowStartTimer] = useState(false);
  const [showEndTimer, setShowEndTimer] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const users = api.user.getAll.useQuery();
  const userId = users.data?.find((u) => u.name === currentUser)?.id;

  const activeTimer = api.timer.active.useQuery(
    { userId: userId! },
    { enabled: !!userId, refetchInterval: false },
  );

  const timerExists = !!activeTimer.data;

  return (
    <>
      {/* Stacked FABs — hidden when timer is active */}
      {!timerExists && (
        <div className="fixed bottom-[4.5rem] right-5 z-[51] flex flex-col gap-2 sm:bottom-6">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-red pb-0.5 font-display text-3xl text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm"
            aria-label="Log activity"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setShowStartTimer(true)}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-green pb-0.5 text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm"
            aria-label="Start timer"
          >
            <Play size={24} strokeWidth={2.5} fill="currentColor" />
          </button>
        </div>
      )}

      {/* Timer panel — shown when timer is active */}
      {timerExists && activeTimer.data && !showEndTimer && (
        <TimerPanel
          timer={activeTimer.data}
          userId={userId!}
          onEnd={() => setShowEndTimer(true)}
        />
      )}

      {/* Modals */}
      {showLogModal && <LogModal onClose={() => setShowLogModal(false)} />}
      {showStartTimer && (
        <StartTimerModal
          userId={userId!}
          onClose={() => setShowStartTimer(false)}
          onStarted={() => {
            setShowStartTimer(false);
            void activeTimer.refetch();
          }}
        />
      )}
      {showEndTimer && activeTimer.data && (
        <EndTimerModal
          timer={activeTimer.data}
          userId={userId!}
          onClose={() => setShowEndTimer(false)}
          onSaved={() => {
            setShowEndTimer(false);
            void activeTimer.refetch();
          }}
        />
      )}
    </>
  );
}
```

> **Note:** This references `StartTimerModal`, `TimerPanel`, and `EndTimerModal` which don't exist yet. The app won't build until Tasks 11-13 are complete. If you need intermediate builds, create empty placeholder components first.

- [ ] **Step 2: Commit**

```bash
git add src/components/fab.tsx
git commit -m "feat: stacked FABs with timer state management"
```

---

## Task 11: StartTimerModal

**Files:**
- Create: `src/components/start-timer-modal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/start-timer-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import type { ActivityType } from "~/lib/constants";
import { ActivityTypeGrid } from "~/components/activity-type-grid";

export function StartTimerModal({
  userId,
  onClose,
  onStarted,
}: {
  userId: string;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>("run");

  const startTimer = api.timer.start.useMutation({
    onSuccess: () => onStarted(),
  });

  const handleStart = () => {
    startTimer.mutate({ userId, activityType });
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink font-body text-cream">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-cream/10 px-5 py-3">
        <button
          onClick={onClose}
          className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint"
        >
          <ArrowLeft size={14} strokeWidth={2.5} className="inline" /> Back
        </button>
        <div className="font-display text-xl tracking-wider">
          START <span className="text-red">TIMER</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Activity Type Grid */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            What are you doing?
          </label>
          <ActivityTypeGrid selected={activityType} onSelect={setActivityType} />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={startTimer.isPending}
          className="w-full rounded-sm border-2 border-cream bg-green px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          START
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/start-timer-modal.tsx
git commit -m "feat: add StartTimerModal component"
```

---

## Task 12: TimerPanel (Running and Paused States)

**Files:**
- Create: `src/components/timer-panel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/timer-panel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Pause, Play, Square } from "lucide-react";
import { api } from "~/trpc/react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";

type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
};

export function TimerPanel({
  timer,
  userId,
  onEnd,
}: {
  timer: Timer;
  userId: string;
  onEnd: () => void;
}) {
  const segments = segmentsSchema.parse(timer.segments);
  const isRunning = timer.status === "running";
  const isPaused = timer.status === "paused";

  // Stable reference for segments — only changes when JSON content changes
  const segmentsKey = JSON.stringify(timer.segments);

  // Live elapsed time — ticks every second when running
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

  // Format MM:SS or H:MM:SS
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Segment count
  const segmentNum = segments.length;

  // Stale timer warning (>24h)
  const totalHours = elapsed / 3600;
  const isStale = totalHours > 24;

  const utils = api.useUtils();

  const pauseMutation = api.timer.pause.useMutation({
    onSuccess: () => void utils.timer.active.invalidate(),
  });
  const resumeMutation = api.timer.resume.useMutation({
    onSuccess: () => void utils.timer.active.invalidate(),
  });

  const isMutating = pauseMutation.isPending || resumeMutation.isPending;

  const activityLabel =
    ACTIVITY_LABELS[timer.activityType as ActivityType] ?? timer.activityType;

  return (
    <div
      className={`fixed bottom-[3.5rem] left-0 right-0 z-[51] border-t-2 bg-ink sm:bottom-0 ${
        isPaused ? "border-[#eab308]" : "border-cream/20"
      }`}
    >
      {/* Stale warning */}
      {isStale && (
        <div className="bg-[#eab308]/20 px-4 py-1.5 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-[#eab308]">
          Timer running for {Math.floor(totalHours)}h — adjust duration when
          you save
        </div>
      )}

      <div className="px-4 py-3">
        {/* Activity + Status */}
        <div className="mb-1 flex items-center justify-between">
          <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
            {activityLabel}
          </span>
          {isPaused && (
            <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-[#eab308]">
              Paused
            </span>
          )}
        </div>

        {/* Timer display */}
        <div
          className={`font-display text-[72px] leading-none tracking-wider ${
            isPaused ? "text-[#eab308]/70" : "text-[#22c55e]"
          }`}
        >
          {display}
        </div>

        {/* Segment info */}
        <div className="mt-1 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Segment {segmentNum}
        </div>

        {/* Buttons */}
        <div className="mt-3 flex gap-2">
          {isRunning ? (
            <button
              onClick={() => pauseMutation.mutate({ userId })}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#eab308] bg-[#eab308] px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
              aria-label="Pause timer"
            >
              <Pause size={32} strokeWidth={2.5} className="text-ink" fill="#1a1714" />
            </button>
          ) : (
            <button
              onClick={() => resumeMutation.mutate({ userId })}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#22c55e] bg-[#22c55e] px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
              aria-label="Resume timer"
            >
              <Play size={32} strokeWidth={2.5} className="text-ink" fill="#1a1714" />
            </button>
          )}
          <button
            onClick={onEnd}
            disabled={isMutating}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-red bg-red px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
            aria-label="End timer"
          >
            <Square size={32} strokeWidth={2.5} className="text-cream" fill="#f5f0e8" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timer-panel.tsx
git commit -m "feat: add TimerPanel with running/paused states"
```

---

## Task 13: EndTimerModal

**Files:**
- Create: `src/components/end-timer-modal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/end-timer-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS, DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";
import { formatDuration } from "~/lib/utils";

type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
};

export function EndTimerModal({
  timer,
  userId,
  onClose,
  onSaved,
}: {
  timer: Timer;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const segments = segmentsSchema.parse(timer.segments);
  const computedSec = Math.round(computeTotalSeconds(segments));
  const activityType = timer.activityType as ActivityType;
  const activityLabel = ACTIVITY_LABELS[activityType] ?? timer.activityType;
  const showDistance = DISTANCE_TYPES.includes(activityType);

  // Duration override — pre-filled with computed time
  const computedMin = Math.floor(computedSec / 60);
  const computedRemSec = computedSec % 60;
  const [durationMin, setDurationMin] = useState(String(computedMin));
  const [durationSec, setDurationSec] = useState(
    String(computedRemSec).padStart(2, "0"),
  );
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();
  const endTimer = api.timer.end.useMutation({
    onSuccess: () => {
      void utils.activity.invalidate();
      void utils.goal.invalidate();
      void utils.timer.invalidate();
      onSaved();
    },
  });

  const totalSec =
    parseInt(durationMin || "0", 10) * 60 +
    parseInt(durationSec || "0", 10);
  const distNum = parseFloat(distance || "0");

  const handleSave = () => {
    endTimer.mutate({
      userId,
      distanceMi: distNum > 0 ? distNum : undefined,
      durationOverrideSec: totalSec !== computedSec ? totalSec : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink font-body text-cream">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-cream/10 px-5 py-3">
        <button
          onClick={onClose}
          className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint"
        >
          <ArrowLeft size={14} strokeWidth={2.5} className="inline" /> Back
        </button>
        <div className="font-display text-xl tracking-wider">
          SAVE <span className="text-red">{activityLabel.toUpperCase()}</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Total duration display */}
        <div className="mb-5 text-center">
          <div className="font-display text-5xl tracking-wider text-[#22c55e]">
            {formatDuration(computedSec)}
          </div>
          <div className="mt-1 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Total time ({segments.length} segment{segments.length !== 1 ? "s" : ""})
          </div>
        </div>

        {/* Segment breakdown */}
        {segments.length > 1 && (
          <div className="mb-5">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Segments
            </label>
            <div className="space-y-1">
              {segments.map((seg, i) => {
                const start = new Date(seg.start).getTime();
                const end = seg.end
                  ? new Date(seg.end).getTime()
                  : Date.now();
                const segSec = Math.round((end - start) / 1000);
                return (
                  <div
                    key={i}
                    className="flex justify-between rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-1.5"
                  >
                    <span className="font-condensed text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      Segment {i + 1}
                    </span>
                    <span className="font-display text-sm">
                      {formatDuration(segSec)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Distance input */}
        {showDistance && (
          <div className="mb-5">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Distance
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
            <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Miles
            </div>
          </div>
        )}

        {/* Duration override */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Duration (adjust if needed)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
            <span className="font-display text-2xl text-ink-faint">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
          </div>
          <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Min : Sec
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
            className="min-h-[60px] w-full resize-y rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-red focus:outline-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={endTimer.isPending || totalSec <= 0}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          SAVE IT
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds — all components referenced in fab.tsx now exist.

- [ ] **Step 3: Commit**

```bash
git add src/components/end-timer-modal.tsx
git commit -m "feat: add EndTimerModal with segment breakdown and duration override"
```

---

## Task 14: Timer Recovery in Shell

**Files:**
- Modify: `src/components/shell.tsx`

The timer recovery happens naturally because `fab.tsx` already queries `timer.active` on mount. The FAB component handles showing the TimerPanel when a timer exists. No changes to `shell.tsx` are needed — the FAB is already rendered inside the Shell.

However, we need to make sure the `timer.end` mutation invalidates the right caches. This is already handled in the EndTimerModal's `onSuccess` (invalidates `activity`, `goal`, and `timer` caches).

- [ ] **Step 1: Verify recovery behavior**

Run: `npm run dev`
Test: Start a timer, refresh the page. The TimerPanel should reappear with the correct elapsed time computed from persisted segments.

- [ ] **Step 2: Commit (if any changes were needed)**

No commit needed — recovery is handled by existing architecture.

---

## Task 15: EditActivityModal and Activity Detail Edit Button

**Files:**
- Create: `src/components/edit-activity-modal.tsx`
- Modify: `src/app/activities/[id]/page.tsx`

- [ ] **Step 1: Create EditActivityModal**

Create `src/components/edit-activity-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";
import { ActivityTypeGrid } from "~/components/activity-type-grid";
import { formatPace, computePace } from "~/lib/utils";

type ActivityData = {
  id: string;
  type: string;
  date: Date;
  durationSec: number;
  distanceMi: number | null;
  notes: string | null;
};

export function EditActivityModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: ActivityData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>(
    activity.type as ActivityType,
  );
  const [date, setDate] = useState(
    new Date(activity.date).toISOString().split("T")[0]!,
  );
  const [distance, setDistance] = useState(
    activity.distanceMi ? String(activity.distanceMi) : "",
  );
  const [durationMin, setDurationMin] = useState(
    String(Math.floor(activity.durationSec / 60)),
  );
  const [durationSec, setDurationSec] = useState(
    String(activity.durationSec % 60).padStart(2, "0"),
  );
  const [notes, setNotes] = useState(activity.notes ?? "");

  const utils = api.useUtils();
  const updateActivity = api.activity.update.useMutation({
    onSuccess: () => {
      void utils.activity.invalidate();
      void utils.goal.invalidate();
      onSaved();
    },
  });

  const totalSec =
    parseInt(durationMin || "0", 10) * 60 +
    parseInt(durationSec || "0", 10);
  const distNum = parseFloat(distance || "0");
  const showDistance = DISTANCE_TYPES.includes(activityType);
  const pace =
    activityType === "run" && distNum > 0 && totalSec > 0
      ? computePace(distNum, totalSec)
      : null;

  const handleSave = () => {
    updateActivity.mutate({
      id: activity.id,
      type: activityType,
      date,
      durationSec: totalSec,
      distanceMi: distNum > 0 ? distNum : null,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink font-body text-cream">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-cream/10 px-5 py-3">
        <button
          onClick={onClose}
          className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint"
        >
          <ArrowLeft size={14} strokeWidth={2.5} className="inline" /> Back
        </button>
        <div className="font-display text-xl tracking-wider">
          EDIT <span className="text-red">ACTIVITY</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Activity Type Grid */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Activity type
          </label>
          <ActivityTypeGrid selected={activityType} onSelect={setActivityType} />
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2 text-center font-condensed text-sm font-bold uppercase tracking-wider text-cream focus:border-red focus:outline-none"
          />
        </div>

        {/* Distance + Duration */}
        <div className="mb-5 flex gap-3">
          {showDistance && (
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Distance
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                Miles
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <span className="font-display text-2xl text-ink-faint">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
            </div>
            <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Min : Sec
            </div>
          </div>
        </div>

        {/* Pace preview */}
        {pace && (
          <div className="mb-5 flex items-center justify-center gap-3 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5">
            <span className="font-condensed text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Pace
            </span>
            <span className="font-display text-3xl leading-none text-cream">
              {formatPace(pace).replace("/mi", "")}
            </span>
            <span className="font-condensed text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">
              /mi
            </span>
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="min-h-[60px] w-full resize-y rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-red focus:outline-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={updateActivity.isPending || totalSec <= 0}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          SAVE CHANGES
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add edit button to activity detail page**

The activity detail page (`src/app/activities/[id]/page.tsx`) is a server component. We need a small client wrapper for the edit button and modal. Add an `EditButton` client component inline in the file, or create it at the bottom.

Add at the top of `src/app/activities/[id]/page.tsx`:
```tsx
import { EditButton } from "~/components/edit-activity-modal-trigger";
```

Create `src/components/edit-activity-modal-trigger.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditActivityModal } from "~/components/edit-activity-modal";
import { useRouter } from "next/navigation";

type ActivityData = {
  id: string;
  type: string;
  date: Date;
  durationSec: number;
  distanceMi: number | null;
  notes: string | null;
};

export function EditButton({ activity }: { activity: ActivityData }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-sm border-2 border-ink bg-cream-dark px-3 py-1.5 font-display text-sm uppercase tracking-wider shadow-card-sm active:translate-x-px active:translate-y-px active:shadow-none"
        aria-label="Edit activity"
      >
        <Pencil size={14} strokeWidth={2.5} />
        Edit
      </button>
      {showModal && (
        <EditActivityModal
          activity={activity}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
```

In `src/app/activities/[id]/page.tsx`, add the edit button in the header section. After the back link (line 21-23), add:

```tsx
<div className="mt-2 flex items-center justify-between">
  <div>
    <div className={`font-display text-2xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
      {name.toUpperCase()}
    </div>
    <div className="font-condensed text-sm uppercase tracking-wider text-ink-light capitalize">
      {activity.type} &middot;{" "}
      {new Date(activity.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
    </div>
  </div>
  <EditButton activity={{
    id: activity.id,
    type: activity.type,
    date: activity.date,
    durationSec: activity.durationSec,
    distanceMi: activity.distanceMi,
    notes: activity.notes,
  }} />
</div>
```

Remove the existing standalone user name and type/date divs (lines 24-30) since they're now inside the flex container above.

- [ ] **Step 3: Verify build and visual**

Run: `npm run build && npm run dev`
Check: Activity detail page shows Edit button. Clicking it opens the EditActivityModal. Saving updates the activity.

- [ ] **Step 4: Commit**

```bash
git add src/components/edit-activity-modal.tsx src/components/edit-activity-modal-trigger.tsx src/app/activities/[id]/page.tsx
git commit -m "feat: add EditActivityModal with edit button on activity detail"
```

---

## Task 16: Final Verification

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 2: End-to-end manual test**

Run: `npm run dev`

Test the full flow:
1. Verify stacked FABs appear (red + green)
2. Click green Play FAB → StartTimerModal opens
3. Select activity type, click START → timer panel appears
4. Verify timer ticks every second
5. Click Pause → timer turns yellow, shows paused state
6. Click Resume → timer turns green, continues counting
7. Click End → EndTimerModal opens with correct duration
8. Enter distance (for run), click SAVE IT
9. Verify activity appears in activity log
10. Navigate to activity detail → click Edit → modify values → save
11. Close app and reopen → verify timer recovery works
12. Verify all Lucide icons render across nav, sidebar, calendar, modals

- [ ] **Step 3: Commit any fixes**

If any fixes were needed during testing, commit them:
```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```
