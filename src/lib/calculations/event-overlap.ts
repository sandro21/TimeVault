import type { CalendarEvent } from "./stats";

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function findOverlappingEvents(
  candidate: Pick<CalendarEvent, "start" | "end">,
  events: CalendarEvent[]
): CalendarEvent[] {
  return events.filter((e) =>
    intervalsOverlap(candidate.start, candidate.end, e.start, e.end)
  );
}
