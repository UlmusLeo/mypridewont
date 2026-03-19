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
