"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS, DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";
import { formatDuration } from "~/lib/utils";

type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
};

export function EndTimerModal({
  timer,
  userId,
  onClose,
  onSaved,
}: {
  timer: Timer;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const segments = segmentsSchema.parse(timer.segments);
  const computedSec = Math.round(computeTotalSeconds(segments));
  const activityType = timer.activityType as ActivityType;
  const activityLabel = ACTIVITY_LABELS[activityType] ?? timer.activityType;
  const showDistance = DISTANCE_TYPES.includes(activityType);

  // Duration override — pre-filled with computed time
  const computedMin = Math.floor(computedSec / 60);
  const computedRemSec = computedSec % 60;
  const [durationMin, setDurationMin] = useState(String(computedMin));
  const [durationSec, setDurationSec] = useState(
    String(computedRemSec).padStart(2, "0"),
  );
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();
  const endTimer = api.timer.end.useMutation({
    onSuccess: () => {
      void utils.activity.invalidate();
      void utils.goal.invalidate();
      void utils.timer.invalidate();
      onSaved();
    },
  });

  const totalSec =
    parseInt(durationMin || "0", 10) * 60 +
    parseInt(durationSec || "0", 10);
  const distNum = parseFloat(distance || "0");

  const handleSave = () => {
    endTimer.mutate({
      userId,
      distanceMi: distNum > 0 ? distNum : undefined,
      durationOverrideSec: totalSec !== computedSec ? totalSec : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink font-body text-cream">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-cream/10 px-5 py-3">
        <button
          onClick={onClose}
          className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint"
        >
          <ArrowLeft size={14} strokeWidth={2.5} className="inline" strokeLinecap="square" strokeLinejoin="miter" /> Back
        </button>
        <div className="font-display text-xl tracking-wider">
          SAVE <span className="text-red">{activityLabel.toUpperCase()}</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Total duration display */}
        <div className="mb-5 text-center">
          <div className="font-display text-5xl tracking-wider text-[#22c55e]">
            {formatDuration(computedSec)}
          </div>
          <div className="mt-1 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Total time ({segments.length} segment{segments.length !== 1 ? "s" : ""})
          </div>
        </div>

        {/* Segment breakdown */}
        {segments.length > 1 && (
          <div className="mb-5">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Segments
            </label>
            <div className="space-y-1">
              {segments.map((seg, i) => {
                const start = new Date(seg.start).getTime();
                const end = seg.end
                  ? new Date(seg.end).getTime()
                  : Date.now();
                const segSec = Math.round((end - start) / 1000);
                return (
                  <div
                    key={i}
                    className="flex justify-between rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-1.5"
                  >
                    <span className="font-condensed text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      Segment {i + 1}
                    </span>
                    <span className="font-display text-sm">
                      {formatDuration(segSec)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Distance input */}
        {showDistance && (
          <div className="mb-5">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Distance
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
            <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Miles
            </div>
          </div>
        )}

        {/* Duration override */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Duration (adjust if needed)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
            <span className="font-display text-2xl text-ink-faint">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              className="min-w-0 flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
            />
          </div>
          <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Min : Sec
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
            className="min-h-[60px] w-full resize-y rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-red focus:outline-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={endTimer.isPending || totalSec <= 0}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          SAVE IT
        </button>
      </div>
    </div>
  );
}
