"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "~/lib/constants";

export function AddGoalForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [type, setType] = useState("run");
  const [distance, setDistance] = useState("");
  const [frequency, setFrequency] = useState("3");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = api.useUtils();
  const create = api.goal.create.useMutation({
    onSuccess: () => {
      void utils.goal.invalidate();
      onClose();
    },
  });

  const handleSave = () => {
    if (!startDate || !frequency) return;
    create.mutate({
      userId,
      activityType: type,
      timesPerWeek: parseInt(frequency, 10),
      targetDistanceMi: distance ? parseFloat(distance) : undefined,
      startDate,
      endDate: endDate || undefined,
    });
  };

  const miniInput =
    "rounded-sm border-[1.5px] border-divider bg-white px-1.5 py-1 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-ink focus:border-red focus:outline-none";

  return (
    <div className="border-t-[1.5px] border-divider bg-cream px-3 py-2.5">
      <div className="mb-2 font-condensed text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
        Add Goal
      </div>

      <div className="mb-1.5 flex items-center gap-1.5">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={miniInput}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="decimal"
          placeholder="mi"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className={`${miniInput} w-12`}
        />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">mi</span>
        <span className="ml-1 font-condensed text-[0.65rem] font-semibold text-ink-faint">x</span>
        <input
          type="text"
          inputMode="numeric"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className={`${miniInput} w-9`}
        />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">/wk</span>
      </div>

      <div className="mb-2 flex items-center gap-1.5">
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">From</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${miniInput} w-[110px]`} />
        <span className="font-condensed text-[0.65rem] font-semibold text-ink-faint">To</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Ongoing" className={`${miniInput} w-[110px]`} />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onClose}
          className="flex-1 rounded-sm border-[1.5px] border-divider py-1.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-ink-faint"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={create.isPending}
          className="flex-1 rounded-sm border-[1.5px] border-red bg-red py-1.5 font-condensed text-[0.7rem] font-bold uppercase tracking-wider text-cream shadow-card-sm"
        >
          Add Goal
        </button>
      </div>
    </div>
  );
}
