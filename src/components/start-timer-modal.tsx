"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import type { ActivityType } from "~/lib/constants";
import { ActivityTypeGrid } from "~/components/activity-type-grid";

export function StartTimerModal({
  userId,
  onClose,
  onStarted,
}: {
  userId: string;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>("run");

  const startTimer = api.timer.start.useMutation({
    onSuccess: () => onStarted(),
  });

  const handleStart = () => {
    startTimer.mutate({ userId, activityType });
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
          START <span className="text-red">TIMER</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Activity Type Grid */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            What are you doing?
          </label>
          <ActivityTypeGrid selected={activityType} onSelect={setActivityType} />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={startTimer.isPending}
          className="w-full rounded-sm border-2 border-cream bg-green px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          START
        </button>
      </div>
    </div>
  );
}
