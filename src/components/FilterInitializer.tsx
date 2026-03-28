"use client";

import { useEffect } from "react";
import { useFilter } from "@/contexts/FilterContext";
import { CalendarEvent } from "@/lib/calculations/stats";
import { getFirstEventDate, getLastEventDate } from "@/lib/calculations/filter-events";

interface FilterInitializerProps {
  events: CalendarEvent[];
}

export function FilterInitializer({ events }: FilterInitializerProps) {
  const { minDate, setMinDate, maxDate, setMaxDate } = useFilter();

  useEffect(() => {
    if (events.length > 0) {
      const firstDate = getFirstEventDate(events);
      const lastDate = getLastEventDate(events);
      
      // Always update if we have events and dates are not set, or if the new dates are more restrictive
      if (firstDate) {
        if (!minDate || firstDate < minDate) {
          setMinDate(firstDate);
        }
      }
      if (lastDate) {
        if (!maxDate || lastDate > maxDate) {
          setMaxDate(lastDate);
        }
      }
    }
  }, [events, minDate, maxDate, setMinDate, setMaxDate]);

  return null;
}



