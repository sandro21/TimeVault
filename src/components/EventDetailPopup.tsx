"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, subMilliseconds } from "date-fns";
import { Pencil, Trash2, X } from "lucide-react";

import type { CalendarEvent } from "@/lib/calculations/stats";
import { computeEventHorizon } from "@/lib/calendar-horizon";

function formatEventWhen(event: CalendarEvent): string {
  if (event.isAllDay) {
    return `${format(event.start, "EEEE, MMMM d")} · All day`;
  }
  const startDay = format(event.start, "yyyy-MM-dd");
  const endDay = format(event.end, "yyyy-MM-dd");
  if (startDay === endDay) {
    return `${format(event.start, "EEEE, MMMM d")} · ${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;
  }
  return `${format(event.start, "EEEE, MMMM d, h:mm a")} – ${format(event.end, "EEEE, MMMM d, h:mm a")}`;
}

function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Inclusive end date for all-day UI when stored end is exclusive midnight */
function allDayEndDateInput(e: CalendarEvent): string {
  const end = e.end;
  if (
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getMilliseconds() === 0
  ) {
    return format(subMilliseconds(end, 1), "yyyy-MM-dd");
  }
  return format(end, "yyyy-MM-dd");
}

export type EventSavePayload = {
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
};

type EventDetailPopupProps = {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (
    eventId: string,
    updates: EventSavePayload,
    kind: "planned" | "actual"
  ) => void;
  onDelete: (event: CalendarEvent) => void;
};

export function EventDetailPopup({
  event,
  onClose,
  onSave,
  onDelete,
}: EventDetailPopupProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStartLocal, setDraftStartLocal] = useState("");
  const [draftEndLocal, setDraftEndLocal] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const resetDraftsFromEvent = useCallback((e: CalendarEvent) => {
    setDraftTitle(e.title);
    if (e.isAllDay) {
      setDraftStartDate(format(e.start, "yyyy-MM-dd"));
      setDraftEndDate(allDayEndDateInput(e));
    } else {
      setDraftStartLocal(toDateTimeLocalValue(e.start));
      setDraftEndLocal(toDateTimeLocalValue(e.end));
    }
  }, []);

  useEffect(() => {
    if (!event) return;
    setEditing(false);
    resetDraftsFromEvent(event);
  }, [event?.id, resetDraftsFromEvent]);

  useEffect(() => {
    if (editing && titleRef.current) {
      titleRef.current.focus();
    }
  }, [editing]);

  const cancelEdit = useCallback(() => {
    if (event) resetDraftsFromEvent(event);
    setEditing(false);
  }, [event, resetDraftsFromEvent]);

  const saveEdit = useCallback(() => {
    if (!event) return;
    const kind: "planned" | "actual" = event.kind === "actual" ? "actual" : "planned";
    let start: Date;
    let end: Date;
    if (event.isAllDay) {
      start = new Date(`${draftStartDate}T00:00:00`);
      end = new Date(`${draftEndDate}T23:59:59.999`);
    } else {
      start = new Date(draftStartLocal);
      end = new Date(draftEndLocal);
    }
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      window.alert("Please enter valid dates and times.");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      window.alert("End must be after start.");
      return;
    }
    onSave(
      event.id,
      {
        title: draftTitle,
        start,
        end,
        isAllDay: event.isAllDay,
      },
      kind
    );
    setEditing(false);
  }, [
    draftEndDate,
    draftEndLocal,
    draftStartDate,
    draftStartLocal,
    draftTitle,
    event,
    onSave,
  ]);

  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        e.preventDefault();
        cancelEdit();
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, editing, onClose, cancelEdit]);

  if (!event) return null;

  const handleDelete = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete “${event.title}”? This cannot be undone.`)
    ) {
      return;
    }
    onDelete(event);
    onClose();
  };

  const swatchColor =
    event.start.getTime() > Date.now()
      ? "rgba(59, 130, 246, 0.85)"
      : "var(--primary)";
  const eventHorizon = computeEventHorizon(
    event.start,
    event.end,
    Date.now(),
    event.isAllDay
  );

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.12)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-black/[0.08] p-5 shadow-xl"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.78)",
          backdropFilter: "blur(var(--card-backdrop-blur))",
          boxShadow: "var(--card-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: swatchColor }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {editing ? (
                <>
                  <label className="sr-only" htmlFor="event-detail-title">
                    Title
                  </label>
                  <input
                    ref={titleRef}
                    id="event-detail-title"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full rounded-lg border border-black/12 bg-white/90 px-2 py-1 text-lg font-semibold text-[color:var(--text-primary)] outline-none focus:border-[color:var(--primary-30)]"
                  />
                  {event.isAllDay ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="text-xs font-medium text-[color:var(--text-secondary)]">
                        Start date
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-black/12 bg-white/90 px-2 py-2 text-sm text-[color:var(--text-primary)]"
                        />
                      </label>
                      <label className="text-xs font-medium text-[color:var(--text-secondary)]">
                        End date
                        <input
                          type="date"
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-black/12 bg-white/90 px-2 py-2 text-sm text-[color:var(--text-primary)]"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="text-xs font-medium text-[color:var(--text-secondary)]">
                        Starts
                        <input
                          type="datetime-local"
                          value={draftStartLocal}
                          onChange={(e) => setDraftStartLocal(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-black/12 bg-white/90 px-2 py-2 text-sm text-[color:var(--text-primary)]"
                        />
                      </label>
                      <label className="text-xs font-medium text-[color:var(--text-secondary)]">
                        Ends
                        <input
                          type="datetime-local"
                          value={draftEndLocal}
                          onChange={(e) => setDraftEndLocal(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-black/12 bg-white/90 px-2 py-2 text-sm text-[color:var(--text-primary)]"
                        />
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2
                    id="event-detail-title"
                    className="text-xl font-semibold leading-snug text-[color:var(--text-primary)]"
                  >
                    {event.title}
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                    {formatEventWhen(event)}
                  </p>
                </>
              )}
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[color:var(--text-secondary)]">
                {eventHorizon === "future"
                  ? "Upcoming"
                  : eventHorizon === "ongoing"
                    ? "Ongoing"
                    : "Past"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                resetDraftsFromEvent(event);
                setEditing(true);
              }}
              className="rounded-full p-2 text-[color:var(--text-secondary)] transition-colors hover:bg-black/[0.06] hover:text-[color:var(--text-primary)]"
              title="Edit"
              aria-label="Edit event"
            >
              <Pencil className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full p-2 text-[color:var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-600"
              title="Delete"
              aria-label="Delete event"
            >
              <Trash2 className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-full p-2 text-[color:var(--text-secondary)] transition-colors hover:bg-black/[0.06]"
              title="Close"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 border-t border-black/[0.06] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-black/15 bg-white/80 px-5 py-2.5 text-[15px] font-semibold text-[color:var(--text-primary)] transition-opacity hover:opacity-90"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-full px-5 py-2.5 text-[15px] font-semibold text-[color:var(--inverse-color)] transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Save changes
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
