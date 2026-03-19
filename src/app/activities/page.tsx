"use client";

import { useState } from "react";
import { Shell } from "~/components/shell";
import { api } from "~/trpc/react";
import { formatDuration, formatPace, formatDateShort } from "~/lib/utils";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";
import Link from "next/link";

export default function ActivitiesPage() {
  const [filterUser, setFilterUser] = useState("");
  const [filterType, setFilterType] = useState("");

  const users = api.user.getAll.useQuery();
  const activities = api.activity.list.useQuery({
    userId: filterUser || undefined,
    type: filterType || undefined,
    limit: 50,
  });

  const selectClass =
    "rounded-sm border-[1.5px] border-divider bg-white px-2 py-1.5 font-condensed text-xs font-semibold uppercase tracking-wider text-ink focus:border-red focus:outline-none";

  return (
    <Shell>
      {/* Header + filters */}
      <div className="border-b-2 border-ink px-5 py-3">
        <div className="mb-2 font-display text-xl tracking-wider">ACTIVITY LOG</div>
        <div className="flex gap-2">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={selectClass}
          >
            <option value="">All</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={selectClass}
          >
            <option value="">All types</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity list */}
      <div className="px-5">
        {activities.data?.items.map((a) => {
          const dotColors: Record<string, string> = {
            Jake: "bg-blue-steel", Calder: "bg-amber", Son: "bg-purple-muted",
          };
          return (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="flex items-center border-b border-divider py-3"
            >
              <div className={`mr-3 h-2 w-2 shrink-0 rounded-full ${dotColors[a.user.name] ?? "bg-ink-faint"}`} />
              <div className="min-w-0 flex-1">
                <div className="font-condensed text-sm font-bold uppercase tracking-wider">{a.user.name}</div>
                <div className="text-xs capitalize text-ink-light">
                  {a.type}{a.notes ? ` \u2014 ${a.notes}` : ""}
                </div>
              </div>
              <div className="ml-3 shrink-0 text-right">
                <div className="font-display text-lg leading-none">
                  {a.distanceMi ? `${a.distanceMi.toFixed(1)} mi` : formatDuration(a.durationSec)}
                </div>
                <div className="font-condensed text-[0.65rem] text-ink-light">
                  {formatDuration(a.durationSec)}
                  {a.paceSecPerMi ? ` \u00B7 ${formatPace(a.paceSecPerMi)}` : ""}
                  {" \u00B7 "}{formatDateShort(new Date(a.date))}
                </div>
              </div>
            </Link>
          );
        })}

        {activities.data?.items.length === 0 && (
          <div className="py-8 text-center font-condensed text-sm text-ink-faint">
            No activities yet. Hit the + to log one!
          </div>
        )}
      </div>
    </Shell>
  );
}
