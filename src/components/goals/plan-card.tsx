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
