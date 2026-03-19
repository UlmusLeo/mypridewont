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
