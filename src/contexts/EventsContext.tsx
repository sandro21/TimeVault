"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import {
  CalendarEvent,
  createCalendarEvent,
  ACTUAL_TIMER_CALENDAR_ID,
} from "@/lib/calculations/stats";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";

const ACTUAL_EVENTS_STORAGE_KEY = "actualCalendarEvents";
/** Per-event title overrides for ICS rows (keyed by stable event UID) */
const EVENT_TITLE_OVERRIDES_KEY = "eventTitleOverridesById";
/** Per-event start/end overrides for ICS rows (ISO strings + allDay) */
const EVENT_TIME_OVERRIDES_KEY = "eventTimeOverridesById";

interface PlannedTimeOverride {
  start: string;
  end: string;
  allDay: boolean;
}

interface SerializedActualEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

function serializeActual(e: CalendarEvent): SerializedActualEvent {
  return {
    id: e.id,
    calendarId: e.calendarId,
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    isAllDay: e.isAllDay,
  };
}

function loadActualEventsFromStorage(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ACTUAL_EVENTS_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((s: SerializedActualEvent) =>
      createCalendarEvent({
        id: s.id,
        calendarId: s.calendarId,
        title: s.title,
        start: new Date(s.start),
        end: new Date(s.end),
        isAllDay: s.isAllDay,
        kind: "actual",
      })
    );
  } catch {
    return [];
  }
}

export type ApplyActualResolution =
  | { type: "append" }
  | { type: "overwrite"; overlapped: CalendarEvent[] };

/** Singular live timer session — truth in progress until stopped and persisted */
export type ActiveRecording = {
  sessionId: string;
  startedAt: Date;
  title: string;
  /** When started from “Start Actual” on a planned block */
  sourcePlannedEventId?: string;
};

export const ACTIVE_SESSION_EVENT_ID = "__active_session__";

interface EventsContextType {
  events: CalendarEvent[];
  refreshEvents: () => void;
  hiddenStateVersion: number;
  refreshHiddenState: () => void;
  activeRecording: ActiveRecording | null;
  beginActiveRecording: (title: string, options?: { sourcePlannedEventId?: string }) => void;
  clearActiveRecording: () => void;
  applyActualRecording: (newEvent: CalendarEvent, resolution: ApplyActualResolution) => void;
  updateCalendarEvent: (
    eventId: string,
    updates: { title: string; start: Date; end: Date; isAllDay: boolean },
    kind: "planned" | "actual"
  ) => void;
  deleteEvent: (event: CalendarEvent) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mergedEvents, setMergedEvents] = useState<CalendarEvent[]>([]);
  const [hiddenStateVersion, setHiddenStateVersion] = useState(0);
  const [activeRecording, setActiveRecording] = useState<ActiveRecording | null>(null);

  const beginActiveRecording = (title: string, options?: { sourcePlannedEventId?: string }) => {
    const trimmed = title.trim() || "Untitled activity";
    setActiveRecording({
      sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      startedAt: new Date(),
      title: trimmed,
      sourcePlannedEventId: options?.sourcePlannedEventId,
    });
  };

  const clearActiveRecording = () => {
    setActiveRecording(null);
  };

  const loadPlannedFromIcs = (): CalendarEvent[] => {
    if (typeof window === "undefined") return [];

    try {
      const storedCalendars = JSON.parse(localStorage.getItem("uploadedCalendars") || "[]");
      const allEvents: CalendarEvent[] = [];

      const titleMappings = JSON.parse(localStorage.getItem("activityTitleMappings") || "{}");
      const titleOverridesById: Record<string, string> = JSON.parse(
        localStorage.getItem(EVENT_TITLE_OVERRIDES_KEY) || "{}"
      );
      const timeOverridesById: Record<string, PlannedTimeOverride> = JSON.parse(
        localStorage.getItem(EVENT_TIME_OVERRIDES_KEY) || "{}"
      );

      const removedEventIds = new Set(JSON.parse(localStorage.getItem("removedEventIds") || "[]"));

      const hiddenCalendarIds = new Set(JSON.parse(localStorage.getItem("hiddenCalendarIds") || "[]"));

      for (const calendar of storedCalendars) {
        if (hiddenCalendarIds.has(calendar.id)) {
          continue;
        }
        let events: CalendarEvent[] = [];

        if (calendar.icsText) {
          events = parseIcsToEventsBrowser(calendar.icsText, calendar.id);
        } else {
          console.warn(`Calendar ${calendar.id} has no icsText`);
          continue;
        }

        const processedEvents = events
          .filter((event) => !removedEventIds.has(event.id))
          .map((event) => {
            const mappedTitle = titleMappings[event.title];
            const base =
              mappedTitle !== undefined ? { ...event, title: mappedTitle } : event;
            const withKind = { ...base, kind: "planned" as const };
            const titleOv = titleOverridesById[event.id];
            const withTitle =
              titleOv !== undefined ? { ...withKind, title: titleOv } : withKind;
            const timeOv = timeOverridesById[event.id];
            if (timeOv) {
              return createCalendarEvent({
                id: withTitle.id,
                calendarId: withTitle.calendarId,
                title: withTitle.title,
                start: new Date(timeOv.start),
                end: new Date(timeOv.end),
                isAllDay: timeOv.allDay,
                kind: "planned",
              });
            }
            return withTitle;
          });

        allEvents.push(...processedEvents);
      }

      return allEvents;
    } catch (error) {
      console.error("Error loading uploaded calendars:", error);
      return [];
    }
  };

  const refreshEvents = () => {
    const planned = loadPlannedFromIcs();
    const actual = loadActualEventsFromStorage();
    setMergedEvents([...planned, ...actual]);
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  const applyActualRecording = (newEvent: CalendarEvent, resolution: ApplyActualResolution) => {
    if (typeof window === "undefined") return;

    let actualStored: SerializedActualEvent[] = JSON.parse(
      localStorage.getItem(ACTUAL_EVENTS_STORAGE_KEY) || "[]"
    );

    if (resolution.type === "overwrite") {
      const removed = new Set<string>(
        JSON.parse(localStorage.getItem("removedEventIds") || "[]")
      );
      for (const e of resolution.overlapped) {
        if (e.kind === "actual" || e.calendarId === ACTUAL_TIMER_CALENDAR_ID) {
          actualStored = actualStored.filter((s) => s.id !== e.id);
        } else {
          removed.add(e.id);
        }
      }
      localStorage.setItem("removedEventIds", JSON.stringify([...removed]));
    }

    actualStored.push(serializeActual(newEvent));
    localStorage.setItem(ACTUAL_EVENTS_STORAGE_KEY, JSON.stringify(actualStored));
    refreshEvents();
  };

  const refreshHiddenState = () => {
    setHiddenStateVersion((prev) => prev + 1);
    refreshEvents();
  };

  const updateCalendarEvent = (
    eventId: string,
    updates: { title: string; start: Date; end: Date; isAllDay: boolean },
    kind: "planned" | "actual"
  ) => {
    if (typeof window === "undefined") return;
    const trimmed = updates.title.trim() || "Untitled";
    let start = updates.start;
    let end = updates.end;
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 1000);
    }

    if (kind === "actual") {
      const actualStored: SerializedActualEvent[] = JSON.parse(
        localStorage.getItem(ACTUAL_EVENTS_STORAGE_KEY) || "[]"
      );
      const idx = actualStored.findIndex((s) => s.id === eventId);
      if (idx < 0) return;
      const prev = actualStored[idx];
      const rebuilt = createCalendarEvent({
        id: prev.id,
        calendarId: prev.calendarId,
        title: trimmed,
        start,
        end,
        isAllDay: updates.isAllDay,
        kind: "actual",
      });
      actualStored[idx] = serializeActual(rebuilt);
      localStorage.setItem(ACTUAL_EVENTS_STORAGE_KEY, JSON.stringify(actualStored));
    } else {
      const titleOverrides: Record<string, string> = JSON.parse(
        localStorage.getItem(EVENT_TITLE_OVERRIDES_KEY) || "{}"
      );
      titleOverrides[eventId] = trimmed;
      localStorage.setItem(EVENT_TITLE_OVERRIDES_KEY, JSON.stringify(titleOverrides));

      const timeOverrides: Record<string, PlannedTimeOverride> = JSON.parse(
        localStorage.getItem(EVENT_TIME_OVERRIDES_KEY) || "{}"
      );
      timeOverrides[eventId] = {
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: updates.isAllDay,
      };
      localStorage.setItem(EVENT_TIME_OVERRIDES_KEY, JSON.stringify(timeOverrides));
    }
    refreshEvents();
  };

  const deleteEvent = (event: CalendarEvent) => {
    if (typeof window === "undefined") return;

    const isActual = event.kind === "actual" || event.calendarId === ACTUAL_TIMER_CALENDAR_ID;

    if (isActual) {
      const actualStored: SerializedActualEvent[] = JSON.parse(
        localStorage.getItem(ACTUAL_EVENTS_STORAGE_KEY) || "[]"
      );
      const next = actualStored.filter((s) => s.id !== event.id);
      localStorage.setItem(ACTUAL_EVENTS_STORAGE_KEY, JSON.stringify(next));
    } else {
      const removed = new Set<string>(
        JSON.parse(localStorage.getItem("removedEventIds") || "[]")
      );
      removed.add(event.id);
      localStorage.setItem("removedEventIds", JSON.stringify([...removed]));

      const titleOverrides: Record<string, string> = JSON.parse(
        localStorage.getItem(EVENT_TITLE_OVERRIDES_KEY) || "{}"
      );
      delete titleOverrides[event.id];
      localStorage.setItem(EVENT_TITLE_OVERRIDES_KEY, JSON.stringify(titleOverrides));

      const timeOverrides: Record<string, PlannedTimeOverride> = JSON.parse(
        localStorage.getItem(EVENT_TIME_OVERRIDES_KEY) || "{}"
      );
      delete timeOverrides[event.id];
      localStorage.setItem(EVENT_TIME_OVERRIDES_KEY, JSON.stringify(timeOverrides));
    }
    refreshEvents();
  };

  return (
    <EventsContext.Provider
      value={{
        events: mergedEvents,
        refreshEvents,
        hiddenStateVersion,
        refreshHiddenState,
        activeRecording,
        beginActiveRecording,
        clearActiveRecording,
        applyActualRecording,
        updateCalendarEvent,
        deleteEvent,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
