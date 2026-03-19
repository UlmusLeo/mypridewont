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
                shameCount={0}
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
