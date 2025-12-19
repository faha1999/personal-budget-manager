// TODO: Helpers for week/month boundaries and formatting.
export type DateRange = { start: Date; end: Date };

/**
 * Treat “week” as Monday → Sunday (Bangladesh-friendly, common business convention).
 */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function toISO(d: Date): string {
  return d.toISOString();
}

export function toISODate(d: Date): string {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Monday = 1, Sunday = 7
 */
function isoDayOfWeek(d: Date): number {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  return day === 0 ? 7 : day;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const iso = isoDayOfWeek(x); // 1..7
  x.setDate(x.getDate() - (iso - 1)); // back to Monday
  return startOfDay(x);
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

export function startOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfDay(x);
}

export function endOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return endOfDay(x);
}

export function getRangeForPreset(preset: "day" | "week" | "month", base: Date = new Date()): DateRange {
  if (preset === "day") return { start: startOfDay(base), end: endOfDay(base) };
  if (preset === "week") return { start: startOfWeek(base), end: endOfWeek(base) };
  return { start: startOfMonth(base), end: endOfMonth(base) };
}

/**
 * Buckets for analytics: returns a label + bucket start.
 * - day: YYYY-MM-DD
 * - week: YYYY-Www (ISO-like week index, Monday start)
 * - month: YYYY-MM
 */
export function formatBucket(granularity: "day" | "week" | "month", d: Date): string {
  if (granularity === "day") return toISODate(d);
  if (granularity === "month") {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }
  // week
  const s = startOfWeek(d);
  const year = s.getFullYear();
  const weekNo = getWeekNumber(s);
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export function getWeekNumber(d: Date): number {
  // Compute week number with Monday start.
  const target = startOfDay(d);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const yearStartISO = startOfWeek(yearStart); // first Monday of year (may be in prev year)
  const diff = target.getTime() - yearStartISO.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return Math.floor(days / 7) + 1;
}

export function clampRange(range: DateRange): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  if (start > end) return { start: end, end: start };
  return { start, end };
}

