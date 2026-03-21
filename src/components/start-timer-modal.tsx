"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Satellite } from "lucide-react";
import { api } from "~/trpc/react";
import type { ActivityType } from "~/lib/constants";
import { ActivityTypeGrid } from "~/components/activity-type-grid";
import { isGpsActivityType } from "~/lib/geo";

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
  const [trackGps, setTrackGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "ready" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const showGpsToggle = isGpsActivityType(activityType);

  const handleGpsToggle = useCallback((on: boolean) => {
    if (on) {
      setTrackGps(true);
      setGpsStatus("locating");
      setGpsError(null);
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsStatus("ready");
        },
        (err) => {
          setTrackGps(false);
          setGpsStatus("error");
          setGpsError(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied"
              : "Could not get location",
          );
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setTrackGps(false);
      setGpsStatus("idle");
      setGpsError(null);
    }
  }, []);

  const handleTypeSelect = (type: ActivityType) => {
    setActivityType(type);
    if (!isGpsActivityType(type)) {
      setTrackGps(false);
      setGpsError(null);
    }
  };

  const startTimer = api.timer.start.useMutation({
    onSuccess: () => onStarted(),
  });

  const handleStart = () => {
    startTimer.mutate({ userId, activityType, trackGps });
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
          <ActivityTypeGrid selected={activityType} onSelect={handleTypeSelect} />
        </div>

        {/* GPS toggle */}
        {showGpsToggle && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => handleGpsToggle(!trackGps)}
              className={`flex w-full items-center justify-between rounded-sm border-2 px-3 py-2.5 ${
                trackGps
                  ? "border-[#22c55e] bg-[#22c55e]/10"
                  : "border-cream/10 bg-cream/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Satellite size={14} strokeWidth={2.5} className={trackGps ? "text-[#22c55e]" : "text-ink-faint"} strokeLinecap="square" strokeLinejoin="miter" />
                <span className={`font-condensed text-sm font-bold uppercase tracking-[0.12em] ${trackGps ? "text-[#22c55e]" : "text-cream/80"}`}>
                  Track GPS
                </span>
              </div>
              <div
                className={`h-5 w-9 rounded-full border transition-colors ${
                  trackGps
                    ? "border-[#22c55e] bg-[#22c55e]"
                    : "border-cream/20 bg-cream/10"
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full bg-cream transition-transform ${
                    trackGps ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
            {gpsStatus === "locating" && (
              <div className="mt-1.5 font-condensed text-xs font-semibold uppercase tracking-[0.1em] text-[#22c55e]/70">
                Fetching location...
              </div>
            )}
            {gpsError && (
              <div className="mt-1.5 font-condensed text-xs font-semibold uppercase tracking-[0.1em] text-red">{gpsError}</div>
            )}
          </div>
        )}

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
