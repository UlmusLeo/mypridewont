"use client";

import { useState, useEffect } from "react";
import { Plus, Play } from "lucide-react";
import { api } from "~/trpc/react";
import { USERS } from "~/lib/constants";
import type { UserName } from "~/lib/constants";
import { LogModal } from "~/components/log-modal";
import { StartTimerModal } from "~/components/start-timer-modal";
import { TimerPanel } from "~/components/timer-panel";
import { EndTimerModal } from "~/components/end-timer-modal";
import { useGpsTracking } from "~/hooks/use-gps-tracking";
import { GpsLockScreen } from "~/components/gps-lock-screen";

export function Fab() {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showStartTimer, setShowStartTimer] = useState(false);
  const [showEndTimer, setShowEndTimer] = useState(false);
  const [showLockScreen, setShowLockScreen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserName>("Jake");
  useEffect(() => {
    const stored = localStorage.getItem("mpw_user") as UserName | null;
    if (stored && USERS.includes(stored)) setCurrentUser(stored);
  }, []);

  const users = api.user.getAll.useQuery();
  const userId = users.data?.find((u) => u.name === currentUser)?.id;

  const activeTimer = api.timer.active.useQuery(
    { userId: userId! },
    { enabled: !!userId, refetchInterval: false },
  );

  const isGpsActive = !!activeTimer.data?.trackGps;
  useGpsTracking(isGpsActive && !showEndTimer, userId ?? "");

  const timerExists = !!activeTimer.data;

  return (
    <>
      {/* Stacked FABs — hidden when timer is active */}
      {!timerExists && (
        <div className="fixed bottom-[4.5rem] right-5 z-[51] flex flex-col gap-2 sm:bottom-6">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-red pb-0.5 font-display text-3xl text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm"
            aria-label="Log activity"
          >
            <Plus size={28} strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
          </button>
          <button
            onClick={() => setShowStartTimer(true)}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-ink bg-green pb-0.5 text-cream shadow-card active:translate-x-px active:translate-y-px active:shadow-card-sm"
            aria-label="Start timer"
          >
            <Play size={24} strokeWidth={2.5} fill="currentColor" strokeLinecap="square" strokeLinejoin="miter" />
          </button>
        </div>
      )}

      {/* Timer panel — shown when timer is active */}
      {timerExists && activeTimer.data && !showEndTimer && !showLockScreen && (
        <TimerPanel
          timer={activeTimer.data}
          userId={userId!}
          onEnd={() => setShowEndTimer(true)}
          onLock={activeTimer.data.trackGps ? () => setShowLockScreen(true) : undefined}
        />
      )}

      {/* GPS Lock Screen */}
      {showLockScreen && activeTimer.data && (
        <GpsLockScreen
          segments={activeTimer.data.segments}
          activityType={activeTimer.data.activityType}
          isRunning={activeTimer.data.status === "running"}
          onUnlock={() => setShowLockScreen(false)}
        />
      )}

      {/* Modals */}
      {showLogModal && <LogModal onClose={() => setShowLogModal(false)} />}
      {showStartTimer && (
        <StartTimerModal
          userId={userId!}
          onClose={() => setShowStartTimer(false)}
          onStarted={() => {
            setShowStartTimer(false);
            void activeTimer.refetch();
          }}
        />
      )}
      {showEndTimer && activeTimer.data && (
        <EndTimerModal
          timer={activeTimer.data}
          userId={userId!}
          onClose={() => setShowEndTimer(false)}
          onSaved={() => {
            setShowEndTimer(false);
            void activeTimer.refetch();
          }}
        />
      )}
    </>
  );
}
