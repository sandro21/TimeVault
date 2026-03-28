import fs from "fs";
import path from "path";
import { CalendarEvent } from "./stats";
import { parseIcsToEvents } from "./parse-ics";


//Interface for the local calendar source

export interface LocalCalendarSource {
  id: string;       // e.g. "fitness", "career"
  fileName: string; // e.g. "fitness.ics", "career.ics"
}

export function loadLocalCalendars(sources: LocalCalendarSource[]): CalendarEvent[] {
  const allEvents: CalendarEvent[] = [];

  for (const source of sources) {
    const icsPath = path.join(process.cwd(), "public", source.fileName);
    const icsText = fs.readFileSync(icsPath, "utf-8");

    const events = parseIcsToEvents(icsText, source.id);
    allEvents.push(...events);
  }

  return allEvents;
}