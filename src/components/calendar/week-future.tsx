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
