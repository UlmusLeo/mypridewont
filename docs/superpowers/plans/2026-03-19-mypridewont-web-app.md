# MyPrideWont Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MyPrideWont marathon training tracker web app — auth, dashboard, calendar, activity log, goals, and manual entry — using the T3 stack.

**Architecture:** Next.js App Router with tRPC for type-safe API, Prisma for PostgreSQL ORM, Tailwind for styling. Shared password auth with cookie-based sessions. Mobile-first design matching the vintage athletic club mockups in `docs/superpowers/mockups/`.

**Tech Stack:** Next.js 15, tRPC v11, Prisma, Tailwind CSS v4, TypeScript, PostgreSQL

**Note:** This plan covers the web application only. Strava sync and Signal worker integration will be separate follow-up plans.

**Mockup reference:** All UI tasks reference HTML mockups in `docs/superpowers/mockups/` — use these as the source of truth for design tokens, component structure, and layout.

---

## File Structure

`create-t3-app` generates the base project structure. Files marked **(T3)** come from the scaffold — we modify them, not create them. Files marked **(new)** are what we write.

```
prisma/
  schema.prisma              # (T3, modify) Replace with our models
  seed.ts                    # (new) Seed 3 users + marathon date config

src/
  app/
    layout.tsx               # (T3, modify) Add Google Fonts + body class
    page.tsx                 # (T3, modify) Redirect to /dashboard
    login/page.tsx           # (new)
    dashboard/page.tsx       # (new)
    calendar/page.tsx        # (new)
    activities/page.tsx      # (new)
    activities/[id]/page.tsx # (new)
    goals/page.tsx           # (new)
    api/trpc/[trpc]/route.ts # (T3) Already set up

  server/
    db.ts                    # (T3) Prisma client singleton — already done
    auth.ts                  # (new) Password check + cookie helpers
    api/
      trpc.ts                # (T3) tRPC init, context, procedures — already done
      root.ts                # (T3, modify) Add our routers
      routers/
        post.ts              # (T3, delete) Example router from scaffold
        auth.ts              # (new)
        user.ts              # (new)
        activity.ts          # (new)
        goal.ts              # (new)

  components/                # (new) All components are ours
    shell.tsx nav.tsx bottom-nav.tsx fab.tsx log-modal.tsx
    dashboard/ calendar/ goals/

  lib/
    utils.ts                 # (new)
    constants.ts             # (new)

  trpc/
    react.tsx                # (T3) tRPC React hooks — already done
    server.ts                # (T3) tRPC server caller — already done

tailwind.config.ts           # (T3, modify) Extend theme with our design tokens
```

---

### Task 1: T3 Scaffold + Prisma Schema

**Files:**
- Create: entire project scaffold via `create-t3-app`
- Modify: `prisma/schema.prisma` (replace T3 example schema)
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)
- Delete: `src/server/api/routers/post.ts` (T3 example)

**What T3 gives us for free** (do NOT recreate):
- `src/server/db.ts` — Prisma client singleton
- `src/server/api/trpc.ts` — tRPC init, context, public/protected procedures
- `src/trpc/react.tsx` — tRPC React client hooks
- `src/trpc/server.ts` — tRPC server-side caller
- `src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler
- `src/app/layout.tsx` — Root layout with TRPCProvider wiring
- `tailwind.config.ts` — Base Tailwind config
- All `package.json` dependencies (next, trpc, prisma, tailwind, etc.)

- [ ] **Step 1: Scaffold T3 project**

Run from the parent directory of `mypridewont`. Scaffold into a temp name then move files in, since the directory already has `docs/`.

```bash
cd C:/Users/jullman/Projects
npx create-t3-app@latest mypridewont-scaffold --noGit --CI --trpc --tailwind --prisma --appRouter --dbProvider postgresql
```

> **Note:** If the CLI flags have changed, run `npx create-t3-app --help` to check current syntax. The key selections are: tRPC, Tailwind, Prisma, App Router, PostgreSQL.

- [ ] **Step 2: Move scaffolded files into project**

```bash
cd C:/Users/jullman/Projects
cp -r mypridewont-scaffold/* mypridewont/
cp mypridewont-scaffold/.* mypridewont/ 2>/dev/null
rm -rf mypridewont-scaffold
```

- [ ] **Step 3: Install dependencies and verify**

```bash
cd C:/Users/jullman/Projects/mypridewont
npm install
```

Expected: installs cleanly. Inspect the generated files to confirm T3 structure:
- `src/server/db.ts` exists (Prisma client)
- `src/server/api/trpc.ts` exists (tRPC init)
- `src/trpc/react.tsx` exists (React hooks)
- `src/trpc/server.ts` exists (server caller)

- [ ] **Step 4: Delete T3 example files**

```bash
rm src/server/api/routers/post.ts
```

Remove the `postRouter` import/reference from `src/server/api/root.ts`.

- [ ] **Step 4: Write Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(cuid())
  name        String       @unique
  dataSource  String       @default("manual") // "strava" | "manual"
  stravaToken String?
  activities  Activity[]
  goals       WeeklyGoal[]
  createdAt   DateTime     @default(now())
}

model Activity {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  date          DateTime @db.Date
  type          String   // "run" | "bike" | "swim" | "strength" | "yoga" | "hike" | "walk" | "other"
  source        String   @default("manual") // "manual" | "strava" | "signal"
  externalId    String?  @unique
  notes         String?
  durationSec   Int
  distanceMi    Float?
  paceSecPerMi  Int?
  elevGainFt    Float?
  avgHeartRate  Int?
  maxHeartRate  Int?
  calories      Int?
  routePolyline String?
  splits        Split[]
  createdAt     DateTime @default(now())

  @@index([userId, date])
  @@index([date])
}

model Split {
  id           String   @id @default(cuid())
  activityId   String
  activity     Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  mileNumber   Int
  durationSec  Int
  paceSecPerMi Int
  elevGainFt   Float?
  avgHeartRate Int?

  @@index([activityId])
}

model WeeklyGoal {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  activityType     String
  timesPerWeek     Int
  targetDistanceMi Float?
  targetDurationMin Int?
  startDate        DateTime @db.Date
  endDate          DateTime? @db.Date
  createdAt        DateTime @default(now())

  @@index([userId])
}

model AppConfig {
  key   String @id
  value String
}
```

- [ ] **Step 5: Write seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create users
  await prisma.user.upsert({
    where: { name: "Jake" },
    update: {},
    create: { name: "Jake", dataSource: "strava" },
  });
  await prisma.user.upsert({
    where: { name: "Calder" },
    update: {},
    create: { name: "Calder", dataSource: "manual" },
  });
  await prisma.user.upsert({
    where: { name: "Son" },
    update: {},
    create: { name: "Son", dataSource: "strava" },
  });

  // App config
  await prisma.appConfig.upsert({
    where: { key: "marathon_date" },
    update: {},
    create: { key: "marathon_date", value: "2027-03-14" },
  });
  await prisma.appConfig.upsert({
    where: { key: "app_password_hash" },
    update: {},
    create: { key: "app_password_hash", value: "" }, // Set during first deploy
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 6: Add seed script to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

And add `tsx` as a dev dependency:

```bash
npm install -D tsx
```

- [ ] **Step 7: Add Docker Compose for local dev**

Create `docker-compose.yml` at project root:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: mypridewont
      POSTGRES_PASSWORD: mypridewont
      POSTGRES_DB: mypridewont
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Create `.env`:

```
DATABASE_URL="postgresql://mypridewont:mypridewont@localhost:5432/mypridewont"
SESSION_SECRET="dev-secret-change-me-in-prod"
```

Add `.env` to `.gitignore` (T3 scaffold should already have this). Create `.env.example` with the same keys but placeholder values for reference.

- [ ] **Step 8: Start Postgres and run migrations**

```bash
docker compose up -d db
npx prisma migrate dev --name init
npx prisma db seed
```

Expected: Postgres container running, migration creates all tables, seed inserts 3 users + config.

- [ ] **Step 9: Verify schema with Prisma Studio**

```bash
npx prisma studio
```

Expected: Browser opens showing User (3 rows), AppConfig (2 rows), empty Activity/Split/WeeklyGoal tables.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold T3 app with Prisma schema, seed data, and docker-compose"
```

---

### Task 2: Tailwind Theme + Design System Constants

**Files:**
- Modify: `tailwind.config.ts` **(T3-generated, extend the theme section)**
- Create: `src/lib/constants.ts`
- Create: `src/lib/utils.ts`

Design tokens extracted from mockups in `docs/superpowers/mockups/`:

- [ ] **Step 1: Extend the T3-generated Tailwind config**

The T3 scaffold creates `tailwind.config.ts` with basic content paths. Extend its `theme.extend` section (keep the existing `content` array and any T3 defaults):

```typescript
import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#f5f0e8", dark: "#e8e0d0" },
        ink: { DEFAULT: "#1a1714", light: "#3d3730", faint: "#8a8074" },
        red: { DEFAULT: "#c4342d", dark: "#9a2820" },
        green: { DEFAULT: "#2d6b4a", light: "#d4eddf" },
        amber: "#c47d1a",
        "blue-steel": "#4a6277",
        "purple-muted": "#6b5278",
        divider: "#c9bfad",
      },
      fontFamily: {
        display: ["Bebas Neue", ...fontFamily.sans],
        condensed: ["Barlow Condensed", ...fontFamily.sans],
        body: ["Barlow", ...fontFamily.sans],
      },
      boxShadow: {
        card: "3px 3px 0 #1a1714",
        "card-sm": "2px 2px 0 #1a1714",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Write constants**

Create `src/lib/constants.ts`:

```typescript
export const USERS = ["Jake", "Calder", "Son"] as const;
export type UserName = (typeof USERS)[number];

export const USER_COLORS: Record<UserName, string> = {
  Jake: "blue-steel",
  Calder: "amber",
  Son: "purple-muted",
};

// Tailwind class maps for dynamic user coloring
export const USER_TEXT_CLASS: Record<UserName, string> = {
  Jake: "text-blue-steel",
  Calder: "text-amber",
  Son: "text-purple-muted",
};

export const USER_BG_CLASS: Record<UserName, string> = {
  Jake: "bg-blue-steel/15",
  Calder: "bg-amber/15",
  Son: "bg-purple-muted/15",
};

export const USER_BORDER_CLASS: Record<UserName, string> = {
  Jake: "border-blue-steel",
  Calder: "border-amber",
  Son: "border-purple-muted",
};

export const ACTIVITY_TYPES = [
  "run", "bike", "swim", "strength", "yoga", "hike", "walk", "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: "Run", bike: "Bike", swim: "Swim", strength: "Strength",
  yoga: "Yoga", hike: "Hike", walk: "Walk", other: "Other",
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  run: "\u25B6", bike: "\u25CF", swim: "\u2248", strength: "\u25B2",
  yoga: "\u2726", hike: "\u25B2", walk: "\u2022", other: "\u22EF",
};

// Activity types that have distance
export const DISTANCE_TYPES: ActivityType[] = ["run", "bike", "swim", "hike", "walk"];
```

- [ ] **Step 3: Write utility helpers**

Create `src/lib/utils.ts`:

```typescript
/**
 * Format seconds into "M:SS" or "H:MM:SS" duration string
 */
export function formatDuration(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format seconds into friendly duration like "45 min" or "1h 23m"
 */
export function formatDurationFriendly(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

/**
 * Format pace (sec/mi) into "M:SS/mi" string
 */
export function formatPace(paceSecPerMi: number): string {
  const mins = Math.floor(paceSecPerMi / 60);
  const secs = paceSecPerMi % 60;
  return `${mins}:${String(secs).padStart(2, "0")}/mi`;
}

/**
 * Compute pace in sec/mi from distance (mi) and duration (sec)
 */
export function computePace(distanceMi: number, durationSec: number): number {
  if (distanceMi <= 0) return 0;
  return Math.round(durationSec / distanceMi);
}

/**
 * Get the Monday of the week containing the given date (ISO weeks start Monday)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Sunday ending the week containing the given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Format a date as "Mar 19" style
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Compute weeks between two dates
 */
export function weeksBetween(a: Date, b: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / msPerWeek);
}
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts src/lib/constants.ts src/lib/utils.ts
git commit -m "feat: add design system theme + utility helpers"
```

---

### Task 3: Auth System (Shared Password)

**Files:**
- Create: `src/server/auth.ts`
- Modify: `src/server/api/trpc.ts` **(T3-generated — only if we need to add session to context; otherwise leave as-is)**
- Create: `src/server/api/routers/auth.ts`
- Modify: `src/server/api/root.ts` **(T3-generated — add auth router to the existing merge)**
- Create: `src/app/login/page.tsx`
- Create: `src/middleware.ts`

- [ ] **Step 1: Write the auth utility**

Create `src/server/auth.ts`:

```typescript
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "mpw_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
```

- [ ] **Step 2: Write auth router**

Create `src/server/api/routers/auth.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hashPassword, verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie } from "~/server/auth";

// In-memory session store (fine for 3 users; survives until server restart)
const activeSessions = new Set<string>();

export function isValidSession(token: string): boolean {
  return activeSessions.has(token);
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.appConfig.findUnique({
        where: { key: "app_password_hash" },
      });

      if (!config || !config.value) {
        // First login: set the password
        await ctx.db.appConfig.upsert({
          where: { key: "app_password_hash" },
          update: { value: hashPassword(input.password) },
          create: { key: "app_password_hash", value: hashPassword(input.password) },
        });
      } else if (!verifyPassword(input.password, config.value)) {
        throw new Error("Wrong password");
      }

      const token = createSessionToken();
      activeSessions.add(token);
      await setSessionCookie(token);
      return { success: true };
    }),

  logout: publicProcedure.mutation(async () => {
    await clearSessionCookie();
    return { success: true };
  }),
});
```

- [ ] **Step 3: Add auth router to root**

Modify `src/server/api/root.ts` to import and include `authRouter`:

```typescript
import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Write middleware for auth guard**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("mpw_session")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Allow API routes and login page through
  if (isApiRoute || isLoginPage) {
    return NextResponse.next();
  }

  // No session cookie → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Write the login page**

Create `src/app/login/page.tsx`. Match the mockup in `docs/superpowers/mockups/login.html`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const login = api.auth.login.useMutation({
    onSuccess: () => router.push("/dashboard"),
    onError: () => setError(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    login.mutate({ password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink font-body">
      {/* Diagonal stripes overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(196,52,45,0.04) 30px, rgba(196,52,45,0.04) 60px)",
        }}
      />
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E\")",
        }}
      />

      <form onSubmit={handleSubmit} className="relative z-10 w-80 text-center">
        <h1 className="mb-1 font-display text-[3.5rem] leading-none tracking-wider text-cream">
          MY<span className="text-red">PRIDE</span>WONT
        </h1>
        <p className="mb-10 font-condensed text-sm font-semibold uppercase tracking-[0.2em] text-ink-faint">
          No excuses. No mercy.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-4 w-full rounded-sm border-2 border-ink-faint bg-transparent px-4 py-3 text-center text-cream tracking-[0.15em] placeholder:text-ink-faint placeholder:text-sm placeholder:tracking-widest focus:border-red focus:outline-none"
        />

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.12em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)]"
        >
          GET IN ME
        </button>

        {error && (
          <p className="mt-4 font-condensed text-xs font-semibold uppercase tracking-wider text-red">
            Wrong password. Try again.
          </p>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Add Google Fonts to the T3-generated root layout**

Modify `src/app/layout.tsx` (already created by T3 with TRPCProvider wiring). Add to the `<head>`:

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

Set `<body className="bg-cream font-body text-ink">`.

- [ ] **Step 7: Test login page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/login`. Expected: dark page with MYPRIDEWONT logo, password input, "GET IN ME" button matching the mockup. Enter any password (first login sets it). Should redirect to /dashboard (which won't exist yet, that's OK — verify the redirect attempt).

- [ ] **Step 8: Commit**

```bash
git add src/server/auth.ts src/server/api/routers/auth.ts src/server/api/root.ts src/middleware.ts src/app/login/page.tsx src/app/layout.tsx
git commit -m "feat: add shared password auth with login page"
```

---

### Task 4: App Shell (Nav + Bottom Nav + FAB)

**Files:**
- Create: `src/components/nav.tsx`
- Create: `src/components/bottom-nav.tsx`
- Create: `src/components/fab.tsx`
- Create: `src/components/shell.tsx`
- Create: `src/components/log-modal.tsx` (placeholder)
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write top nav component**

Create `src/components/nav.tsx`. Match mockup nav (dark bg, logo, user badge, hamburger):

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { UserName } from "~/lib/constants";
import { USERS, USER_TEXT_CLASS } from "~/lib/constants";

export function Nav() {
  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const switchUser = (name: UserName) => {
    setCurrentUser(name);
    localStorage.setItem("mpw_user", name);
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between bg-ink px-5 py-2.5">
      <Link href="/dashboard" className="font-display text-2xl leading-none tracking-wider text-cream">
        MY<span className="text-red">PRIDE</span>WONT
      </Link>
      <div className="flex items-center gap-4">
        {/* User picker */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-sm border-[1.5px] border-cream px-2.5 py-1 font-condensed text-xs font-bold uppercase tracking-[0.1em] text-cream"
          >
            {currentUser}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-sm border-2 border-cream bg-ink shadow-card">
              {USERS.map((name) => (
                <button
                  key={name}
                  onClick={() => switchUser(name)}
                  className={`block w-full px-4 py-2 text-left font-condensed text-sm font-bold uppercase tracking-wider ${
                    name === currentUser ? USER_TEXT_CLASS[name] : "text-cream"
                  } hover:bg-ink-light`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write bottom nav component**

Create `src/components/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "\u25A0" },
  { href: "/calendar", label: "Calendar", icon: "\u25A1" },
  { href: "/activities", label: "Log", icon: "\u2630" },
  { href: "/goals", label: "Goals", icon: "\u25B2" },
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
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write FAB component**

Create `src/components/fab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { LogModal } from "~/components/log-modal";

export function Fab() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-[4.5rem] right-5 z-[51] flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-red pb-0.5 font-display text-3xl text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm sm:bottom-6"
      >
        +
      </button>
      {showModal && <LogModal onClose={() => setShowModal(false)} />}
    </>
  );
}
```

- [ ] **Step 4: Write log modal placeholder**

Create `src/components/log-modal.tsx` (full implementation in Task 7):

```tsx
"use client";

export function LogModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-ink font-body text-cream">
      <div className="flex items-center justify-between border-b-2 border-cream/10 px-5 py-3">
        <button onClick={onClose} className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint">
          &larr; Back
        </button>
        <div className="font-display text-xl tracking-wider">
          LOG <span className="text-red">ACTIVITY</span>
        </div>
        <div className="w-[50px]" />
      </div>
      <div className="flex h-full items-center justify-center">
        <p className="text-ink-faint">Coming soon</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write app shell**

Create `src/components/shell.tsx`:

```tsx
import { Nav } from "~/components/nav";
import { BottomNav } from "~/components/bottom-nav";
import { Fab } from "~/components/fab";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="mx-auto max-w-[480px]">
        <Nav />
        {children}
        <div className="h-16 sm:h-0" /> {/* Bottom nav spacer */}
      </div>
      <Fab />
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 6: Set up root redirect and dashboard placeholder**

Modify `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

Create `src/app/dashboard/page.tsx`:

```tsx
import { Shell } from "~/components/shell";

export default function DashboardPage() {
  return (
    <Shell>
      <div className="p-5 text-center font-condensed text-ink-faint">Dashboard coming soon</div>
    </Shell>
  );
}
```

- [ ] **Step 7: Test shell layout**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: ink nav bar with MYPRIDEWONT logo, user badge "Jake", bottom tab bar with 4 tabs, red "+" FAB. Mobile responsive — bottom nav hidden on desktop.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/app/page.tsx src/app/dashboard/
git commit -m "feat: add app shell with nav, bottom nav, FAB, and user picker"
```

---

### Task 5: tRPC Routers (User, Activity, Goal)

**Files:**
- Create: `src/server/api/routers/user.ts`
- Create: `src/server/api/routers/activity.ts`
- Create: `src/server/api/routers/goal.ts`
- Modify: `src/server/api/root.ts` **(T3-generated — add routers to existing `createTRPCRouter` call)**

**T3 provides:** `createTRPCRouter`, `publicProcedure`, and `protectedProcedure` from `~/server/api/trpc`. Use `publicProcedure` for all routes (auth is handled at the middleware layer). The `ctx.db` object (Prisma client) is already wired into tRPC context by the scaffold.

- [ ] **Step 1: Write user router**

Create `src/server/api/routers/user.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.user.findMany({ orderBy: { name: "asc" } });
  }),

  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.user.findUnique({ where: { name: input.name } });
    }),
});
```

- [ ] **Step 2: Write activity router**

Create `src/server/api/routers/activity.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { computePace } from "~/lib/utils";
import { DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";

export const activityRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        date: z.string(), // ISO date string "2026-03-19"
        type: z.string(),
        durationSec: z.number().int().positive(),
        distanceMi: z.number().positive().optional(),
        notes: z.string().optional(),
        source: z.string().default("manual"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const paceSecPerMi =
        input.distanceMi && input.type === "run"
          ? computePace(input.distanceMi, input.durationSec)
          : null;

      return ctx.db.activity.create({
        data: {
          userId: input.userId,
          date: new Date(input.date),
          type: input.type,
          durationSec: input.durationSec,
          distanceMi: input.distanceMi ?? null,
          paceSecPerMi: paceSecPerMi,
          notes: input.notes ?? null,
          source: input.source,
        },
      });
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        type: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.userId) where.userId = input.userId;
      if (input.type) where.type = input.type;
      if (input.from || input.to) {
        where.date = {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        };
      }

      const items = await ctx.db.activity.findMany({
        where,
        include: { user: true },
        orderBy: { date: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.activity.findUnique({
        where: { id: input.id },
        include: { user: true, splits: { orderBy: { mileNumber: "asc" } } },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.activity.delete({ where: { id: input.id } });
    }),

  recentFeed: publicProcedure
    .input(z.object({ limit: z.number().int().default(10) }))
    .query(({ ctx, input }) => {
      return ctx.db.activity.findMany({
        include: { user: true },
        orderBy: { date: "desc" },
        take: input.limit,
      });
    }),

  weekSummary: publicProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.activity.findMany({
        where: {
          date: {
            gte: new Date(input.weekStart),
            lte: new Date(input.weekEnd),
          },
        },
        include: { user: true },
        orderBy: { date: "asc" },
      });
    }),
});
```

- [ ] **Step 3: Write goal router**

Create `src/server/api/routers/goal.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const goalRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        activityType: z.string(),
        timesPerWeek: z.number().int().positive(),
        targetDistanceMi: z.number().positive().optional(),
        targetDurationMin: z.number().int().positive().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.weeklyGoal.create({
        data: {
          userId: input.userId,
          activityType: input.activityType,
          timesPerWeek: input.timesPerWeek,
          targetDistanceMi: input.targetDistanceMi ?? null,
          targetDurationMin: input.targetDurationMin ?? null,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
        },
      });
    }),

  list: publicProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(({ ctx, input }) => {
      return ctx.db.weeklyGoal.findMany({
        where: input.userId ? { userId: input.userId } : {},
        include: { user: true },
        orderBy: [{ startDate: "asc" }, { activityType: "asc" }],
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.weeklyGoal.delete({ where: { id: input.id } });
    }),

  /** Parse plan text and create goals. Format: "run 3mi x2, mar 23 - may 31" */
  importPlan: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        planText: z.string(),
        replaceExisting: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Delete existing goals for user if replacing
      if (input.replaceExisting) {
        await ctx.db.weeklyGoal.deleteMany({ where: { userId: input.userId } });
      }

      const lines = input.planText
        .split("\n")
        .map((l) => l.replace(/#.*$/, "").trim())
        .filter(Boolean);

      const goals = [];
      const currentYear = new Date().getFullYear();

      for (const line of lines) {
        const parsed = parsePlanLine(line, currentYear);
        if (!parsed) continue;

        const goal = await ctx.db.weeklyGoal.create({
          data: {
            userId: input.userId,
            activityType: parsed.activityType,
            timesPerWeek: parsed.timesPerWeek,
            targetDistanceMi: parsed.targetDistanceMi,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
          },
        });
        goals.push(goal);
      }

      return { created: goals.length };
    }),

  /** Get goal progress for a user in a given week */
  weekProgress: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        weekStart: z.string(),
        weekEnd: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const goals = await ctx.db.weeklyGoal.findMany({
        where: {
          userId: input.userId,
          startDate: { lte: new Date(input.weekEnd) },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(input.weekStart) } },
          ],
        },
      });

      const activities = await ctx.db.activity.findMany({
        where: {
          userId: input.userId,
          date: {
            gte: new Date(input.weekStart),
            lte: new Date(input.weekEnd),
          },
        },
      });

      return goals.map((goal) => {
        const matching = activities.filter((a) => {
          if (a.type !== goal.activityType) return false;
          if (goal.targetDistanceMi && a.distanceMi) {
            return a.distanceMi >= goal.targetDistanceMi;
          }
          return true;
        });

        return {
          goal,
          completed: matching.length,
          target: goal.timesPerWeek,
          met: matching.length >= goal.timesPerWeek,
        };
      });
    }),
});

/** Parse a single plan line like "run 3mi x2, mar 23 - may 31" */
function parsePlanLine(
  line: string,
  year: number,
): {
  activityType: string;
  timesPerWeek: number;
  targetDistanceMi: number | null;
  startDate: Date;
  endDate: Date | null;
} | null {
  // Pattern: <type> [<dist>mi] x<freq>, <start> [- <end>]
  const match = line.match(
    /^(\w+)\s*(?:(\d+(?:\.\d+)?)mi\s*)?x(\d+)\s*,\s*(.+)$/i,
  );
  if (!match) return null;

  const [, type, dist, freq, dateStr] = match;
  if (!type || !freq || !dateStr) return null;

  const activityType = type.toLowerCase();
  const timesPerWeek = parseInt(freq, 10);
  const targetDistanceMi = dist ? parseFloat(dist) : null;

  const dateParts = dateStr.split("-").map((s) => s.trim());
  const startDate = parseShortDate(dateParts[0]!, year);
  if (!startDate) return null;

  const endDate = dateParts[1] ? parseShortDate(dateParts[1], year) : null;

  return { activityType, timesPerWeek, targetDistanceMi, startDate, endDate };
}

/** Parse "mar 23" or "jun 1" into a Date */
function parseShortDate(str: string, year: number): Date | null {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const match = str.match(/^(\w{3})\s+(\d{1,2})$/i);
  if (!match) return null;
  const month = months[match[1]!.toLowerCase()];
  if (month === undefined) return null;
  return new Date(year, month, parseInt(match[2]!, 10));
}
```

- [ ] **Step 4: Register all routers in root**

Update `src/server/api/root.ts`:

```typescript
import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { userRouter } from "~/server/api/routers/user";
import { activityRouter } from "~/server/api/routers/activity";
import { goalRouter } from "~/server/api/routers/goal";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  activity: activityRouter,
  goal: goalRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/api/routers/ src/server/api/root.ts
git commit -m "feat: add tRPC routers for users, activities, and goals"
```

---

### Task 6: Dashboard Page

**Files:**
- Create: `src/components/dashboard/countdown.tsx`
- Create: `src/components/dashboard/fighter-card.tsx`
- Create: `src/components/dashboard/feed.tsx`
- Modify: `src/app/dashboard/page.tsx`

Reference mockup: `docs/superpowers/mockups/dashboard.html`

**T3 note:** Server components use `import { api } from "~/trpc/server"` (the T3-generated server caller) to call tRPC procedures directly. Client components use `import { api } from "~/trpc/react"` (the T3-generated React hooks).

- [ ] **Step 1: Write countdown strip component**

Create `src/components/dashboard/countdown.tsx`:

```tsx
import { api } from "~/trpc/server";
import { weeksBetween } from "~/lib/utils";

export async function Countdown() {
  const config = await api.goal.list({ userId: undefined });
  // Fetch marathon date from AppConfig directly via Prisma (simpler for a server component)
  const { db } = await import("~/server/db");
  const marathonConfig = await db.appConfig.findUnique({
    where: { key: "marathon_date" },
  });

  if (!marathonConfig) return null;

  const marathonDate = new Date(marathonConfig.value);
  const weeks = weeksBetween(new Date(), marathonDate);

  return (
    <div className="relative overflow-hidden bg-red px-4 py-3 text-center text-cream">
      {/* Diagonal stripes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 20px)",
        }}
      />
      <div className="relative flex items-baseline justify-center gap-2">
        <span className="font-display text-4xl leading-none">{weeks}</span>
        <span className="font-condensed text-sm font-semibold uppercase tracking-[0.12em] opacity-85">
          weeks to race day
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write fighter card component**

Create `src/components/dashboard/fighter-card.tsx`:

```tsx
import type { UserName } from "~/lib/constants";
import { USER_TEXT_CLASS } from "~/lib/constants";
import { formatDurationFriendly, formatPace } from "~/lib/utils";

type GoalProgress = {
  goal: { activityType: string; targetDistanceMi: number | null; timesPerWeek: number };
  completed: number;
  target: number;
  met: boolean;
};

type Props = {
  name: UserName;
  streak: number;
  goals: GoalProgress[];
  weekStats: { totalMi: number; totalSec: number; avgPace: number | null };
};

export function FighterCard({ name, streak, goals, weekStats }: Props) {
  return (
    <div className="mb-3 overflow-hidden rounded-sm border-2 border-ink bg-white shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-divider px-3 py-2">
        <div className={`font-display text-2xl leading-none tracking-wider ${USER_TEXT_CLASS[name]}`}>
          {name.toUpperCase()}
        </div>
        <div
          className={`rounded-sm px-2 py-0.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-cream ${
            streak > 0 ? "bg-green" : "bg-red"
          }`}
        >
          {streak} wk streak
        </div>
      </div>

      {/* Goal rows */}
      <div className="px-3 py-2.5">
        {goals.map((g, i) => {
          const pct = Math.min(100, (g.completed / g.target) * 100);
          const status = g.met ? "done" : g.completed > 0 ? "progress" : "behind";
          const barColor = { done: "bg-green", progress: "bg-ink", behind: "bg-red" }[status];
          const countColor = { done: "text-green", progress: "text-ink", behind: "text-red" }[status];

          const label = g.goal.targetDistanceMi
            ? `${g.goal.activityType} ${g.goal.targetDistanceMi}mi`
            : g.goal.activityType;

          return (
            <div key={i} className="mb-2 flex items-center gap-2 last:mb-0">
              <div className="w-[70px] shrink-0 font-condensed text-xs font-bold uppercase tracking-wider text-ink-light capitalize">
                {label}
              </div>
              <div className="flex-1 overflow-hidden rounded-sm border border-divider bg-cream-dark" style={{ height: 14 }}>
                <div className={`h-full rounded-sm ${barColor} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
              </div>
              <div className={`w-9 text-right font-display text-base leading-none ${countColor}`}>
                {g.completed}/{g.target}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex gap-4 border-t border-divider bg-cream px-3 py-1.5 font-condensed text-xs text-ink-light tracking-wide">
        {weekStats.totalMi > 0 && (
          <span><strong className="font-bold text-ink">{weekStats.totalMi.toFixed(1)}</strong> mi</span>
        )}
        <span><strong className="font-bold text-ink">{formatDurationFriendly(weekStats.totalSec)}</strong> total</span>
        {weekStats.avgPace && (
          <span><strong className="font-bold text-ink">{formatPace(weekStats.avgPace)}</strong> avg</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write feed component**

Create `src/components/dashboard/feed.tsx`:

```tsx
import type { UserName } from "~/lib/constants";
import { USER_BG_CLASS } from "~/lib/constants";
import { formatDurationFriendly, formatPace, formatDateShort } from "~/lib/utils";

type FeedActivity = {
  id: string;
  date: Date;
  type: string;
  distanceMi: number | null;
  durationSec: number;
  paceSecPerMi: number | null;
  notes: string | null;
  user: { name: string };
};

export function Feed({ activities }: { activities: FeedActivity[] }) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  function relativeDate(date: Date): string {
    const d = new Date(date).toDateString();
    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
    if (diff < 7) return `${diff} days ago`;
    return formatDateShort(new Date(date));
  }

  return (
    <div className="px-5 pb-6">
      {activities.map((a) => {
        const name = a.user.name as UserName;
        const dotColors: Record<string, string> = {
          Jake: "bg-blue-steel",
          Calder: "bg-amber",
          Son: "bg-purple-muted",
        };

        return (
          <div key={a.id} className="flex items-center border-b border-divider py-2.5 last:border-b-0">
            <div className={`mr-2.5 h-2 w-2 shrink-0 rounded-full ${dotColors[name] ?? "bg-ink-faint"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-condensed text-sm font-bold uppercase tracking-wider">{name}</div>
              <div className="text-xs text-ink-light">{a.notes ?? a.type}</div>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <div className="font-display text-lg leading-none">
                {a.distanceMi ? `${a.distanceMi.toFixed(1)} mi` : formatDurationFriendly(a.durationSec)}
              </div>
              <div className="font-condensed text-[0.65rem] text-ink-light tracking-wide">
                {a.distanceMi ? formatDurationFriendly(a.durationSec) : ""}{" "}
                {a.paceSecPerMi ? `· ${formatPace(a.paceSecPerMi)}` : ""}{" "}
                {!a.distanceMi ? a.type : ""} · {relativeDate(a.date)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Wire up dashboard page**

Rewrite `src/app/dashboard/page.tsx`:

```tsx
import { Shell } from "~/components/shell";
import { Countdown } from "~/components/dashboard/countdown";
import { FighterCard } from "~/components/dashboard/fighter-card";
import { Feed } from "~/components/dashboard/feed";
import { api } from "~/trpc/server";
import { getWeekStart, getWeekEnd } from "~/lib/utils";
import type { UserName } from "~/lib/constants";
import { USERS } from "~/lib/constants";

export default async function DashboardPage() {
  const users = await api.user.getAll();
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const ws = weekStart.toISOString().split("T")[0]!;
  const we = weekEnd.toISOString().split("T")[0]!;

  const feed = await api.activity.recentFeed({ limit: 10 });

  // Fetch per-user data
  const userCards = await Promise.all(
    users.map(async (user) => {
      const goals = await api.goal.weekProgress({
        userId: user.id,
        weekStart: ws,
        weekEnd: we,
      });

      const weekActivities = await api.activity.weekSummary({
        weekStart: ws,
        weekEnd: we,
      });
      const userActivities = weekActivities.filter((a) => a.userId === user.id);

      const totalMi = userActivities.reduce((sum, a) => sum + (a.distanceMi ?? 0), 0);
      const totalSec = userActivities.reduce((sum, a) => sum + a.durationSec, 0);
      const runs = userActivities.filter((a) => a.type === "run" && a.paceSecPerMi);
      const avgPace = runs.length
        ? Math.round(runs.reduce((s, a) => s + a.paceSecPerMi!, 0) / runs.length)
        : null;

      return {
        name: user.name as UserName,
        streak: 0, // TODO: compute from historical data
        goals,
        weekStats: { totalMi, totalSec, avgPace },
      };
    }),
  );

  return (
    <Shell>
      <Countdown />

      <div className="mx-5 border-b-2 border-ink px-0 pb-1.5 pt-4 font-display text-sm uppercase tracking-[0.15em] text-ink-light">
        This Week
      </div>

      <div className="px-5 pt-3">
        {userCards.map((card) => (
          <FighterCard key={card.name} {...card} />
        ))}
      </div>

      <div className="mx-5 border-b-2 border-ink px-0 pb-1.5 pt-4 font-display text-sm uppercase tracking-[0.15em] text-ink-light">
        Recent
      </div>

      <Feed activities={feed} />
    </Shell>
  );
}
```

- [ ] **Step 5: Test dashboard page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: countdown strip, three fighter cards (empty goals since no goals set), empty feed. Matches the structure of `docs/superpowers/mockups/dashboard.html`.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ src/app/dashboard/page.tsx
git commit -m "feat: add dashboard page with countdown, fighter cards, and feed"
```

---

### Task 7: Manual Entry Modal (Log Activity)

**Files:**
- Modify: `src/components/log-modal.tsx`

Reference mockup: `docs/superpowers/mockups/manual-entry.html`

- [ ] **Step 1: Implement the full log modal**

Replace `src/components/log-modal.tsx` with the full implementation:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { ACTIVITY_TYPES, ACTIVITY_LABELS, ACTIVITY_ICONS, DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType, UserName } from "~/lib/constants";
import { USERS } from "~/lib/constants";
import { formatPace, computePace } from "~/lib/utils";

export function LogModal({ onClose }: { onClose: () => void }) {
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [distance, setDistance] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [notes, setNotes] = useState("");
  const [dateOption, setDateOption] = useState<"today" | "yesterday" | "pick">("today");
  const [customDate, setCustomDate] = useState("");

  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const users = api.user.getAll.useQuery();
  const utils = api.useUtils();

  const createActivity = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.invalidate();
      void utils.goal.invalidate();
      onClose();
    },
  });

  const dateValue = useMemo(() => {
    const now = new Date();
    if (dateOption === "yesterday") {
      now.setDate(now.getDate() - 1);
    } else if (dateOption === "pick" && customDate) {
      return customDate;
    }
    return now.toISOString().split("T")[0]!;
  }, [dateOption, customDate]);

  const totalSec = (parseInt(durationMin || "0", 10) * 60) + parseInt(durationSec || "0", 10);
  const distNum = parseFloat(distance || "0");
  const pace = activityType === "run" && distNum > 0 && totalSec > 0
    ? computePace(distNum, totalSec)
    : null;

  const handleSubmit = () => {
    const userId = users.data?.find((u) => u.name === currentUser)?.id;
    if (!userId || totalSec <= 0) return;

    createActivity.mutate({
      userId,
      date: dateValue,
      type: activityType,
      durationSec: totalSec,
      distanceMi: distNum > 0 ? distNum : undefined,
      notes: notes || undefined,
    });
  };

  const showDistance = DISTANCE_TYPES.includes(activityType);

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
        <button onClick={onClose} className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint">
          &larr; Back
        </button>
        <div className="font-display text-xl tracking-wider">
          LOG <span className="text-red">ACTIVITY</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Activity Type Grid */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            What did you do?
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActivityType(t)}
                className={`flex flex-col items-center gap-1 rounded-sm border-[1.5px] px-1 py-2.5 transition-all ${
                  activityType === t
                    ? "border-red bg-red text-cream shadow-[2px_2px_0_rgba(245,240,232,0.1)]"
                    : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
                }`}
              >
                <span className="text-xl leading-none">{ACTIVITY_ICONS[t]}</span>
                <span className="font-condensed text-[0.65rem] font-bold uppercase tracking-wider">
                  {ACTIVITY_LABELS[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            When?
          </label>
          <div className="flex gap-1.5">
            {(["today", "yesterday", "pick"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setDateOption(opt)}
                className={`flex-1 rounded-sm border-[1.5px] px-1 py-1.5 text-center font-condensed text-[0.7rem] font-bold uppercase tracking-wider transition-all ${
                  dateOption === opt
                    ? "border-cream bg-cream/10 text-cream"
                    : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
                }`}
              >
                {opt === "pick" ? "Pick date" : opt}
              </button>
            ))}
          </div>
          {dateOption === "pick" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mt-2 w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2 text-center font-condensed text-sm font-bold uppercase tracking-wider text-cream focus:border-red focus:outline-none"
            />
          )}
        </div>

        {/* Distance + Duration */}
        <div className="mb-5 flex gap-3">
          {showDistance && (
            <div className="flex-1">
              <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Distance
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                Miles
              </div>
            </div>
          )}
          <div className="flex-1">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                placeholder="00"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <span className="font-display text-2xl text-ink-faint">:</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className="flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
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
            <span className="font-display text-3xl leading-none text-cream">{formatPace(pace).replace("/mi", "")}</span>
            <span className="font-condensed text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">/mi</span>
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
            placeholder="Easy pace around the park..."
            className="min-h-[60px] w-full resize-y rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-red focus:outline-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={createActivity.isPending || totalSec <= 0}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          LOG IT
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test the modal**

```bash
npm run dev
```

Click the red "+" FAB on any page. Expected: full-screen dark modal with activity type grid, date shortcuts, distance/duration inputs, computed pace preview, notes, and "LOG IT" button. Match `docs/superpowers/mockups/manual-entry.html`.

- [ ] **Step 3: Commit**

```bash
git add src/components/log-modal.tsx
git commit -m "feat: implement manual activity entry modal"
```

---

### Task 8: Calendar Page

**Files:**
- Create: `src/components/calendar/week-past.tsx`
- Create: `src/components/calendar/week-current.tsx`
- Create: `src/components/calendar/week-future.tsx`
- Create: `src/app/calendar/page.tsx`

Reference mockup: `docs/superpowers/mockups/calendar.html`

- [ ] **Step 1: Write past week component**

Create `src/components/calendar/week-past.tsx`:

```tsx
import type { UserName } from "~/lib/constants";
import { USER_TEXT_CLASS } from "~/lib/constants";
import { formatDateShort } from "~/lib/utils";

type ActivityPill = {
  userName: UserName;
  type: string;
  distanceMi: number | null;
  durationSec: number;
};

type DayData = {
  date: Date;
  dayOfWeek: string;
  dayNum: number;
  activities: ActivityPill[];
};

type StampData = {
  name: UserName;
  initial: string;
  status: "earned" | "failed";
};

type Props = {
  weekLabel: string;
  days: DayData[];
  stamps: StampData[];
};

export function WeekPast({ weekLabel, days, stamps }: Props) {
  return (
    <div className="scroll-snap-align-start border-b border-divider">
      {/* Week header */}
      <div className="flex items-center gap-2 border-b border-divider px-4 py-2">
        <div className="shrink-0 font-display text-base tracking-wider text-ink-light">{weekLabel}</div>
        <div className="ml-auto flex gap-1.5">
          {stamps.map((s) => (
            <div
              key={s.name}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] ${
                s.status === "earned"
                  ? "border-green bg-green-light"
                  : "border-red bg-red/5"
              }`}
            >
              <span className={`font-display text-sm leading-none ${s.status === "earned" ? "text-green" : "text-red"}`}>
                {s.initial}
              </span>
              <div className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${
                s.status === "earned" ? "bg-green" : "bg-red"
              }`} />
            </div>
          ))}
        </div>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => (
          <div key={i} className="min-h-[48px] border-r border-divider px-0.5 py-1 last:border-r-0">
            <div className="mb-0.5 text-center">
              <div className="font-condensed text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-ink-faint leading-none">
                {day.dayOfWeek}
              </div>
              <div className="font-display text-base leading-none text-ink-light">{day.dayNum}</div>
            </div>
            <div className="flex flex-col gap-0.5 px-px">
              {day.activities.map((a, j) => {
                const initial = a.userName[0]!;
                const pillClass: Record<UserName, string> = {
                  Jake: "bg-blue-steel/15 text-blue-steel",
                  Calder: "bg-amber/15 text-amber",
                  Son: "bg-purple-muted/15 text-purple-muted",
                };
                const dist = a.distanceMi ? `${a.distanceMi}mi` : `${Math.round(a.durationSec / 60)}m`;
                return (
                  <div
                    key={j}
                    className={`truncate rounded-sm px-1 py-px font-condensed text-[0.55rem] font-semibold uppercase tracking-tight ${pillClass[a.userName]}`}
                  >
                    {initial} {a.type.slice(0, 3)} {dist}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write current week component**

Create `src/components/calendar/week-current.tsx`:

```tsx
import type { UserName } from "~/lib/constants";

type ActivityPill = {
  userName: UserName;
  type: string;
  distanceMi: number | null;
  durationSec: number;
};

type DayData = {
  date: Date;
  dayOfWeek: string;
  dayNum: number;
  isToday: boolean;
  activities: ActivityPill[];
};

type TallyItem = {
  name: UserName;
  initial: string;
  goals: { label: string; completed: number; target: number }[];
};

type Props = {
  weekLabel: string;
  days: DayData[];
  tally: TallyItem[];
};

export function WeekCurrent({ weekLabel, days, tally }: Props) {
  return (
    <div className="mx-2 my-1 overflow-hidden rounded-sm border-2 border-ink bg-white shadow-card scroll-snap-align-start">
      {/* Header */}
      <div className="flex items-center gap-2 border-b-[1.5px] border-ink px-4 py-2">
        <div className="font-display text-lg tracking-wider text-ink">{weekLabel} &middot; THIS WEEK</div>
        <div className="ml-auto flex gap-1.5">
          {tally.map((t) => (
            <div key={t.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-divider">
              <span className="font-display text-sm leading-none text-divider">{t.initial}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded day grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const pillClass: Record<UserName, string> = {
            Jake: "bg-blue-steel/15 text-blue-steel",
            Calder: "bg-amber/15 text-amber",
            Son: "bg-purple-muted/15 text-purple-muted",
          };
          return (
            <div
              key={i}
              className={`min-h-[90px] border-r border-divider px-0.5 py-1.5 last:border-r-0 ${
                day.isToday ? "bg-red/5" : ""
              }`}
            >
              <div className="mb-0.5 text-center">
                <div className="font-condensed text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-ink-faint leading-none">
                  {day.dayOfWeek}
                </div>
                <div className={`font-display text-lg leading-none ${day.isToday ? "text-red" : "text-ink-light"}`}>
                  {day.dayNum}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 px-px">
                {day.activities.map((a, j) => {
                  const initial = a.userName[0]!;
                  const dist = a.distanceMi ? `${a.distanceMi}mi` : `${Math.round(a.durationSec / 60)}m`;
                  return (
                    <div
                      key={j}
                      className={`truncate rounded-sm px-1 py-0.5 font-condensed text-[0.6rem] font-semibold uppercase tracking-tight ${pillClass[a.userName]}`}
                    >
                      {initial} {a.type.slice(0, 3)} {dist}{" "}
                      <span className="ml-0.5 font-bold text-green">&#10003;</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Goal tally */}
      <div className="border-t-[1.5px] border-ink px-3 py-2">
        {tally.map((t) => {
          const nameClass: Record<UserName, string> = {
            Jake: "text-blue-steel", Calder: "text-amber", Son: "text-purple-muted",
          };
          return (
            <div key={t.name} className="mb-1 flex items-center gap-1.5 last:mb-0">
              <div className={`w-5 shrink-0 font-display text-sm ${nameClass[t.name]}`}>{t.initial}</div>
              <div className="flex flex-wrap gap-2 font-condensed text-[0.7rem] font-semibold uppercase tracking-wider">
                {t.goals.map((g, i) => (
                  <span key={i}>
                    <span className="text-ink-light">{g.label}&nbsp;</span>
                    <span className={g.completed >= g.target ? "text-green font-bold" : "text-red font-bold"}>
                      {g.completed}/{g.target}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write future week component**

Create `src/components/calendar/week-future.tsx`:

```tsx
import type { UserName } from "~/lib/constants";

type GoalBanner = {
  name: UserName;
  initial: string;
  label: string;
  frequency: number;
};

type Props = {
  weekLabel: string;
  goals: GoalBanner[];
};

export function WeekFuture({ weekLabel, goals }: Props) {
  const bannerClass: Record<UserName, string> = {
    Jake: "border-blue-steel text-blue-steel bg-blue-steel/5",
    Calder: "border-amber text-amber bg-amber/5",
    Son: "border-purple-muted text-purple-muted bg-purple-muted/5",
  };
  const sepClass: Record<UserName, string> = {
    Jake: "bg-blue-steel", Calder: "bg-amber", Son: "bg-purple-muted",
  };

  // Unique users for stamps
  const uniqueUsers = [...new Set(goals.map((g) => g.name))];

  return (
    <div className="border-b border-divider scroll-snap-align-start">
      <div className="flex items-center gap-2 border-b border-divider px-4 py-2">
        <div className="font-display text-base tracking-wider text-ink-light">{weekLabel}</div>
        <div className="ml-auto flex gap-1.5">
          {uniqueUsers.map((name) => (
            <div key={name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-divider">
              <span className="font-display text-sm leading-none text-divider">{name[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1 px-3 py-2">
        {goals.map((g, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 rounded-sm border-[1.5px] border-dashed px-2 py-1 font-condensed text-xs font-semibold uppercase tracking-wider ${bannerClass[g.name]}`}
          >
            <span className="font-display text-sm leading-none">{g.initial}</span>
            <span className={`h-3.5 w-px opacity-30 ${sepClass[g.name]}`} />
            <span className="flex-1 truncate">{g.label}</span>
            <span className="font-display text-sm leading-none opacity-70">&times;{g.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire up calendar page**

Create `src/app/calendar/page.tsx`:

```tsx
import { Shell } from "~/components/shell";
import { WeekPast } from "~/components/calendar/week-past";
import { WeekCurrent } from "~/components/calendar/week-current";
import { WeekFuture } from "~/components/calendar/week-future";
import { api } from "~/trpc/server";
import { getWeekStart, getWeekEnd, formatDateShort } from "~/lib/utils";
import type { UserName } from "~/lib/constants";
import { USERS } from "~/lib/constants";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function weekLabel(start: Date, end: Date): string {
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  return `${s} – ${e}`;
}

export default async function CalendarPage() {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const users = await api.user.getAll();

  // Generate 2 past + current + 3 future weeks
  const weeks: { start: Date; end: Date; type: "past" | "current" | "future" }[] = [];
  for (let i = -2; i <= 3; i++) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weeks.push({ start, end, type: i < 0 ? "past" : i === 0 ? "current" : "future" });
  }

  // Fetch activities for all visible weeks
  const allStart = weeks[0]!.start.toISOString().split("T")[0]!;
  const allEnd = weeks[weeks.length - 1]!.end.toISOString().split("T")[0]!;
  const activities = await api.activity.weekSummary({ weekStart: allStart, weekEnd: allEnd });

  // Fetch goals for all users
  const allGoals = await api.goal.list({});

  // Build goal progress for current week
  const cwStart = currentWeekStart.toISOString().split("T")[0]!;
  const cwEnd = getWeekEnd(now).toISOString().split("T")[0]!;
  const tallyData = await Promise.all(
    users.map(async (u) => {
      const progress = await api.goal.weekProgress({ userId: u.id, weekStart: cwStart, weekEnd: cwEnd });
      return {
        name: u.name as UserName,
        initial: u.name[0]!,
        goals: progress.map((p) => ({
          label: p.goal.targetDistanceMi
            ? `${p.goal.activityType} ${p.goal.targetDistanceMi}mi`
            : p.goal.activityType.slice(0, 3),
          completed: p.completed,
          target: p.target,
        })),
      };
    }),
  );

  return (
    <Shell>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b-2 border-ink px-5 py-2.5">
        <div className="font-display text-2xl tracking-wider leading-none">
          {now.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </div>
        <button className="rounded-sm bg-ink px-3 py-1.5 font-condensed text-xs font-bold uppercase tracking-[0.1em] text-cream shadow-[2px_2px_0_#c9bfad]">
          Today
        </button>
      </div>

      {/* Scrollable weeks viewport */}
      <div className="relative" style={{ height: "calc(100vh - 7.5rem)", overflowY: "auto", scrollSnapType: "y proximity" }}>
        {/* Top fade */}
        <div className="pointer-events-none sticky top-0 z-10 h-10 bg-gradient-to-b from-cream to-transparent" />

        {weeks.map((week, wi) => {
          const days = getWeekDays(week.start);
          const label = weekLabel(week.start, week.end);
          const weekActs = activities.filter((a) => {
            const d = new Date(a.date);
            return d >= week.start && d <= week.end;
          });

          if (week.type === "past") {
            const dayData = days.map((d, di) => ({
              date: d,
              dayOfWeek: DAY_NAMES[di]!,
              dayNum: d.getDate(),
              activities: weekActs
                .filter((a) => new Date(a.date).toDateString() === d.toDateString())
                .map((a) => ({
                  userName: a.user.name as UserName,
                  type: a.type,
                  distanceMi: a.distanceMi,
                  durationSec: a.durationSec,
                })),
            }));

            return (
              <WeekPast
                key={wi}
                weekLabel={label}
                days={dayData}
                stamps={users.map((u) => ({
                  name: u.name as UserName,
                  initial: u.name[0]!,
                  status: "earned" as const, // TODO: compute from goal progress
                }))}
              />
            );
          }

          if (week.type === "current") {
            const dayData = days.map((d, di) => ({
              date: d,
              dayOfWeek: DAY_NAMES[di]!,
              dayNum: d.getDate(),
              isToday: d.toDateString() === now.toDateString(),
              activities: weekActs
                .filter((a) => new Date(a.date).toDateString() === d.toDateString())
                .map((a) => ({
                  userName: a.user.name as UserName,
                  type: a.type,
                  distanceMi: a.distanceMi,
                  durationSec: a.durationSec,
                })),
            }));

            return <WeekCurrent key={wi} weekLabel={label} days={dayData} tally={tallyData} />;
          }

          // Future week: show goal banners
          const futureGoals = allGoals
            .filter((g) => {
              const start = new Date(g.startDate);
              const end = g.endDate ? new Date(g.endDate) : new Date("2099-12-31");
              return start <= week.end && end >= week.start;
            })
            .map((g) => ({
              name: (g.user?.name ?? "?") as UserName,
              initial: (g.user?.name ?? "?")[0]!,
              label: g.targetDistanceMi
                ? `${g.activityType} ${g.targetDistanceMi}mi`
                : g.activityType,
              frequency: g.timesPerWeek,
            }));

          return <WeekFuture key={wi} weekLabel={label} goals={futureGoals} />;
        })}

        {/* Bottom fade */}
        <div className="pointer-events-none sticky bottom-0 z-10 h-10 bg-gradient-to-t from-cream to-transparent" />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 5: Test calendar page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/calendar`. Expected: scrollable weekly tape with past weeks (day grids + stamps), current week (expanded + goal tally), future weeks (goal banners). Match structure of `docs/superpowers/mockups/calendar.html`.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/ src/app/calendar/
git commit -m "feat: add calendar page with past/current/future week views"
```

---

### Task 9: Activity Log + Activity Detail Pages

**Files:**
- Create: `src/app/activities/page.tsx`
- Create: `src/app/activities/[id]/page.tsx`

- [ ] **Step 1: Write activity log page**

Create `src/app/activities/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Shell } from "~/components/shell";
import { api } from "~/trpc/react";
import { formatDuration, formatPace, formatDateShort } from "~/lib/utils";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";
import type { UserName } from "~/lib/constants";
import { USERS, USER_TEXT_CLASS } from "~/lib/constants";
import Link from "next/link";

export default function ActivitiesPage() {
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  const users = api.user.getAll.useQuery();
  const activities = api.activity.list.useQuery({
    userId: filterUser || undefined,
    type: filterType || undefined,
    limit: 50,
  });

  const selectClass =
    "rounded-sm border-[1.5px] border-divider bg-white px-2 py-1.5 font-condensed text-xs font-semibold uppercase tracking-wider text-ink focus:border-red focus:outline-none";

  return (
    <Shell>
      {/* Header + filters */}
      <div className="border-b-2 border-ink px-5 py-3">
        <div className="mb-2 font-display text-xl tracking-wider">ACTIVITY LOG</div>
        <div className="flex gap-2">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={selectClass}
          >
            <option value="">All</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity list */}
      <div className="px-5">
        {activities.data?.items.map((a) => {
          const dotColors: Record<string, string> = {
            Jake: "bg-blue-steel", Calder: "bg-amber", Son: "bg-purple-muted",
          };
          return (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="flex items-center border-b border-divider py-3"
            >
              <div className={`mr-3 h-2 w-2 shrink-0 rounded-full ${dotColors[a.user.name] ?? "bg-ink-faint"}`} />
              <div className="min-w-0 flex-1">
                <div className="font-condensed text-sm font-bold uppercase tracking-wider">{a.user.name}</div>
                <div className="text-xs capitalize text-ink-light">
                  {a.type}{a.notes ? ` — ${a.notes}` : ""}
                </div>
              </div>
              <div className="ml-3 shrink-0 text-right">
                <div className="font-display text-lg leading-none">
                  {a.distanceMi ? `${a.distanceMi.toFixed(1)} mi` : formatDuration(a.durationSec)}
                </div>
                <div className="font-condensed text-[0.65rem] text-ink-light">
                  {formatDuration(a.durationSec)}
                  {a.paceSecPerMi ? ` · ${formatPace(a.paceSecPerMi)}` : ""}
                  {" · "}{formatDateShort(new Date(a.date))}
                </div>
              </div>
            </Link>
          );
        })}

        {activities.data?.items.length === 0 && (
          <div className="py-8 text-center font-condensed text-sm text-ink-faint">
            No activities yet. Hit the + to log one!
          </div>
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Write activity detail page**

Create `src/app/activities/[id]/page.tsx`:

```tsx
import { Shell } from "~/components/shell";
import { api } from "~/trpc/server";
import { formatDuration, formatPace, formatDurationFriendly } from "~/lib/utils";
import { USER_TEXT_CLASS } from "~/lib/constants";
import type { UserName } from "~/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await api.activity.getById({ id });

  if (!activity) notFound();

  const name = activity.user.name as UserName;

  return (
    <Shell>
      {/* Back link + header */}
      <div className="border-b-2 border-ink px-5 py-3">
        <Link href="/activities" className="mb-1 block font-condensed text-xs font-bold uppercase tracking-wider text-ink-faint">
          &larr; Back to log
        </Link>
        <div className={`font-display text-2xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
          {name.toUpperCase()}
        </div>
        <div className="font-condensed text-sm uppercase tracking-wider text-ink-light capitalize">
          {activity.type} &middot;{" "}
          {new Date(activity.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px border-b-2 border-ink bg-divider">
        {activity.distanceMi && (
          <Stat label="Distance" value={`${activity.distanceMi.toFixed(1)} mi`} />
        )}
        <Stat label="Duration" value={formatDurationFriendly(activity.durationSec)} />
        {activity.paceSecPerMi && (
          <Stat label="Pace" value={formatPace(activity.paceSecPerMi)} />
        )}
        {activity.elevGainFt && (
          <Stat label="Elevation" value={`${Math.round(activity.elevGainFt)} ft`} />
        )}
        {activity.avgHeartRate && (
          <Stat label="Avg HR" value={`${activity.avgHeartRate} bpm`} />
        )}
        {activity.maxHeartRate && (
          <Stat label="Max HR" value={`${activity.maxHeartRate} bpm`} />
        )}
        {activity.calories && (
          <Stat label="Calories" value={`${activity.calories} cal`} />
        )}
      </div>

      {/* Splits table */}
      {activity.splits.length > 0 && (
        <div className="px-5 py-4">
          <div className="mb-2 font-display text-sm uppercase tracking-[0.15em] text-ink-light">Mile Splits</div>
          <div className="overflow-hidden rounded-sm border-2 border-ink">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink bg-cream-dark">
                  <th className="px-3 py-1.5 text-left font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Mile</th>
                  <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Time</th>
                  <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Pace</th>
                  {activity.splits.some((s) => s.elevGainFt) && (
                    <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Elev</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activity.splits.map((s) => (
                  <tr key={s.id} className="border-b border-divider last:border-b-0">
                    <td className="px-3 py-1.5 font-display text-base">{s.mileNumber}</td>
                    <td className="px-3 py-1.5 text-right font-condensed text-sm">{formatDuration(s.durationSec)}</td>
                    <td className="px-3 py-1.5 text-right font-condensed text-sm">{formatPace(s.paceSecPerMi)}</td>
                    {s.elevGainFt !== null && (
                      <td className="px-3 py-1.5 text-right font-condensed text-sm">{Math.round(s.elevGainFt)} ft</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {activity.notes && (
        <div className="px-5 py-4">
          <div className="mb-1 font-display text-sm uppercase tracking-[0.15em] text-ink-light">Notes</div>
          <p className="text-sm text-ink-light">{activity.notes}</p>
        </div>
      )}

      {/* Route map placeholder — Leaflet integration deferred to Strava sync plan */}
      {activity.routePolyline && (
        <div className="mx-5 mb-4 flex h-48 items-center justify-center rounded-sm border-2 border-dashed border-divider bg-cream-dark">
          <span className="font-condensed text-sm text-ink-faint">Route map (requires Leaflet — coming with Strava sync)</span>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3 text-center">
      <div className="font-display text-2xl leading-none">{value}</div>
      <div className="mt-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  );
}
```

- [ ] **Step 3: Test activity pages**

```bash
npm run dev
```

Navigate to `http://localhost:3000/activities`. Expected: filterable list (empty initially). Log an activity via FAB, then see it appear. Click to view detail page with stats grid.

- [ ] **Step 4: Commit**

```bash
git add src/app/activities/
git commit -m "feat: add activity log and detail pages with filters"
```

---

### Task 10: Goals Page (Plan View + Import Plans)

**Files:**
- Create: `src/components/goals/plan-card.tsx`
- Create: `src/components/goals/import-card.tsx`
- Create: `src/components/goals/add-goal-form.tsx`
- Create: `src/app/goals/page.tsx`

Reference mockup: `docs/superpowers/mockups/goals.html`

- [ ] **Step 1: Write plan card component (timeline visualization)**

Create `src/components/goals/plan-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { UserName } from "~/lib/constants";
import { USER_TEXT_CLASS } from "~/lib/constants";
import { AddGoalForm } from "~/components/goals/add-goal-form";

type GoalBar = {
  id: string;
  label: string;
  frequency: number;
  startPct: number;
  widthPct: number;
};

type Props = {
  userId: string;
  name: UserName;
  shameCount: number;
  goals: GoalBar[];
  months: string[];
  nowPct: number;
};

export function PlanCard({ userId, name, shameCount, goals, months, nowPct }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const barColorClass: Record<UserName, string> = {
    Jake: "bg-blue-steel/20 text-blue-steel",
    Calder: "bg-amber/20 text-amber",
    Son: "bg-purple-muted/20 text-purple-muted",
  };

  return (
    <div className="mb-3 overflow-hidden rounded-sm border-2 border-ink bg-white shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[1.5px] border-ink px-3 py-2">
        <div className={`font-display text-xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
          {name.toUpperCase()}
        </div>
        <div
          className={`rounded-sm px-2 py-0.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider ${
            shameCount === 0
              ? "bg-green-light text-green"
              : "border border-red bg-red/5 text-red"
          }`}
        >
          {shameCount} shame mark{shameCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-3 py-2">
        {/* Month headers */}
        <div className="mb-1 flex" style={{ paddingLeft: 70 }}>
          {months.map((m) => (
            <div
              key={m}
              className="flex-1 text-center font-condensed text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-faint"
            >
              {m}
            </div>
          ))}
        </div>

        {/* Goal bars */}
        {goals.map((g) => (
          <div key={g.id} className="mb-1 flex items-center last:mb-0">
            <div className="w-[70px] shrink-0 truncate pr-2 font-condensed text-[0.7rem] font-semibold uppercase tracking-wider text-ink-light capitalize">
              {g.label}
            </div>
            <div className="relative flex h-[18px] flex-1">
              {/* NOW marker */}
              <div
                className="absolute -bottom-1 -top-1 z-10 w-0.5 bg-red"
                style={{ left: `${nowPct}%` }}
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-condensed text-[0.5rem] font-bold tracking-wider text-red">
                  NOW
                </span>
              </div>
              {/* Spacer before bar */}
              <div style={{ width: `${g.startPct}%` }} />
              {/* Bar */}
              <div
                className={`flex items-center justify-center rounded-sm font-condensed text-[0.6rem] font-bold uppercase tracking-wider ${barColorClass[name]}`}
                style={{ width: `${g.widthPct}%` }}
              >
                x{g.frequency}/wk
              </div>
            </div>
          </div>
        ))}

        {/* Add goal button */}
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1.5 w-full rounded-sm border-[1.5px] border-dashed border-divider py-1.5 text-center font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-ink-faint hover:border-ink-light hover:text-ink-light"
          >
            + Add Goal
          </button>
        )}
      </div>

      {/* Inline add goal form */}
      {showAdd && <AddGoalForm userId={userId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Write add goal form component**

Create `src/components/goals/add-goal-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";

export function AddGoalForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [type, setType] = useState("run");
  const [distance, setDistance] = useState("");
  const [frequency, setFrequency] = useState("3");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = api.useUtils();
  const create = api.goal.create.useMutation({
    onSuccess: () => {
      void utils.goal.invalidate();
      onClose();
    },
  });

  const handleSave = () => {
    if (!startDate || !frequency) return;
    create.mutate({
      userId,
      activityType: type,
      timesPerWeek: parseInt(frequency, 10),
      targetDistanceMi: distance ? parseFloat(distance) : undefined,
      startDate,
      endDate: endDate || undefined,
    });
  };

  const miniInput =
    "rounded-sm border-[1.5px] border-divider bg-white px-1.5 py-1 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-ink focus:border-red focus:outline-none";

  return (
    <div className="border-t-[1.5px] border-divider bg-cream px-3 py-2.5">
      <div className="mb-2 font-condensed text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
        Add Goal
      </div>

      <div className="mb-1.5 flex items-center gap-1.5">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={miniInput}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="decimal"
          placeholder="mi"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className={`${miniInput} w-12`}
        />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">mi</span>
        <span className="ml-1 font-condensed text-[0.65rem] font-semibold text-ink-faint">x</span>
        <input
          type="text"
          inputMode="numeric"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className={`${miniInput} w-9`}
        />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">/wk</span>
      </div>

      <div className="mb-2 flex items-center gap-1.5">
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">From</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${miniInput} w-[110px]`} />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">To</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Ongoing" className={`${miniInput} w-[110px]`} />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onClose}
          className="flex-1 rounded-sm border-[1.5px] border-divider py-1.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-ink-faint"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={create.isPending}
          className="flex-1 rounded-sm border-[1.5px] border-red bg-red py-1.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-cream shadow-card-sm"
        >
          Add Goal
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write import card component**

Create `src/components/goals/import-card.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import type { UserName } from "~/lib/constants";
import { USER_TEXT_CLASS } from "~/lib/constants";

type Props = {
  userId: string;
  name: UserName;
  hasGoals: boolean;
};

export function ImportCard({ userId, name, hasGoals }: Props) {
  const [planText, setPlanText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const importPlan = api.goal.importPlan.useMutation({
    onSuccess: (data) => {
      void utils.goal.invalidate();
      alert(`Created ${data.created} goals`);
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlanText(reader.result as string);
    reader.readAsText(file);
  };

  return (
    <div className="mb-3 overflow-hidden rounded-sm border-2 border-ink bg-white shadow-card">
      <div className="flex items-center justify-between border-b-[1.5px] border-ink px-3 py-2">
        <div className={`font-display text-xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
          {name.toUpperCase()}
        </div>
        <div
          className={`rounded-sm px-2 py-0.5 font-condensed text-[0.65rem] font-bold uppercase tracking-wider ${
            planText || hasGoals
              ? "bg-green-light text-green"
              : "bg-cream-dark text-ink-faint"
          }`}
        >
          {planText || hasGoals ? "Plan loaded" : "No plan"}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          placeholder={`run 3mi x3, mar 23 - may 31\nswim x1, mar 23\n...`}
          rows={5}
          className="w-full rounded-sm border-[1.5px] border-ink bg-ink p-3 font-mono text-[0.7rem] leading-relaxed text-cream placeholder:text-ink-faint focus:border-red focus:outline-none"
          style={{ resize: "vertical" }}
        />
        <div className="mt-2 flex gap-2">
          <input ref={fileRef} type="file" accept=".txt" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-sm border-[1.5px] border-ink py-2 text-center font-condensed text-xs font-bold uppercase tracking-wider text-ink shadow-[2px_2px_0_#c9bfad] active:translate-x-px active:translate-y-px"
          >
            Upload File
          </button>
          <button
            onClick={() => importPlan.mutate({ userId, planText, replaceExisting: true })}
            disabled={!planText.trim() || importPlan.isPending}
            className="flex-1 rounded-sm border-[1.5px] border-red bg-red py-2 text-center font-condensed text-xs font-bold uppercase tracking-wider text-cream shadow-card-sm active:translate-x-px active:translate-y-px disabled:opacity-50"
          >
            Apply Plan
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire up goals page with tabs**

Create `src/app/goals/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Shell } from "~/components/shell";
import { PlanCard } from "~/components/goals/plan-card";
import { ImportCard } from "~/components/goals/import-card";
import { api } from "~/trpc/react";
import type { UserName } from "~/lib/constants";

// Compute timeline positions for a 6-month window
const TIMELINE_MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const TIMELINE_START = new Date(2026, 2, 1); // Mar 2026
const TIMELINE_END = new Date(2026, 8, 1);   // Sep 2026
const TIMELINE_SPAN = TIMELINE_END.getTime() - TIMELINE_START.getTime();

function dateToPct(d: Date): number {
  return Math.max(0, Math.min(100, ((d.getTime() - TIMELINE_START.getTime()) / TIMELINE_SPAN) * 100));
}

export default function GoalsPage() {
  const [tab, setTab] = useState<"plan" | "import">("plan");
  const users = api.user.getAll.useQuery();
  const goals = api.goal.list.useQuery({});

  const nowPct = dateToPct(new Date());

  return (
    <Shell>
      {/* Tabs */}
      <div className="flex border-b-2 border-ink">
        <button
          onClick={() => setTab("plan")}
          className={`flex-1 border-b-[3px] py-2.5 text-center font-display text-lg tracking-wider ${
            tab === "plan"
              ? "border-red text-ink"
              : "border-transparent text-ink-faint hover:text-ink"
          }`}
        >
          Plan View
        </button>
        <button
          onClick={() => setTab("import")}
          className={`flex-1 border-b-[3px] py-2.5 text-center font-display text-lg tracking-wider ${
            tab === "import"
              ? "border-red text-ink"
              : "border-transparent text-ink-faint hover:text-ink"
          }`}
        >
          Import Plans
        </button>
      </div>

      {tab === "plan" && (
        <div className="p-3">
          {users.data?.map((user) => {
            const userGoals = (goals.data ?? []).filter((g) => g.userId === user.id);
            const goalBars = userGoals.map((g) => {
              const start = new Date(g.startDate);
              const end = g.endDate ? new Date(g.endDate) : TIMELINE_END;
              const startPct = dateToPct(start);
              const endPct = dateToPct(end);
              return {
                id: g.id,
                label: g.targetDistanceMi
                  ? `${g.activityType} ${g.targetDistanceMi}mi`
                  : g.activityType,
                frequency: g.timesPerWeek,
                startPct,
                widthPct: Math.max(5, endPct - startPct),
              };
            });

            return (
              <PlanCard
                key={user.id}
                userId={user.id}
                name={user.name as UserName}
                shameCount={0} // TODO: compute from historical shame data
                goals={goalBars}
                months={TIMELINE_MONTHS}
                nowPct={nowPct}
              />
            );
          })}
        </div>
      )}

      {tab === "import" && (
        <div className="p-3">
          {/* Format reference */}
          <div className="mb-3 rounded-sm border-[1.5px] border-divider bg-cream p-3">
            <div className="mb-1 font-condensed text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
              Plan File Format
            </div>
            <pre className="font-mono text-[0.65rem] leading-relaxed text-ink-light">
              {`# one goal per line
run 3mi x2, mar 23 - may 31
run 4mi x1, mar 23 - may 31
strength x2, mar 23           # no end = ongoing
run 5mi x2, jun 1 - aug 31   # ramp up phase`}
            </pre>
          </div>

          {users.data?.map((user) => {
            const hasGoals = (goals.data ?? []).some((g) => g.userId === user.id);
            return (
              <ImportCard
                key={user.id}
                userId={user.id}
                name={user.name as UserName}
                hasGoals={hasGoals}
              />
            );
          })}
        </div>
      )}
    </Shell>
  );
}
```

- [ ] **Step 5: Test goals page**

```bash
npm run dev
```

Navigate to `http://localhost:3000/goals`. Expected: Two tabs — "Plan View" shows per-person cards with timeline bars and "+ Add Goal" buttons. "Import Plans" shows per-person cards with monospace editor, upload/apply buttons, and format reference. Match `docs/superpowers/mockups/goals.html`.

- [ ] **Step 6: Commit**

```bash
git add src/components/goals/ src/app/goals/
git commit -m "feat: add goals page with plan view timeline and import plans"
```

---

### Task 11: Polish + Integration Testing

**Files:**
- Modify: various files as needed

- [ ] **Step 1: Add JetBrains Mono font for goals import editor**

In `src/app/layout.tsx`, add the font link:

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Add to `tailwind.config.ts` fontFamily:

```typescript
mono: ["JetBrains Mono", ...fontFamily.mono],
```

- [ ] **Step 2: Full integration walkthrough**

Run the app and test the following flow:
1. Visit `/` — redirects to `/login`
2. Enter a password → redirected to `/dashboard`
3. Dashboard shows countdown, empty fighter cards, empty feed
4. Click "+" FAB → log a run: 5.2mi, 42:03, notes "Morning jog"
5. Dashboard shows the activity in feed, updates fighter card if goals exist
6. Navigate to Calendar → see the activity on today's cell
7. Navigate to Goals → Import Plans tab → paste plan for Jake → Apply
8. Go back to Plan View → see timeline bars
9. Navigate to Dashboard → fighter card shows goal progress
10. Navigate to Activities → see the logged run → click for detail

```bash
npm run dev
```

- [ ] **Step 3: Fix any issues found during walkthrough**

Address any bugs, styling mismatches with mockups, or type errors.

- [ ] **Step 4: Type check and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: clean type check and successful production build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: polish and integration fixes for web app"
```

---

## What's Next

This plan covers the web application. Two follow-up plans are needed:

1. **Strava Sync Plan** — OAuth flow, activity import, Leaflet route maps, automatic sync via worker cron
2. **Signal Worker Plan** — signal-cli daemon setup, inbound message parsing, outbound notifications (activity logged, shame report, weekly summary), Docker container for worker

Both depend on this web app being complete first, as they build on the database schema, tRPC routers, and UI components established here.
