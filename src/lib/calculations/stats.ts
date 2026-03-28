// ============================================================================
// Core Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  calendarId: string; // which .ics file / source it came from
  title: string; // activity name

  start: Date;
  end: Date;

  durationMinutes: number; // derived: (end - start) in minutes
  dayOfWeek: number; // 0–6 (Sun–Sat)
  dayString: string; // "YYYY-MM-DD"
  isAllDay: boolean;
}

//initial before derifving durationMinutes, daysOfWeek, dayString, isAllDay
export interface CreateCalendarEventInput {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean; // optional; default false
}

// ============================================================================
// Event Creation
// ============================================================================

export function createCalendarEvent(
  input: CreateCalendarEventInput
): CalendarEvent {
  const { id, calendarId, title, start, end, isAllDay = false } = input;

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60)); // ms -> minutes

  const dayOfWeek = start.getDay();

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  const dayString = `${year}-${month}-${day}`;

  return {
    id,
    calendarId,
    title,
    start,
    end,
    durationMinutes,
    dayOfWeek,
    dayString,
    isAllDay,
  };
}

// ============================================================================
// Stats Interfaces
// ============================================================================

export interface GlobalStats {
  totalCount: number;
  uniqueActivities: number;
  totalMinutes: number;
}

export interface ActivityStats {
  name: string; // search string used

  // Basic overview
  totalCount: number;
  totalMinutes: number;
  firstSession: Date | null;
  lastSession: Date | null;

  // Durations
  averageSessionMinutes: number;
  longestSession: {
    minutes: number;
    date: Date;
  } | null;

  // Consistency
  longestStreak: {
    days: number;
    from: Date;
    to: Date;
  } | null;

  biggestBreak: {
    days: number;
    from: Date;
    to: Date;
  } | null;
}

export interface TopActivity {
  name: string;
  count: number;
  totalMinutes: number;
  longestSessionMinutes: number;
  averageSessionMinutes: number;
}

export interface TimeBreakdown {
  days: number;
  hours: number;
  minutes: number;
}

// ============================================================================
// Stats Computation
// ============================================================================

//Sorts events older --> newest helper
function sortEventsByDate(
    events: CalendarEvent[],
    order: "asc" | "desc" = "asc"
  ): CalendarEvent[] {
    const sorted = [...events].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
    return order === "desc" ? sorted.reverse() : sorted;
}


//Global Stats
export function computeGlobalStats(events: CalendarEvent[]): GlobalStats {
  const totalCount = events.length;
  const uniqueTitles = new Set(events.map((event) => event.title));
  const uniqueActivities = uniqueTitles.size;

  const totalMinutes = events.reduce(
    (sum, event) => sum + event.durationMinutes,
    0
  );

  return {
    totalCount,
    uniqueActivities,
    totalMinutes,
  };
}


//Activity Stats
export  function computeActivityStats(
    events: CalendarEvent[],
    searchString: string
) : ActivityStats {
    // Use events as-is (they're already filtered by substring matching in ActivityPageClient)
    // This allows combining stats for all events matching a substring search
    const activityEvents = events;

    // Handle empty case
    if (activityEvents.length === 0) {
        return {
        name: searchString,
        totalCount: 0,
        totalMinutes: 0,
        firstSession: null,
        lastSession: null,
        averageSessionMinutes: 0,
        longestSession: null,
        longestStreak: null,
        biggestBreak: null,
        };
    }

    //Basic Overview Stats
    const totalCount = activityEvents.length;
    const totalMinutes = activityEvents.reduce(
        (sum, event) => sum + event.durationMinutes,
        0
    );

    //Sort by date to find first and last session
    const sortedByDate = sortEventsByDate(activityEvents);
    const firstSession = sortedByDate[0].start;
    const lastSession = sortedByDate[sortedByDate.length-1].start

    // Duration stats
    const averageSessionMinutes = Math.round(totalMinutes / totalCount);
    
    // Find the event with the longest duration
    const longestSessionEvent = activityEvents.reduce((longest, current) =>
      current.durationMinutes > longest.durationMinutes ? current : longest
    );
    //gets minutes and session date from longest event
    const longestSession = {
      minutes: longestSessionEvent.durationMinutes,
      date: longestSessionEvent.start,
    };


    //Consistency Section

    // Longest Streak
    // Get unique days (sorted chronologically)
    const uniqueDays = Array.from(
      new Set(sortedByDate.map((event) => event.dayString))
    ).sort();

    let longestStreak: { days: number; from: Date; to: Date } | null = null;
    let currentStreakStart = 0;
    let currentStreakLength = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      const prevDay = new Date(uniqueDays[i - 1]);
      const currentDay = new Date(uniqueDays[i]);
      const daysDiff = Math.round(
        (currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day - continue streak
        currentStreakLength++;
      } else {
        // Gap found - check if this streak is longest
        if (
          longestStreak === null ||
          currentStreakLength > longestStreak.days
        ) {
          longestStreak = {
            days: currentStreakLength,
            from: new Date(uniqueDays[currentStreakStart]),
            to: new Date(uniqueDays[i - 1]),
          };
        }
        // Reset streak
        currentStreakStart = i;
        currentStreakLength = 1;
      }
    }

    // Check final streak
    if (
      longestStreak === null ||
      currentStreakLength > longestStreak.days
    ) {
      longestStreak = {
        days: currentStreakLength,
        from: new Date(uniqueDays[currentStreakStart]),
        to: new Date(uniqueDays[uniqueDays.length - 1]),
      };
    }

    // Biggest Break
    let biggestBreak: { days: number; from: Date; to: Date } | null = null;

    for (let i = 1; i < sortedByDate.length; i++) {
      const prevEvent = sortedByDate[i - 1];
      const currentEvent = sortedByDate[i];
      const daysDiff = Math.round(
        (currentEvent.start.getTime() - prevEvent.start.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (
        biggestBreak === null ||
        daysDiff > biggestBreak.days
      ) {
        biggestBreak = {
          days: daysDiff,
          from: prevEvent.start,
          to: currentEvent.start,
        };
      }
    }
    





    return {
        name: searchString,
        totalCount,
        totalMinutes,
        firstSession,
        lastSession,
        averageSessionMinutes,
        longestSession,
        longestStreak,
        biggestBreak,
      };
}

// Top Activities
export function computeTopActivities(
  events: CalendarEvent[],
  sortBy: "count" | "time" = "count",
  limit: number = 5
): TopActivity[] {
  // Group events by title
  const activityMap = new Map<string, CalendarEvent[]>();
  
  for (const event of events) {
    const title = event.title;
    if (!activityMap.has(title)) {
      activityMap.set(title, []);
    }
    activityMap.get(title)!.push(event);
  }

  // Compute stats for each activity
  const activities: TopActivity[] = [];
  
  for (const [name, activityEvents] of activityMap.entries()) {
    const count = activityEvents.length;
    const totalMinutes = activityEvents.reduce(
      (sum, event) => sum + event.durationMinutes,
      0
    );
    const durations = activityEvents.map((event) => event.durationMinutes);
    const longestSessionMinutes = Math.max(...durations);
    const averageSessionMinutes = Math.round(totalMinutes / count);

    activities.push({
      name,
      count,
      totalMinutes,
      longestSessionMinutes,
      averageSessionMinutes,
    });
  }

  // Sort by count or total time
  activities.sort((a, b) => {
    if (sortBy === "count") {
      return b.count - a.count; // descending
    } else {
      return b.totalMinutes - a.totalMinutes; // descending
    }
  });

  // Return top N
  return activities.slice(0, limit);
}

// Timeline Bookends
export interface TimelineBookends {
  firstActivities: CalendarEvent[];
  lastActivities: CalendarEvent[];
}

export function getTimelineBookends(
  events: CalendarEvent[],
  count: number = 5
): TimelineBookends {
  if (events.length === 0) {
    return {
      firstActivities: [],
      lastActivities: [],
    };
  }

  const sorted = sortEventsByDate(events);
  
  const firstActivities = sorted.slice(0, count);
  const lastActivities = sorted.slice(-count).reverse(); // Reverse so most recent is first

  return {
    firstActivities,
    lastActivities,
  };
}


// ============================================================================
// Time Formatting Utilities
// ============================================================================

export function breakdownMinutes(totalMinutes: number): TimeBreakdown {
  const minutesInDay = 24 * 60;
  const minutesInHour = 60;

  const days = Math.floor(totalMinutes / minutesInDay);
  const remainingAfterDays = totalMinutes % minutesInDay;

  const hours = Math.floor(remainingAfterDays / minutesInHour);
  const minutes = remainingAfterDays % minutesInHour;

  return {
    days,
    hours,
    minutes,
  };
}

export function formatAsDaysHoursMinutes(totalMinutes: number): string {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);

  return `${days} Day${days === 1 ? "" : "s"}, ${hours} Hour${hours === 1 ? "" : "s"}, ${minutes} Minute${minutes === 1 ? "" : "s"}`;
}

export function formatAsHoursMinutes(totalMinutes: number): string {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);
  const totalHours = days * 24 + hours;
  return `${totalHours} Hour${totalHours !== 1 ? "s" : ""}, ${minutes} Minute${minutes !== 1 ? "s" : ""}`;
}

export function formatAsMinutes(totalMinutes: number): string {
  return `${totalMinutes} Minute${totalMinutes !== 1 ? "s" : ""}`;
}

// Compact format: "20h 32m" or "70m" (for durations < 1 hour)
export function formatAsCompactHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
