import { CalendarEvent } from "./stats";

export function filterEventsByTimeRange(
  events: CalendarEvent[],
  filterType: "Month" | "Year" | "LifeTime",
  year: number,
  month: number,
  minDate: Date | null,
  maxDate: Date | null
): CalendarEvent[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (filterType === "LifeTime") {
    return events;
  }

  if (filterType === "Year") {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    
    // Clamp to available date range
    if (minDate && startOfYear < minDate) {
      startOfYear.setTime(minDate.getTime());
    }
    if (maxDate && endOfYear > maxDate) {
      endOfYear.setTime(maxDate.getTime());
    }
    if (year === currentYear) {
      endOfYear.setTime(now.getTime());
    }

    return events.filter((event) => {
      const eventDate = event.start;
      return eventDate >= startOfYear && eventDate <= endOfYear;
    });
  }

  if (filterType === "Month") {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // Clamp to available date range
    if (minDate && startOfMonth < minDate) {
      startOfMonth.setTime(minDate.getTime());
    }
    if (maxDate && endOfMonth > maxDate) {
      endOfMonth.setTime(maxDate.getTime());
    }
    if (year === currentYear && month === currentMonth) {
      endOfMonth.setTime(now.getTime());
    }

    return events.filter((event) => {
      const eventDate = event.start;
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  }

  // Default to all events (shouldn't reach here, but just in case)
  return events;
}

export function getFirstEventDate(events: CalendarEvent[]): Date | null {
  if (events.length === 0) return null;
  
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  return sorted[0].start;
}

export function getLastEventDate(events: CalendarEvent[]): Date | null {
  if (events.length === 0) return null;
  
  const sorted = [...events].sort((a, b) => b.start.getTime() - a.start.getTime());
  return sorted[0].start;
}

