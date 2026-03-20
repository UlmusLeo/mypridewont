"use client";

import { Shell } from "~/components/shell";
import { WeekPast } from "~/components/calendar/week-past";
import { WeekCurrent } from "~/components/calendar/week-current";
import { WeekFuture } from "~/components/calendar/week-future";
import { api } from "~/trpc/react";
import { getWeekStart, getWeekEnd, toUTCDateKey } from "~/lib/utils";
import type { UserName } from "~/lib/constants";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

function weekLabel(start: Date, end: Date): string {
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  return `${s} \u2013 ${e}`;
}

export default function CalendarPage() {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const users = api.user.getAll.useQuery();

  // Generate 2 past + current + 3 future weeks
  const weeks: { start: Date; end: Date; type: "past" | "current" | "future" }[] = [];
  for (let i = -2; i <= 3; i++) {
    const start = new Date(currentWeekStart);
    start.setUTCDate(start.getUTCDate() + i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    weeks.push({ start, end, type: i < 0 ? "past" : i === 0 ? "current" : "future" });
  }

  const allStart = weeks[0]!.start.toISOString().split("T")[0]!;
  const allEnd = weeks[weeks.length - 1]!.end.toISOString().split("T")[0]!;
  const activities = api.activity.weekSummary.useQuery({ weekStart: allStart, weekEnd: allEnd });
  const allGoals = api.goal.list.useQuery({});

  // Build goal progress for current week
  const cwStart = currentWeekStart.toISOString().split("T")[0]!;
  const cwEnd = getWeekEnd(now).toISOString().split("T")[0]!;

  const tallyData = (users.data ?? []).map((u) => ({
    name: u.name as UserName,
    initial: u.name[0]!,
    goals: [] as { label: string; completed: number; target: number }[],
  }));

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
        <div className="pointer-events-none sticky top-0 z-10 h-10 bg-gradient-to-b from-cream to-transparent" />

        {weeks.map((week, wi) => {
          const days = getWeekDays(week.start);
          const label = weekLabel(week.start, week.end);
          const weekActs = (activities.data ?? []).filter((a) => {
            const d = new Date(a.date);
            return d >= week.start && d <= week.end;
          });

          if (week.type === "past") {
            const dayData = days.map((d, di) => ({
              date: d,
              dayOfWeek: DAY_NAMES[di]!,
              dayNum: d.getUTCDate(),
              activities: weekActs
                .filter((a) => toUTCDateKey(new Date(a.date)) === toUTCDateKey(d))
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
                stamps={(users.data ?? []).map((u) => ({
                  name: u.name as UserName,
                  initial: u.name[0]!,
                  status: "earned" as const,
                }))}
              />
            );
          }

          if (week.type === "current") {
            const dayData = days.map((d, di) => ({
              date: d,
              dayOfWeek: DAY_NAMES[di]!,
              dayNum: d.getUTCDate(),
              isToday: toUTCDateKey(d) === toUTCDateKey(now),
              activities: weekActs
                .filter((a) => toUTCDateKey(new Date(a.date)) === toUTCDateKey(d))
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
          const futureGoals = (allGoals.data ?? [])
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

        <div className="pointer-events-none sticky bottom-0 z-10 h-10 bg-gradient-to-t from-cream to-transparent" />
      </div>
    </Shell>
  );
}
