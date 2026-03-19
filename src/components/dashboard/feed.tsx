import type { UserName } from "~/lib/constants";
import { formatDurationFriendly, formatPace, formatDateShort } from "~/lib/utils";

type FeedActivity = {
  id: string;
  date: Date;
  type: string;
  distanceMi: number | null;
  durationSec: number;
  paceSecPerMi: number | null;
  notes: string | null;
  user: { name: string };
};

export function Feed({ activities }: { activities: FeedActivity[] }) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  function relativeDate(date: Date): string {
    const d = new Date(date).toDateString();
    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
    if (diff < 7) return `${diff} days ago`;
    return formatDateShort(new Date(date));
  }

  return (
    <div className="px-5 pb-6">
      {activities.map((a) => {
        const name = a.user.name as UserName;
        const dotColors: Record<string, string> = {
          Jake: "bg-blue-steel",
          Calder: "bg-amber",
          Son: "bg-purple-muted",
        };

        return (
          <div key={a.id} className="flex items-center border-b border-divider py-2.5 last:border-b-0">
            <div className={`mr-2.5 h-2 w-2 shrink-0 rounded-full ${dotColors[name] ?? "bg-ink-faint"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-condensed text-sm font-bold uppercase tracking-wider">{name}</div>
              <div className="text-xs text-ink-light">{a.notes ?? a.type}</div>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <div className="font-display text-lg leading-none">
                {a.distanceMi ? `${a.distanceMi.toFixed(1)} mi` : formatDurationFriendly(a.durationSec)}
              </div>
              <div className="font-condensed text-[0.65rem] text-ink-light tracking-wide">
                {a.distanceMi ? formatDurationFriendly(a.durationSec) : ""}{" "}
                {a.paceSecPerMi ? `· ${formatPace(a.paceSecPerMi)}` : ""}{" "}
                {!a.distanceMi ? a.type : ""} · {relativeDate(a.date)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
