"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function DeleteButton({ activityId }: { activityId: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const deleteMutation = api.activity.delete.useMutation({
    onSuccess: () => {
      router.push("/activities");
      router.refresh();
    },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            deleteMutation.mutate({ id: activityId });
          }}
          disabled={deleteMutation.isPending}
          className="rounded-sm border-2 border-red bg-red px-3 py-1.5 font-display text-sm uppercase tracking-wider text-cream shadow-card-sm active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50"
        >
          {deleteMutation.isPending ? "..." : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-sm border-2 border-ink bg-cream-dark px-3 py-1.5 font-display text-sm uppercase tracking-wider shadow-card-sm active:translate-x-px active:translate-y-px active:shadow-none"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-sm border-2 border-ink bg-cream-dark px-3 py-1.5 font-display text-sm uppercase tracking-wider shadow-card-sm active:translate-x-px active:translate-y-px active:shadow-none"
      aria-label="Delete activity"
    >
      <Trash2 size={14} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
    </button>
  );
}
