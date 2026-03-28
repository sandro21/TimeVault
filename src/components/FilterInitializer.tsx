"use client";

import { useEffect } from "react";
import { useFilter } from "@/contexts/FilterContext";
import { CalendarEvent } from "@/lib/calculations/stats";
import { getFirstEventDate } from "@/lib/calculations/filter-events";

interface FilterInitializerProps {
  events: CalendarEvent[];
}

export function FilterInitializer({ events }: FilterInitializerProps) {
  const { setMinDate, setMaxDate } = useFilter();

  // Only react to events changing — not to our own min/max updates (avoids extra effect runs).
  // Use functional updates so we compare timestamps and bail out when nothing changed.
  useEffect(() => {
    if (events.length === 0) return;

    const firstDate = getFirstEventDate(events);
    if (!firstDate) return;

    const firstTs = firstDate.getTime();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayTs = today.getTime();

    setMinDate((prev) => {
      if (prev != null && firstTs >= prev.getTime()) return prev;
      return new Date(firstTs);
    });
    setMaxDate((prev) => {
      if (prev != null && prev.getTime() <= todayTs) return prev;
      return today;
    });
  }, [events, setMinDate, setMaxDate]);

  return null;
}



