import { Shell } from "~/components/shell";
import { WeekPast } from "~/components/calendar/week-past";
import { WeekCurrent } from "~/components/calendar/week-current";
import { WeekFuture } from "~/components/calendar/week-future";
import { api } from "~/trpc/server";
import { getWeekStart, getWeekEnd } from "~/lib/utils";
import type { UserName } from "~/lib/constants";

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
  return `${s} \u2013 ${e}`;
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
