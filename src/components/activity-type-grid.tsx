import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";
import { ACTIVITY_ICON_COMPONENTS, ICON_STYLE } from "~/components/activity-icons";

export function ActivityTypeGrid({
  selected,
  onSelect,
}: {
  selected: ActivityType;
  onSelect: (t: ActivityType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {ACTIVITY_TYPES.map((t) => {
        const Icon = ACTIVITY_ICON_COMPONENTS[t];
        return (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`flex flex-col items-center gap-1 rounded-sm border-[1.5px] px-1 py-2.5 transition-all ${
              selected === t
                ? "border-red bg-red text-cream shadow-[2px_2px_0_rgba(245,240,232,0.1)]"
                : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
            }`}
          >
            <Icon size={20} strokeWidth={2} {...ICON_STYLE} />
            <span className="font-condensed text-[0.65rem] font-bold uppercase tracking-wider">
              {ACTIVITY_LABELS[t]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
