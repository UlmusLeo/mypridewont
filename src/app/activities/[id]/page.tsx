import { Shell } from "~/components/shell";
import { api } from "~/trpc/server";
import { formatDuration, formatPace, formatDurationFriendly, formatDateLong } from "~/lib/utils";
import { USER_TEXT_CLASS } from "~/lib/constants";
import type { UserName } from "~/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditButton } from "~/components/edit-activity-modal-trigger";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await api.activity.getById({ id });

  if (!activity) notFound();

  const name = activity.user.name as UserName;

  return (
    <Shell>
      {/* Back link + header */}
      <div className="border-b-2 border-ink px-5 py-3">
        <Link href="/activities" className="mb-1 block font-condensed text-xs font-bold uppercase tracking-wider text-ink-faint">
          <ArrowLeft size={12} strokeWidth={2.5} className="inline" strokeLinecap="square" strokeLinejoin="miter" /> Back to log
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className={`font-display text-2xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
              {name.toUpperCase()}
            </div>
            <div className="font-condensed text-sm uppercase tracking-wider text-ink-light capitalize">
              {activity.type} &middot;{" "}
              {formatDateLong(new Date(activity.date))}
            </div>
          </div>
          <EditButton activity={{
            id: activity.id,
            type: activity.type,
            date: activity.date,
            durationSec: activity.durationSec,
            distanceMi: activity.distanceMi,
            notes: activity.notes,
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px border-b-2 border-ink bg-divider">
        {activity.distanceMi && (
          <Stat label="Distance" value={`${activity.distanceMi.toFixed(1)} mi`} />
        )}
        <Stat label="Duration" value={formatDurationFriendly(activity.durationSec)} />
        {activity.paceSecPerMi && (
          <Stat label="Pace" value={formatPace(activity.paceSecPerMi)} />
        )}
        {activity.elevGainFt && (
          <Stat label="Elevation" value={`${Math.round(activity.elevGainFt)} ft`} />
        )}
        {activity.avgHeartRate && (
          <Stat label="Avg HR" value={`${activity.avgHeartRate} bpm`} />
        )}
        {activity.maxHeartRate && (
          <Stat label="Max HR" value={`${activity.maxHeartRate} bpm`} />
        )}
        {activity.calories && (
          <Stat label="Calories" value={`${activity.calories} cal`} />
        )}
      </div>

      {/* Splits table */}
      {activity.splits.length > 0 && (
        <div className="px-5 py-4">
          <div className="mb-2 font-display text-sm uppercase tracking-[0.15em] text-ink-light">Mile Splits</div>
          <div className="overflow-hidden rounded-sm border-2 border-ink">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink bg-cream-dark">
                  <th className="px-3 py-1.5 text-left font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Mile</th>
                  <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Time</th>
                  <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Pace</th>
                  {activity.splits.some((s) => s.elevGainFt) && (
                    <th className="px-3 py-1.5 text-right font-condensed text-xs font-bold uppercase tracking-wider text-ink-light">Elev</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activity.splits.map((s) => (
                  <tr key={s.id} className="border-b border-divider last:border-b-0">
                    <td className="px-3 py-1.5 font-display text-base">{s.mileNumber}</td>
                    <td className="px-3 py-1.5 text-right font-condensed text-sm">{formatDuration(s.durationSec)}</td>
                    <td className="px-3 py-1.5 text-right font-condensed text-sm">{formatPace(s.paceSecPerMi)}</td>
                    {s.elevGainFt !== null && (
                      <td className="px-3 py-1.5 text-right font-condensed text-sm">{Math.round(s.elevGainFt)} ft</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {activity.notes && (
        <div className="px-5 py-4">
          <div className="mb-1 font-display text-sm uppercase tracking-[0.15em] text-ink-light">Notes</div>
          <p className="text-sm text-ink-light">{activity.notes}</p>
        </div>
      )}

      {/* Route map placeholder */}
      {activity.routePolyline && (
        <div className="mx-5 mb-4 flex h-48 items-center justify-center rounded-sm border-2 border-dashed border-divider bg-cream-dark">
          <span className="font-condensed text-sm text-ink-faint">Route map (requires Leaflet — coming with Strava sync)</span>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3 text-center">
      <div className="font-display text-2xl leading-none">{value}</div>
      <div className="mt-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  );
}
