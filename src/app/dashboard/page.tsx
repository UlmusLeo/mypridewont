"use client";

import { Shell } from "~/components/shell";
import { FighterCard } from "~/components/dashboard/fighter-card";
import { Feed } from "~/components/dashboard/feed";
import { api } from "~/trpc/react";
import { getWeekStart, getWeekEnd, weeksBetween } from "~/lib/utils";
import type { UserName } from "~/lib/constants";

export default function DashboardPage() {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const ws = weekStart.toISOString().split("T")[0]!;
  const we = weekEnd.toISOString().split("T")[0]!;

  const users = api.user.getAll.useQuery();
  const feed = api.activity.recentFeed.useQuery({ limit: 10 });
  const weekActivities = api.activity.weekSummary.useQuery({ weekStart: ws, weekEnd: we });

  // Fetch goal progress per user
  const goalProgress = api.goal.weekProgress.useQuery(
    { userId: users.data?.[0]?.id ?? "", weekStart: ws, weekEnd: we },
    { enabled: false }, // we'll manually handle below
  );

  // Build user cards from cached data
  const userCards = (users.data ?? []).map((user) => {
    const userActs = (weekActivities.data ?? []).filter((a) => a.userId === user.id);
    const totalMi = userActs.reduce((sum, a) => sum + (a.distanceMi ?? 0), 0);
    const totalSec = userActs.reduce((sum, a) => sum + a.durationSec, 0);
    const runs = userActs.filter((a) => a.type === "run" && a.paceSecPerMi);
    const avgPace = runs.length
      ? Math.round(runs.reduce((s, a) => s + a.paceSecPerMi!, 0) / runs.length)
      : null;

    return {
      name: user.name as UserName,
      streak: 0,
      goals: [] as { goal: { activityType: string; targetDistanceMi: number | null; timesPerWeek: number }; completed: number; target: number; met: boolean }[],
      weekStats: { totalMi, totalSec, avgPace },
    };
  });

  // Fetch goal progress for each user individually
  return (
    <Shell>
      <CountdownStrip />

      <div className="mx-5 border-b-2 border-ink px-0 pb-1.5 pt-4 font-display text-sm uppercase tracking-[0.15em] text-ink-light">
        This Week
      </div>

      <div className="px-5 pt-3">
        {users.data?.map((user) => (
          <UserCard key={user.id} userId={user.id} name={user.name as UserName} weekStart={ws} weekEnd={we} weekActivities={weekActivities.data ?? []} />
        ))}
      </div>

      <div className="mx-5 border-b-2 border-ink px-0 pb-1.5 pt-4 font-display text-sm uppercase tracking-[0.15em] text-ink-light">
        Recent
      </div>

      <Feed activities={feed.data ?? []} />
    </Shell>
  );
}

function CountdownStrip() {
  // Hardcoded marathon date since AppConfig isn't exposed via tRPC yet
  const marathonDate = new Date("2027-03-14");
  const weeks = weeksBetween(new Date(), marathonDate);

  return (
    <div className="relative overflow-hidden bg-red px-4 py-3 text-center text-cream">
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

function UserCard({ userId, name, weekStart, weekEnd, weekActivities }: {
  userId: string;
  name: UserName;
  weekStart: string;
  weekEnd: string;
  weekActivities: { userId: string; distanceMi: number | null; durationSec: number; paceSecPerMi: number | null; type: string }[];
}) {
  const goals = api.goal.weekProgress.useQuery({ userId, weekStart, weekEnd });

  const userActs = weekActivities.filter((a) => a.userId === userId);
  const totalMi = userActs.reduce((sum, a) => sum + (a.distanceMi ?? 0), 0);
  const totalSec = userActs.reduce((sum, a) => sum + a.durationSec, 0);
  const runs = userActs.filter((a) => a.type === "run" && a.paceSecPerMi);
  const avgPace = runs.length
    ? Math.round(runs.reduce((s, a) => s + a.paceSecPerMi!, 0) / runs.length)
    : null;

  return (
    <FighterCard
      name={name}
      streak={0}
      goals={goals.data ?? []}
      weekStats={{ totalMi, totalSec, avgPace }}
    />
  );
}
