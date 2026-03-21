"use client";

import { useState, useEffect } from "react";
import { Pause, Play, Square, Lock } from "lucide-react";
import { api } from "~/trpc/react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";

type Timer = {
  id: string;
  userId: string;
  activityType: string;
  startedAt: Date;
  segments: unknown;
  status: string;
  trackGps: boolean;
};

export function TimerPanel({
  timer,
  userId,
  onEnd,
  onLock,
}: {
  timer: Timer;
  userId: string;
  onEnd: () => void;
  onLock?: () => void;
}) {
  const segments = segmentsSchema.parse(timer.segments);
  const isRunning = timer.status === "running";
  const isPaused = timer.status === "paused";

  // Stable reference for segments — only changes when JSON content changes
  const segmentsKey = JSON.stringify(timer.segments);

  // Live elapsed time — ticks every second when running
  const [elapsed, setElapsed] = useState(() =>
    Math.floor(computeTotalSeconds(segments)),
  );

  useEffect(() => {
    const parsed = segmentsSchema.parse(JSON.parse(segmentsKey));
    if (!isRunning) {
      setElapsed(Math.floor(computeTotalSeconds(parsed)));
      return;
    }

    const tick = () => setElapsed(Math.floor(computeTotalSeconds(parsed)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [segmentsKey, isRunning]);

  // Format MM:SS or H:MM:SS
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Segment count
  const segmentNum = segments.length;

  // Stale timer warning (>24h)
  const totalHours = elapsed / 3600;
  const isStale = totalHours > 24;

  const utils = api.useUtils();

  const pauseMutation = api.timer.pause.useMutation({
    onSuccess: () => void utils.timer.active.invalidate(),
  });
  const resumeMutation = api.timer.resume.useMutation({
    onSuccess: () => void utils.timer.active.invalidate(),
  });

  const isMutating = pauseMutation.isPending || resumeMutation.isPending;

  const activityLabel =
    ACTIVITY_LABELS[timer.activityType as ActivityType] ?? timer.activityType;

  return (
    <div
      className={`fixed bottom-[3.5rem] left-0 right-0 z-[51] border-t-2 bg-ink sm:bottom-0 ${
        isPaused ? "border-[#eab308]" : "border-cream/20"
      }`}
    >
      {/* Stale warning */}
      {isStale && (
        <div className="bg-[#eab308]/20 px-4 py-1.5 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-[#eab308]">
          Timer running for {Math.floor(totalHours)}h — adjust duration when
          you save
        </div>
      )}

      <div className="px-4 py-3">
        {/* Activity + Status */}
        <div className="mb-1 flex items-center justify-between">
          <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
            {activityLabel}
          </span>
          {isPaused && (
            <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-[#eab308]">
              Paused
            </span>
          )}
        </div>

        {/* Timer display */}
        <div
          className={`font-display text-[72px] leading-none tracking-wider ${
            isPaused ? "text-[#eab308]/70" : "text-[#22c55e]"
          }`}
        >
          {display}
        </div>

        {/* Segment info */}
        <div className="mt-1 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Segment {segmentNum}
        </div>

        {/* Lock button — GPS only */}
        {timer.trackGps && onLock && (
          <div className="mt-2">
            <button
              onClick={onLock}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm border-[1.5px] border-cream/15 bg-cream/5 px-3 py-1.5"
              aria-label="Enter GPS lock screen"
            >
              <Lock size={12} strokeWidth={2.5} className="text-ink-faint" strokeLinecap="square" strokeLinejoin="miter" />
              <span className="font-condensed text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">
                Lock Screen
              </span>
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-3 flex gap-2">
          {isRunning ? (
            <button
              onClick={() => pauseMutation.mutate({ userId })}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#eab308] bg-[#eab308] px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
              aria-label="Pause timer"
            >
              <Pause size={32} strokeWidth={2.5} className="text-ink" fill="#1a1714" strokeLinecap="square" strokeLinejoin="miter" />
            </button>
          ) : (
            <button
              onClick={() => resumeMutation.mutate({ userId })}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#22c55e] bg-[#22c55e] px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
              aria-label="Resume timer"
            >
              <Play size={32} strokeWidth={2.5} className="text-ink" fill="#1a1714" strokeLinecap="square" strokeLinejoin="miter" />
            </button>
          )}
          <button
            onClick={onEnd}
            disabled={isMutating}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-red bg-red px-4 py-2.5 shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm disabled:opacity-50"
            aria-label="End timer"
          >
            <Square size={32} strokeWidth={2.5} className="text-cream" fill="#f5f0e8" strokeLinecap="square" strokeLinejoin="miter" />
          </button>
        </div>
      </div>
    </div>
  );
}
