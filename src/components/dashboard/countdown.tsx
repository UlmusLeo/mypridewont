import { api } from "~/trpc/server";
import { weeksBetween } from "~/lib/utils";

export async function Countdown() {
  const { db } = await import("~/server/db");
  const marathonConfig = await db.appConfig.findUnique({
    where: { key: "marathon_date" },
  });

  if (!marathonConfig) return null;

  const marathonDate = new Date(marathonConfig.value);
  const weeks = weeksBetween(new Date(), marathonDate);

  return (
    <div className="relative overflow-hidden bg-red px-4 py-3 text-center text-cream">
      {/* Diagonal stripes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 20px)",
        }}
      />
      <div className="relative flex items-baseline justify-center gap-2">
        <span className="font-display text-4xl leading-none">{weeks}</span>
        <span className="font-condensed text-sm font-semibold uppercase tracking-[0.12em] opacity-85">
          weeks to race day
        </span>
      </div>
    </div>
  );
}
