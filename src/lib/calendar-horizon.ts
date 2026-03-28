/**
 * Past / future / ongoing for calendar blocks (timed + all-day).
 * All-day: ICS DTEND is typically exclusive (first day after the event).
 */

export type EventHorizon = "past" | "future" | "ongoing";

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function computeEventHorizon(
  start: Date,
  end: Date,
  nowMs: number,
  isAllDay: boolean
): EventHorizon {
  if (isAllDay) {
    const startDay = startOfLocalDay(start);
    const endDay = startOfLocalDay(end);
    const nowDay = startOfLocalDay(new Date(nowMs));
    if (nowDay.getTime() < startDay.getTime()) return "future";
    if (nowDay.getTime() >= endDay.getTime()) return "past";
    return "ongoing";
  }

  const s = start.getTime();
  const e = end.getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "ongoing";
  if (e < s) return "ongoing";
  if (e < nowMs) return "past";
  if (s > nowMs) return "future";
  return "ongoing";
}
