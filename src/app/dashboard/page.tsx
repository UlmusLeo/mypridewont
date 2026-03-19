import { Shell } from "~/components/shell";
import { Countdown } from "~/components/dashboard/countdown";
import { FighterCard } from "~/components/dashboard/fighter-card";
import { Feed } from "~/components/dashboard/feed";
import { api } from "~/trpc/server";
import { getWeekStart, getWeekEnd } from "~/lib/utils";
import type { UserName } from "~/lib/constants";

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
