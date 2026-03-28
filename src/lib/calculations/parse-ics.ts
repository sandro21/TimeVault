import { CalendarEvent, createCalendarEvent } from "./stats";
import { parseICS } from "node-ical";

export function parseIcsToEvents(icsText: string, calendarId: string): CalendarEvent[] {
  const parsed = parseICS(icsText);
  const events: CalendarEvent[] = [];

  for (const key in parsed) {
    const item = parsed[key];

    if (item.type !== "VEVENT") continue;

    const title = item.summary || "Untitled";
    const start = item.start as Date;
    const end = item.end as Date;
    const isAllDay = (item as any).datetype === "date" || (item as any).allDay === true;

    const event = createCalendarEvent({
      id: item.uid || key,
      calendarId,
      title,
      start,
      end,
      isAllDay,
    });

    events.push(event);
  }

  return events;
}