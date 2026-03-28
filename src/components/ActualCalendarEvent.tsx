"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Event as RbcEvent, EventProps } from "react-big-calendar";

import type { EventKind } from "@/lib/calculations/stats";
import { computeEventHorizon } from "@/lib/calendar-horizon";

/** Past = truth; future/ongoing (non-live) = plan; active = live recording */
export type EventHorizon = "active" | "past" | "future" | "ongoing";

export type CalendarRbcEvent = RbcEvent & {
  resource?: {
    id: string;
    calendarId: string;
    kind?: EventKind;
    horizon?: EventHorizon;
    isActiveRecording?: boolean;
    /** From CalendarViewClient — use for past/future/ongoing so RBC doesn’t skew segment times */
    originalStartMs?: number;
    originalEndMs?: number;
    originalIsAllDay?: boolean;
  };
};

const pastStyle: CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.06)",
  color: "var(--text-primary)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(0, 0, 0, 0.14)",
};

const planStyle: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.45)",
  borderColor: "rgba(0, 0, 0, 0.18)",
  color: "var(--text-secondary)",
  borderWidth: 1,
  borderStyle: "dashed",
};

const activeStyle: CSSProperties = {
  backgroundColor: "var(--primary)",
  color: "var(--inverse-color)",
  boxShadow: "0 3px 10px rgba(214, 56, 33, 0.45)",
};

/**
 * Title only (no times). If the label doesn't fit, it renders above the block in black.
 */
export function ActualCalendarEvent({ event, title }: EventProps<CalendarRbcEvent>) {
  const label = (title ?? event.title ?? "").trim();
  const isLive = event.resource?.isActiveRecording === true;
  const start = event.start instanceof Date ? event.start : new Date(event.start);
  const end = event.end instanceof Date ? event.end : new Date(event.end);
  const startMs = event.resource?.originalStartMs ?? start.getTime();
  const endMs = event.resource?.originalEndMs ?? end.getTime();
  const allDayForHorizon = event.resource?.originalIsAllDay ?? Boolean(event.allDay);
  const horizon: EventHorizon = isLive
    ? "active"
    : computeEventHorizon(new Date(startMs), new Date(endMs), Date.now(), allDayForHorizon);

  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [titleAbove, setTitleAbove] = useState(false);

  const measure = useCallback(() => {
    const box = boxRef.current;
    const ghost = measureRef.current;
    if (!box || !ghost || !label) {
      setTitleAbove(false);
      return;
    }
    const over =
      ghost.scrollHeight > box.clientHeight + 0.5 ||
      ghost.scrollWidth > box.clientWidth + 0.5;
    setTitleAbove(over);
  }, [label]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(box);
    return () => ro.disconnect();
  }, [measure]);

  let blockStyle: CSSProperties;
  if (isLive) {
    blockStyle = activeStyle;
  } else if (horizon === "past") {
    blockStyle = pastStyle;
  } else {
    blockStyle = planStyle;
  }

  const textInBlockClass = isLive
    ? "font-semibold text-[color:var(--inverse-color)]"
    : horizon === "past"
      ? "font-medium text-[color:var(--text-primary)]"
      : "font-medium text-[color:var(--text-secondary)]";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col justify-end">
      {titleAbove ? (
        <div
          className="mb-0.5 max-w-full truncate px-0.5 text-left text-[10px] font-semibold leading-tight text-black"
          title={label}
        >
          {label}
        </div>
      ) : null}
      <div
        ref={boxRef}
        className="relative min-h-[18px] w-full min-w-0 flex-1 overflow-hidden rounded-lg px-1.5 py-0.5"
        style={blockStyle}
      >
        <span
          ref={measureRef}
          className="invisible absolute left-1.5 right-1.5 top-0.5 max-h-full overflow-hidden break-words text-[11px] font-semibold leading-tight"
          aria-hidden
        >
          {label}
        </span>
        {!titleAbove ? (
          <span
            className={`relative block max-h-full overflow-hidden break-words text-left text-[11px] leading-tight ${textInBlockClass}`}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
