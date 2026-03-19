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
