"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Calendar, View, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { ActualCalendarEvent } from "@/components/ActualCalendarEvent";
import type { CalendarRbcEvent, EventHorizon } from "@/components/ActualCalendarEvent";
import { EventDetailPopup } from "@/components/EventDetailPopup";
import {
  useEvents,
  ACTIVE_SESSION_EVENT_ID,
} from "@/contexts/EventsContext";
import type { CalendarEvent, EventKind } from "@/lib/calculations/stats";
import { createCalendarEvent, ACTUAL_TIMER_CALENDAR_ID } from "@/lib/calculations/stats";
import { computeEventHorizon } from "@/lib/calendar-horizon";
import { rbcLocalizer } from "@/lib/rbc-localizer";

function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Sidebar play: confirm before removing a block and starting live.
 * - ICS planned (`kind: "planned"`)
 * - “Create event” blocks (`kind: "actual"` + id `manual-*`) — same storage as timer, different id prefix
 * Timer/stop recordings use ids `actual-*` — no replace dialog; start live with that title only.
 */
function needsLiveReplaceConfirm(ev: CalendarEvent): boolean {
  if (ev.kind === "planned") return true;
  if (ev.kind === "actual" && ev.id.startsWith("manual-")) return true;
  return false;
}

function defaultCreateRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

function toRbcEvent(e: CalendarEvent, now: number): CalendarRbcEvent {
  const start = new Date(e.start);
  let end = new Date(e.end);
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 60 * 1000);
  }
  const kind: EventKind = e.kind === "actual" ? "actual" : "planned";
  const horizon = computeEventHorizon(start, end, now, e.isAllDay);
  return {
    title: e.title,
    start,
    end,
    allDay: e.isAllDay,
    resource: {
      id: e.id,
      calendarId: e.calendarId,
      kind,
      horizon,
      isActiveRecording: false,
      /** Stable range from our data (RBC may pass segment-adjusted start/end to the event component) */
      originalStartMs: start.getTime(),
      originalEndMs: end.getTime(),
      originalIsAllDay: e.isAllDay,
    },
  };
}

function toRbcLiveEvent(title: string, startedAt: Date, now: number): CalendarRbcEvent {
  const end = new Date(Math.max(now, startedAt.getTime() + 60 * 1000));
  return {
    title,
    start: startedAt,
    end,
    allDay: false,
    resource: {
      id: ACTIVE_SESSION_EVENT_ID,
      calendarId: ACTUAL_TIMER_CALENDAR_ID,
      kind: "actual",
      horizon: "active",
      isActiveRecording: true,
    },
  };
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RBC_VIEWS: View[] = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

const SIDEBAR_UPCOMING_WINDOW_MS = 30 * 60 * 1000;

export function CalendarViewClient() {
  const {
    events,
    activeRecording,
    beginActiveRecording,
    clearActiveRecording,
    applyActualRecording,
    updateCalendarEvent,
    deleteEvent,
  } = useEvents();

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const selectedEvent = useMemo(
    () => (selectedId ? events.find((e) => e.id === selectedId) ?? null : null),
    [events, selectedId]
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createStartLocal, setCreateStartLocal] = useState(() =>
    toDateTimeLocalValue(defaultCreateRange().start)
  );
  const [createEndLocal, setCreateEndLocal] = useState(() =>
    toDateTimeLocalValue(defaultCreateRange().end)
  );

  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [replaceConfirmEvent, setReplaceConfirmEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (events.length === 0 && !activeRecording) return;
    const ms = activeRecording ? 1000 : events.length > 0 ? 10_000 : 60_000;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [activeRecording, events.length]);

  const elapsedSeconds = activeRecording
    ? Math.max(0, Math.floor((Date.now() - activeRecording.startedAt.getTime()) / 1000))
    : 0;

  const rbcEvents = useMemo(() => {
    const now = Date.now();
    const list: CalendarRbcEvent[] = events.map((e) => toRbcEvent(e, now));
    if (activeRecording) {
      list.push(
        toRbcLiveEvent(activeRecording.title, activeRecording.startedAt, now)
      );
    }
    return list;
  }, [events, activeRecording, tick]);

  /** All calendar blocks that contain “now” (can overlap — show one card each) */
  const scheduledNowList = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => computeEventHorizon(e.start, e.end, now, e.isAllDay) === "ongoing")
      .sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
  }, [events, tick]);

  /** Now + starting within 30 minutes (for sidebar list); “now” rows first */
  const sidebarActivityRows = useMemo(() => {
    const now = Date.now();
    const limit = now + SIDEBAR_UPCOMING_WINDOW_MS;
    const nowIds = new Set(scheduledNowList.map((e) => e.id));
    const nowRows = scheduledNowList.map((e) => ({ event: e, rowKind: "now" as const }));
    const soonRows = events
      .filter((e) => {
        if (nowIds.has(e.id)) return false;
        const s = e.start.getTime();
        return s > now && s <= limit && e.end.getTime() > now;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((e) => ({ event: e, rowKind: "soon" as const }));
    return [...nowRows, ...soonRows];
  }, [events, scheduledNowList, tick]);

  const eventPropGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: "transparent",
        border: "none",
        boxShadow: "none",
        padding: "1px 2px",
        overflow: "visible" as const,
      },
    };
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleSelectEvent = useCallback((rbcEvent: CalendarRbcEvent) => {
    const id = rbcEvent.resource?.id;
    if (!id || id === ACTIVE_SESSION_EVENT_ID) return;
    setSelectedId(id);
  }, []);

  const openCreateModal = useCallback((start?: Date, end?: Date) => {
    if (start && end) {
      let s = start;
      let e = end;
      if (e.getTime() <= s.getTime()) {
        e = new Date(s.getTime() + 60 * 60 * 1000);
      }
      setCreateStartLocal(toDateTimeLocalValue(s));
      setCreateEndLocal(toDateTimeLocalValue(e));
    } else {
      const { start: ds, end: de } = defaultCreateRange();
      setCreateStartLocal(toDateTimeLocalValue(ds));
      setCreateEndLocal(toDateTimeLocalValue(de));
    }
    setCreateTitle("");
    setCreateModalOpen(true);
  }, []);

  const resetCreateForm = useCallback(() => {
    const { start, end } = defaultCreateRange();
    setCreateTitle("");
    setCreateStartLocal(toDateTimeLocalValue(start));
    setCreateEndLocal(toDateTimeLocalValue(end));
  }, []);

  const persistActualEvent = useCallback(
    (newEvent: CalendarEvent) => {
      setSelectedId(null);
      applyActualRecording(newEvent, { type: "append" });
    },
    [applyActualRecording]
  );

  const tryAppendActualEvent = useCallback(
    (newEvent: CalendarEvent) => {
      persistActualEvent(newEvent);
      resetCreateForm();
      setCreateModalOpen(false);
    },
    [persistActualEvent, resetCreateForm]
  );

  const handleCreateEvent = () => {
    const trimmed = createTitle.trim() || "Untitled event";
    const start = new Date(createStartLocal);
    const end = new Date(createEndLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      window.alert("Please enter valid start and end times.");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      window.alert("End time must be after start time.");
      return;
    }
    const newEvent = createCalendarEvent({
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      calendarId: ACTUAL_TIMER_CALENDAR_ID,
      title: trimmed,
      start,
      end,
      isAllDay: false,
      kind: "actual",
    });
    tryAppendActualEvent(newEvent);
  };

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      openCreateModal(slotInfo.start, slotInfo.end);
    },
    [openCreateModal]
  );

  const handleStartLiveFromModal = () => {
    if (activeRecording) return;
    beginActiveRecording(liveTitle);
    setLiveTitle("");
    setLiveModalOpen(false);
  };

  /** Play on a scheduled block: confirm before replacing plan with live. No popup for "Start live activity". */
  const handleActivityPlayClick = (ev: CalendarEvent) => {
    if (activeRecording) return;
    if (needsLiveReplaceConfirm(ev)) {
      setReplaceConfirmEvent(ev);
      return;
    }
    beginActiveRecording(ev.title);
  };

  const handleConfirmReplacePlanned = () => {
    if (!replaceConfirmEvent || activeRecording) return;
    const ev = replaceConfirmEvent;
    flushSync(() => {
      setReplaceConfirmEvent(null);
    });
    deleteEvent(ev);
    beginActiveRecording(ev.title);
  };

  const handleStop = () => {
    if (!activeRecording) return;
    setSelectedId(null);
    const startedAt = activeRecording.startedAt;
    const title = activeRecording.title;
    clearActiveRecording();

    let end = new Date();
    if (end.getTime() <= startedAt.getTime()) {
      end = new Date(startedAt.getTime() + 60 * 1000);
    }

    const newEvent = createCalendarEvent({
      id: `actual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      calendarId: ACTUAL_TIMER_CALENDAR_ID,
      title,
      start: startedAt,
      end,
      isAllDay: false,
      kind: "actual",
    });

    persistActualEvent(newEvent);
  };

  return (
    <main className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-8">
      <section
        className="calendar-page-workspace flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[21px] lg:flex-row lg:items-stretch lg:gap-5"
        aria-label="Calendar workspace"
      >
        <aside
          className="flex w-full shrink-0 flex-col gap-5 rounded-[21px] border border-black/[0.06] p-5 lg:max-h-none lg:min-h-0 lg:w-[300px] lg:overflow-y-auto lg:self-stretch"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(var(--card-backdrop-blur))",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="w-full rounded-full py-3 text-[15px] font-semibold text-[color:var(--inverse-color)] transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Create event
            </button>

            {activeRecording ? (
              <div className="rounded-xl border border-black/[0.06] bg-white/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  Live session
                </p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
                  {activeRecording.title}
                </p>
                <p
                  className="mt-3 font-mono text-3xl font-semibold tabular-nums text-[color:var(--primary)]"
                  suppressHydrationWarning
                >
                  {formatMmSs(elapsedSeconds)}
                </p>
                <button
                  type="button"
                  onClick={handleStop}
                  className="mt-4 w-full rounded-full py-3.5 text-[16px] font-semibold text-[color:var(--inverse-color)] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--text-primary)" }}
                >
                  Stop &amp; save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLiveTitle("");
                  setLiveModalOpen(true);
                }}
                className="w-full rounded-full border-2 border-[color:var(--primary)] bg-white/80 py-3 text-[15px] font-semibold text-[color:var(--primary)] transition-opacity hover:opacity-90"
              >
                Start live activity
              </button>
            )}
          </div>

          {sidebarActivityRows.length > 0 ? (
            <div className="rounded-xl border border-black/[0.06] bg-white/40 p-4">
              <p className="text-sm font-medium leading-snug text-[color:var(--text-primary)]">
                Replace planned sessions with a live timer
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {sidebarActivityRows.map(({ event: ev, rowKind }) => (
                  <li
                    key={ev.id}
                    className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[color:var(--text-primary)]">
                        {ev.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                        {rowKind === "now"
                          ? "Now"
                          : `Starts ${ev.start.toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleActivityPlayClick(ev)}
                      disabled={Boolean(activeRecording)}
                      title={
                        needsLiveReplaceConfirm(ev)
                          ? "Replace this block with a live session (confirms first)"
                          : "Start live session for this activity"
                      }
                      aria-label={
                        needsLiveReplaceConfirm(ev)
                          ? "Replace calendar block with live session"
                          : "Start live session for this activity"
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/[0.1] bg-[color:var(--primary)] text-[color:var(--inverse-color)] shadow-sm transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden
                      >
                        <path d="M8 5v14l11-7-11-7z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {events.length === 0 ? (
            <p className="text-sm text-[color:var(--text-secondary)]">
              Import an .ics or create events — data stays on device.{" "}
              <Link
                href="/"
                className="font-semibold text-[color:var(--primary)] underline-offset-2 hover:underline"
              >
                Upload .ics
              </Link>
            </p>
          ) : null}
        </aside>

        <div className="calendar-google-frame flex min-h-[min(360px,50dvh)] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
          {events.length === 0 && !activeRecording ? (
            <div className="shrink-0 border-b border-black/[0.06] bg-[color:var(--primary-10)] px-4 py-3 text-center text-sm text-[color:var(--text-secondary)]">
              No events yet — use{" "}
              <strong className="text-[color:var(--text-primary)]">Create event</strong>, drag on
              the grid, or{" "}
              <Link
                href="/"
                className="font-semibold text-[color:var(--primary)] underline-offset-2 hover:underline"
              >
                upload an .ics
              </Link>
              .
            </div>
          ) : null}
          <div className="calendar-google-frame-inner min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <Calendar
              localizer={rbcLocalizer}
              culture="en-US"
              events={rbcEvents}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              allDayAccessor="allDay"
              views={RBC_VIEWS}
              view={view}
              onView={setView}
              date={date}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              selectable
              onSelectSlot={handleSelectSlot}
              popup
              showMultiDayTimes
              eventPropGetter={eventPropGetter}
              components={{ event: ActualCalendarEvent }}
              style={{ minHeight: "100%" }}
              className="rbc-google-theme"
              messages={{
                today: "Today",
                previous: "‹",
                next: "›",
                month: "Month",
                week: "Week",
                day: "Day",
                agenda: "Agenda",
                date: "Date",
                time: "Time",
                event: "Event",
                showMore: (total) => `+${total} more`,
              }}
            />
          </div>
        </div>
      </section>

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.12)", backdropFilter: "blur(6px)" }}
          onClick={() => setCreateModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/[0.08] p-6 shadow-xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(var(--card-backdrop-blur))",
              boxShadow: "var(--card-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <h2
              id="create-event-title"
              className="text-lg font-semibold text-[color:var(--text-primary)]"
            >
              New event
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Adds a block to your calendar (saved locally).
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[color:var(--text-primary)]">
              Title
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Meeting, focus time…"
                className="rounded-xl border border-black/10 bg-white/90 px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--primary-30)]"
              />
            </label>
            <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-[color:var(--text-primary)]">
              Starts
              <input
                type="datetime-local"
                value={createStartLocal}
                onChange={(e) => setCreateStartLocal(e.target.value)}
                className="rounded-xl border border-black/10 bg-white/90 px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--primary-30)]"
              />
            </label>
            <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-[color:var(--text-primary)]">
              Ends
              <input
                type="datetime-local"
                value={createEndLocal}
                onChange={(e) => setCreateEndLocal(e.target.value)}
                className="rounded-xl border border-black/10 bg-white/90 px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--primary-30)]"
              />
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="rounded-full border border-black/15 bg-white/80 px-5 py-2.5 text-[15px] font-semibold text-[color:var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateEvent}
                className="rounded-full px-5 py-2.5 text-[15px] font-semibold text-[color:var(--inverse-color)]"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Add to calendar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {liveModalOpen ? (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.12)", backdropFilter: "blur(6px)" }}
          onClick={() => {
            setLiveModalOpen(false);
            setLiveTitle("");
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/[0.08] p-6 shadow-xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(var(--card-backdrop-blur))",
              boxShadow: "var(--card-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-activity-title"
          >
            <h2
              id="live-activity-title"
              className="text-lg font-semibold text-[color:var(--text-primary)]"
            >
              Start live activity
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Name this session, then start the timer.
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[color:var(--text-primary)]">
              Name
              <input
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Deep work, email, break…"
                autoFocus
                className="rounded-xl border border-black/10 bg-white/90 px-3 py-2.5 text-[15px] outline-none focus:border-[color:var(--primary-30)]"
              />
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setLiveModalOpen(false);
                  setLiveTitle("");
                }}
                className="rounded-full border border-black/15 bg-white/80 px-5 py-2.5 text-[15px] font-semibold text-[color:var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartLiveFromModal}
                className="rounded-full px-5 py-2.5 text-[15px] font-semibold text-[color:var(--inverse-color)]"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replaceConfirmEvent ? (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", backdropFilter: "blur(8px)" }}
          onClick={() => setReplaceConfirmEvent(null)}
          role="presentation"
        >
          <div
            className="max-w-md rounded-[var(--card-radius-lg)] border border-black/[0.08] p-6 shadow-lg"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(var(--card-backdrop-blur))",
              boxShadow: "var(--card-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-planned-title"
          >
            <h2
              id="replace-planned-title"
              className="text-lg font-semibold text-[color:var(--text-primary)]"
            >
              Replace with live session?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
              <span className="font-semibold text-[color:var(--text-primary)]">Caution:</span>{" "}
              <span className="font-semibold text-[color:var(--text-primary)]">
                {replaceConfirmEvent.title}
              </span>{" "}
              will be replaced by a live session. The timer starts after you confirm.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReplaceConfirmEvent(null)}
                className="rounded-full border border-black/15 bg-white/80 px-5 py-2.5 text-[15px] font-semibold text-[color:var(--text-primary)] transition-opacity hover:opacity-90"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReplacePlanned}
                className="rounded-full px-5 py-2.5 text-[15px] font-semibold text-[color:var(--inverse-color)] transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EventDetailPopup
        event={selectedEvent}
        onClose={() => setSelectedId(null)}
        onSave={updateCalendarEvent}
        onDelete={deleteEvent}
      />
    </main>
  );
}
