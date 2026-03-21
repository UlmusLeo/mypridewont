"use client";

import { useState, useEffect, useCallback } from "react";
import { segmentsSchema, computeTotalSeconds } from "~/lib/timer";
import { ACTIVITY_LABELS } from "~/lib/constants";
import type { ActivityType } from "~/lib/constants";

export function GpsLockScreen({
  segments: rawSegments,
  activityType,
  isRunning,
  onUnlock,
}: {
  segments: unknown;
  activityType: string;
  isRunning: boolean;
  onUnlock: () => void;
}) {
  const segments = segmentsSchema.parse(rawSegments);
  const segmentsKey = JSON.stringify(rawSegments);

  // Live elapsed time
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

  // Format timer display
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display =
    hours > 0
      ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const label =
    ACTIVITY_LABELS[activityType as ActivityType] ?? activityType;

  // Fullscreen + Wake Lock
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may not be supported
    }
    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
    } catch {
      // Wake Lock may not be supported
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    if (wakeLock) {
      await wakeLock.release().catch(() => {});
      setWakeLock(null);
    }
  }, [wakeLock]);

  // Enter fullscreen on mount
  useEffect(() => {
    void enterFullscreen();
    return () => {
      void exitFullscreen();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external fullscreen exit (swipe/escape)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        onUnlock();
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [onUnlock]);

  const handleUnlock = async () => {
    await exitFullscreen();
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black">
      <div className="font-condensed text-[13px] font-bold uppercase tracking-[3px] text-[#444]">
        GPS Tracking
      </div>
      <div className="mt-2 font-condensed text-[16px] font-bold uppercase tracking-[2px] text-[#333]">
        {label.toUpperCase()}
      </div>
      <div className="mt-4 font-display text-[64px] leading-none tracking-wider text-[#3a3a3a]">
        {display}
      </div>
      <button
        onClick={() => void handleUnlock()}
        className="mt-8 border border-[#444] bg-transparent px-8 py-2 font-condensed text-[14px] font-bold uppercase tracking-[3px] text-[#444]"
      >
        Unlock
      </button>
    </div>
  );
}
