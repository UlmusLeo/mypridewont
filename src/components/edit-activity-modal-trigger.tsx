"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditActivityModal } from "~/components/edit-activity-modal";
import { useRouter } from "next/navigation";

type ActivityData = {
  id: string;
  type: string;
  date: Date;
  durationSec: number;
  distanceMi: number | null;
  notes: string | null;
};

export function EditButton({ activity }: { activity: ActivityData }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-sm border-2 border-ink bg-cream-dark px-3 py-1.5 font-display text-sm uppercase tracking-wider shadow-card-sm active:translate-x-px active:translate-y-px active:shadow-none"
        aria-label="Edit activity"
      >
        <Pencil size={14} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
        Edit
      </button>
      {showModal && (
        <EditActivityModal
          activity={activity}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
