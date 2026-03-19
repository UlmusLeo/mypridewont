"use client";

import { useState } from "react";
import { LogModal } from "~/components/log-modal";

export function Fab() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-[4.5rem] right-5 z-[51] flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-red pb-0.5 font-display text-3xl text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm sm:bottom-6"
      >
        +
      </button>
      {showModal && <LogModal onClose={() => setShowModal(false)} />}
    </>
  );
}
