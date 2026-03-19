"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { ACTIVITY_TYPES, ACTIVITY_LABELS, ACTIVITY_ICONS, DISTANCE_TYPES } from "~/lib/constants";
import type { ActivityType, UserName } from "~/lib/constants";
import { USERS } from "~/lib/constants";
import { formatPace, computePace } from "~/lib/utils";

export function LogModal({ onClose }: { onClose: () => void }) {
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [distance, setDistance] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [notes, setNotes] = useState("");
  const [dateOption, setDateOption] = useState<"today" | "yesterday" | "pick">("today");
  const [customDate, setCustomDate] = useState("");

  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const users = api.user.getAll.useQuery();
  const utils = api.useUtils();

  const createActivity = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.invalidate();
      void utils.goal.invalidate();
      onClose();
    },
  });

  const dateValue = useMemo(() => {
    const now = new Date();
    if (dateOption === "yesterday") {
      now.setDate(now.getDate() - 1);
    } else if (dateOption === "pick" && customDate) {
      return customDate;
    }
    return now.toISOString().split("T")[0]!;
  }, [dateOption, customDate]);

  const totalSec = (parseInt(durationMin || "0", 10) * 60) + parseInt(durationSec || "0", 10);
  const distNum = parseFloat(distance || "0");
  const pace = activityType === "run" && distNum > 0 && totalSec > 0
    ? computePace(distNum, totalSec)
    : null;

  const handleSubmit = () => {
    const userId = users.data?.find((u) => u.name === currentUser)?.id;
    if (!userId || totalSec <= 0) return;

    createActivity.mutate({
      userId,
      date: dateValue,
      type: activityType,
      durationSec: totalSec,
      distanceMi: distNum > 0 ? distNum : undefined,
      notes: notes || undefined,
    });
  };

  const showDistance = DISTANCE_TYPES.includes(activityType);

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
        <button onClick={onClose} className="font-condensed text-sm font-bold uppercase tracking-wider text-ink-faint">
          &larr; Back
        </button>
        <div className="font-display text-xl tracking-wider">
          LOG <span className="text-red">ACTIVITY</span>
        </div>
        <div className="w-[50px]" />
      </div>

      <div className="mx-auto max-w-[420px] p-5">
        {/* Activity Type Grid */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            What did you do?
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActivityType(t)}
                className={`flex flex-col items-center gap-1 rounded-sm border-[1.5px] px-1 py-2.5 transition-all ${
                  activityType === t
                    ? "border-red bg-red text-cream shadow-[2px_2px_0_rgba(245,240,232,0.1)]"
                    : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
                }`}
              >
                <span className="text-xl leading-none">{ACTIVITY_ICONS[t]}</span>
                <span className="font-condensed text-[0.65rem] font-bold uppercase tracking-wider">
                  {ACTIVITY_LABELS[t]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            When?
          </label>
          <div className="flex gap-1.5">
            {(["today", "yesterday", "pick"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setDateOption(opt)}
                className={`flex-1 rounded-sm border-[1.5px] px-1 py-1.5 text-center font-condensed text-[0.7rem] font-bold uppercase tracking-wider transition-all ${
                  dateOption === opt
                    ? "border-cream bg-cream/10 text-cream"
                    : "border-cream/10 bg-cream/5 text-ink-faint hover:border-cream/25 hover:text-cream"
                }`}
              >
                {opt === "pick" ? "Pick date" : opt}
              </button>
            ))}
          </div>
          {dateOption === "pick" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mt-2 w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2 text-center font-condensed text-sm font-bold uppercase tracking-wider text-cream focus:border-red focus:outline-none"
            />
          )}
        </div>

        {/* Distance + Duration */}
        <div className="mb-5 flex gap-3">
          {showDistance && (
            <div className="flex-1">
              <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Distance
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                Miles
              </div>
            </div>
          )}
          <div className="flex-1">
            <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
              Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                placeholder="00"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
              <span className="font-display text-2xl text-ink-faint">:</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className="flex-1 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-2 py-2 text-center font-display text-2xl tracking-wider text-cream placeholder:text-cream/15 focus:border-red focus:outline-none"
              />
            </div>
            <div className="mt-0.5 text-center font-condensed text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Min : Sec
            </div>
          </div>
        </div>

        {/* Pace preview */}
        {pace && (
          <div className="mb-5 flex items-center justify-center gap-3 rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5">
            <span className="font-condensed text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Pace
            </span>
            <span className="font-display text-3xl leading-none text-cream">{formatPace(pace).replace("/mi", "")}</span>
            <span className="font-condensed text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">/mi</span>
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Easy pace around the park..."
            className="min-h-[60px] w-full resize-y rounded-sm border-[1.5px] border-cream/10 bg-cream/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-red focus:outline-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={createActivity.isPending || totalSec <= 0}
          className="w-full rounded-sm border-2 border-cream bg-red px-4 py-2.5 font-display text-xl tracking-[0.1em] text-cream shadow-[3px_3px_0_rgba(245,240,232,0.15)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_rgba(245,240,232,0.15)] disabled:opacity-50"
        >
          LOG IT
        </button>
      </div>
    </div>
  );
}
