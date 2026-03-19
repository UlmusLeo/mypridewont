/**
 * Format seconds into "M:SS" or "H:MM:SS" duration string
 */
export function formatDuration(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format seconds into friendly duration like "45 min" or "1h 23m"
 */
export function formatDurationFriendly(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

/**
 * Format pace (sec/mi) into "M:SS/mi" string
 */
export function formatPace(paceSecPerMi: number): string {
  const mins = Math.floor(paceSecPerMi / 60);
  const secs = paceSecPerMi % 60;
  return `${mins}:${String(secs).padStart(2, "0")}/mi`;
}

/**
 * Compute pace in sec/mi from distance (mi) and duration (sec)
 */
export function computePace(distanceMi: number, durationSec: number): number {
  if (distanceMi <= 0) return 0;
  return Math.round(durationSec / distanceMi);
}

/**
 * Get the Monday of the week containing the given date (ISO weeks start Monday)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Sunday ending the week containing the given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Format a date as "Mar 19" style
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Compute weeks between two dates
 */
export function weeksBetween(a: Date, b: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / msPerWeek);
}
