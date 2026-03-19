"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import type { UserName } from "~/lib/constants";
import { USER_TEXT_CLASS } from "~/lib/constants";

type Props = {
  userId: string;
  name: UserName;
  hasGoals: boolean;
};

export function ImportCard({ userId, name, hasGoals }: Props) {
  const [planText, setPlanText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const importPlan = api.goal.importPlan.useMutation({
    onSuccess: (data) => {
      void utils.goal.invalidate();
      setPlanText("");
    },
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlanText(reader.result as string);
    reader.readAsText(file);
  };

  return (
    <div className="mb-3 overflow-hidden rounded-sm border-2 border-ink bg-white shadow-card">
      <div className="flex items-center justify-between border-b-[1.5px] border-ink px-3 py-2">
        <div className={`font-display text-xl tracking-wider ${USER_TEXT_CLASS[name]}`}>
          {name.toUpperCase()}
        </div>
        <div
          className={`rounded-sm px-2 py-0.5 font-condensed text-[0.65rem] font-bold uppercase tracking-wider ${
            planText || hasGoals
              ? "bg-green-light text-green"
              : "bg-cream-dark text-ink-faint"
          }`}
        >
          {planText || hasGoals ? "Plan loaded" : "No plan"}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={planText}
          onChange={(e) => setPlanText(e.target.value)}
          placeholder={`run 3mi x3, mar 23 - may 31\nswim x1, mar 23\n...`}
          rows={5}
          className="w-full rounded-sm border-[1.5px] border-ink bg-ink p-3 font-mono text-[0.7rem] leading-relaxed text-cream placeholder:text-ink-faint focus:border-red focus:outline-none"
          style={{ resize: "vertical" }}
        />
        <div className="mt-2 flex gap-2">
          <input ref={fileRef} type="file" accept=".txt" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-sm border-[1.5px] border-ink py-2 text-center font-condensed text-xs font-bold uppercase tracking-wider text-ink shadow-[2px_2px_0_#c9bfad] active:translate-x-px active:translate-y-px"
          >
            Upload File
          </button>
          <button
            onClick={() => importPlan.mutate({ userId, planText, replaceExisting: true })}
            disabled={!planText.trim() || importPlan.isPending}
            className="flex-1 rounded-sm border-[1.5px] border-red bg-red py-2 text-center font-condensed text-xs font-bold uppercase tracking-wider text-cream shadow-card-sm active:translate-x-px active:translate-y-px disabled:opacity-50"
          >
            Apply Plan
          </button>
        </div>
      </div>
    </div>
  );
}
