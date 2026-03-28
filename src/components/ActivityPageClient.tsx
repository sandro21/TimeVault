"use client";

import { useFilter } from "@/contexts/FilterContext";
import {
  computeActivityStats,
  formatAsCompactHoursMinutes,
  formatAsDaysHoursMinutes,
  formatAsHoursMinutes,
  formatAsMinutes,
  CalendarEvent,
} from "@/lib/calculations/stats";
import { filterEventsByTimeRange, getFirstEventDate, getLastEventDate } from "@/lib/calculations/filter-events";
import { filterHiddenEvents } from "@/lib/calculations/filter-hidden";
import { useEvents } from "@/contexts/EventsContext";
import { ContributionsCalendar } from "@/components/ContributionsCalendar";
import { ActivityDayOfWeekChart } from "@/components/ActivityDayOfWeekChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { ActivityScatterLineChart } from "@/components/ActivityScatterLineChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { ActivityPeakMonthChart } from "@/components/ActivityPeakMonthChart";
import { ActivityBreadcrumbSearchWrapper } from "@/components/ActivityBreadcrumbSearchWrapper";

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatDateTime(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  }).toLowerCase();
  return `${month} ${day},${year} ${time}`;
}

interface ActivityPageClientProps {
  events: CalendarEvent[];
  searchString: string;
  searchType: string;
  timeFilter: string;
}

export function ActivityPageClient({ events, searchString, searchType, timeFilter }: ActivityPageClientProps) {
  const {
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    setMinDate,
    maxDate,
    setMaxDate,
  } = useFilter();
  // Determine search mode based on searchType parameter
  const isExactMatch = searchType === "event";
  
  // Filter events: exact match for event search, substring for string search
  const activityFilteredEvents = events.filter((event) => {
    if (isExactMatch) {
      // Exact match (event search) - only match this exact activity name
      return event.title.toLowerCase().trim() === searchString.toLowerCase().trim();
    } else {
      // Substring search (string search) - match any activity containing the search string
      return event.title.toLowerCase().includes(searchString.toLowerCase().trim());
    }
  });

  // Then filter by time range
  const timeFilteredEvents = filterEventsByTimeRange(
    activityFilteredEvents,
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate
  );

  // Filter out hidden activities/issues for statistics only
  const filteredEvents = filterHiddenEvents(timeFilteredEvents);
  
  // Keep all events for breadcrumb search (not filtered by hidden)
  const allEventsForSearch = timeFilteredEvents;

  // Pass the display name (with or without quotes) to stats
  const displayName = isExactMatch ? searchString : `"${searchString}"`;
  const activityStats = computeActivityStats(filteredEvents, displayName);

  // Format date range for header
  const getDateRangeDisplay = () => {
    if (firstSessionEvent && lastSessionEvent) {
      const firstDate = formatDate(firstSessionEvent.start);
      const lastDate = formatDate(lastSessionEvent.start);
      return `from ${firstDate} to ${lastDate}`;
    }
    return "";
  };

  // Calculate days for parentheses
  const totalDays = Math.floor(activityStats.totalMinutes / (24 * 60));
  
  // Calculate total hours and minutes (not remaining after days)
  // This matches the dashboard table which shows total hours/minutes
  const totalHours = Math.floor(activityStats.totalMinutes / 60);
  const minutes = activityStats.totalMinutes % 60;
  
  const timeHoursMinutesFormatted = totalHours > 0 
    ? `${totalHours} Hour${totalHours !== 1 ? "s" : ""}, ${minutes} Minute${minutes !== 1 ? "s" : ""}`
    : `${minutes} Minute${minutes !== 1 ? "s" : ""}`;

  // Get first and last session events for date range
  const sortedFilteredEvents = [...filteredEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const firstSessionEvent = sortedFilteredEvents[0] || null;
  const lastSessionEvent = sortedFilteredEvents[sortedFilteredEvents.length - 1] || null;

  // Calculate daily and weekly averages
  // Daily average should be based on unique days with events, not total day range
  const calculateDailyAverage = () => {
    if (filteredEvents.length === 0 || activityStats.totalMinutes === 0) {
      return 0;
    }
    
    // Count unique days that have events
    const uniqueDays = new Set(filteredEvents.map(event => event.dayString));
    const daysWithEvents = uniqueDays.size;
    
    if (daysWithEvents === 0) return 0;
    
    return Math.round(activityStats.totalMinutes / daysWithEvents);
  };

  const calculateWeeklyAverage = () => {
    if (filteredEvents.length === 0 || activityStats.totalMinutes === 0) {
      return 0;
    }
    
    // Count unique weeks that have events
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    };
    
    const uniqueWeeks = new Set(filteredEvents.map(event => getWeekKey(event.start)));
    const weeksWithEvents = uniqueWeeks.size;
    
    if (weeksWithEvents === 0) return 0;
    
    return Math.round(activityStats.totalMinutes / weeksWithEvents);
  };

  const dailyAverage = calculateDailyAverage();
  const weeklyAverage = calculateWeeklyAverage();

  return (
    <>
      {/* Activity Breadcrumb Search */}
      <ActivityBreadcrumbSearchWrapper events={allEventsForSearch} />

      {/* All Sections Grouped */}
      <div className="sections-container">
        {/* grid of cards */}
        <div className="grid grid-cols-[1fr_1.1fr_3fr] auto-rows-[200px] gap-3">
          {/* 1. Top left - Total Count (spans 1 col) */}
          <div className="card-soft">
            <h3 className="text-card-title">Total Count</h3>
            <div className="text-number-large text-[color:var(--primary)]">
              {activityStats.totalCount}
            </div>
          </div>

          {/* 2. Top middle - Time Logged (spans 1 col) */}
          <div className="card-soft px-8">
            <h3 className="text-card-title mb-2">Time Logged</h3>
            <p className="text-body-24 text-[color:var(--primary)]">
              {timeHoursMinutesFormatted}
            </p>
            {totalDays > 0 && (
              <p className="text-[18px] text-[color:var(--gray)] mt-1">
                ({totalDays}+ days)
              </p>
            )}
          </div>

          {/* 3. Top right - Time Logged Line Chart (spans 1 col, 3.5fr, spans 2 rows) */}
          <div className="card-soft row-span-2 flex flex-col px-8 py-6">
            <div className="flex-1 min-h-0 w-full">
              <TimeLoggedChart events={filteredEvents} />
            </div>
          </div>

          {/* 4. Bottom - Daily Average */}
          <div className="card-soft flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-card-title">Daily Average</h3>
            <div className="mt-4 text-number-large text-[color:var(--primary)]">
              {formatAsCompactHoursMinutes(dailyAverage)}
            </div>
          </div>

          {/* 5. Bottom - Weekly Average */}
          <div className="card-soft flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-card-title">Weekly Average</h3>
            <div className="mt-4 text-number-large text-[color:var(--primary)]">
              {formatAsCompactHoursMinutes(weeklyAverage)}
            </div>
          </div>
        </div>

      {/* Session Durations Section */}
      <section>
        <h2 className="text-section-header">
          Session Durations
        </h2>

        {/* grid of cards */}
        <div className="grid grid-cols-[1.5fr_1fr_2fr] auto-rows-[150px] gap-3">
          {/* 1. Activity Duration Chart (spans 2 rows, left column) */}
          <div className="card-soft row-span-2 flex flex-col px-3 py-3">
            <h3 className="text-card-title mb-4">Activity Duration</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityDurationChart events={filteredEvents} />
            </div>
          </div>

          {/* 2. Average (spans 1 col, 1 row, middle column) */}
          <div className="card-soft">
            <h3 className="text-card-title">Average</h3>
            <div className="text-number-medium text-[color:var(--primary)]">
              {formatAsCompactHoursMinutes(activityStats.averageSessionMinutes)}
            </div>
          </div>

          {/* 3. Activity Scatter Line Chart (spans 2 rows, right column) - Hidden on mobile */}
          <div className="card-soft row-span-2 hidden md:flex flex-col px-3 py-3 activity-distribution-chart">
            <h3 className="text-card-title mb-4">Activity Distribution</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityScatterLineChart events={filteredEvents} />
            </div>
          </div>

          {/* 4. Longest (spans 1 col, 1 row, middle column, under Average) */}
          <div className="card-soft gap-0">
            <h3 className="text-card-title">Longest</h3>
            <div className="text-number-medium text-[color:var(--primary)]">
              {activityStats.longestSession 
                ? formatAsCompactHoursMinutes(activityStats.longestSession.minutes)
                : "N/A"}
            </div>
            {activityStats.longestSession && (
              <p className="text-date">
                on {formatDate(activityStats.longestSession.date)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Consistency Section - Only show for Year filter */}
      {selectedFilter === "Year" && (
        <section>
          <h2 className="text-section-header">
            Consistency
          </h2>

          {/* grid of cards */}
          <div className="grid grid-cols-[1.5fr_1.5fr_3fr] grid-rows-[250px_160px] gap-3">
            {/* GitHub Style Contributions Calendar (spans all 3 columns) */}
            <div className="card-soft col-span-3">
              <ContributionsCalendar events={filteredEvents} />
            </div>

            {/* Longest Streak */}
            <div className="card-soft">
              <h3 className="text-card-title">Longest Streak</h3>
              <div className="text-number-medium text-[color:var(--primary)]">
                {activityStats.longestStreak 
                  ? `${activityStats.longestStreak.days} days`
                  : "N/A"}
              </div>
              {activityStats.longestStreak && (
                <p className="text-date">
                  {formatDate(activityStats.longestStreak.from)} - {formatDate(activityStats.longestStreak.to)}
                </p>
              )}
            </div>

            {/* Biggest Break */}
            <div className="card-soft">
              <h3 className="text-card-title">Biggest Break</h3>
              <div className="text-number-medium text-[color:var(--primary)]">
                {activityStats.biggestBreak 
                  ? `${activityStats.biggestBreak.days} days`
                  : "N/A"}
              </div>
              {activityStats.biggestBreak && (
                <p className="text-date">
                  {formatDate(activityStats.biggestBreak.from)} - {formatDate(activityStats.biggestBreak.to)}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Habits Section */}
      <section>
        <h2 className="text-section-header text-[color:var(--text-primary)]">
          Habits
        </h2>

        {/* grid of cards */}
        <div className="grid grid-cols-[2fr_400px] auto-rows-[400px] gap-3">
          {/* Prevalent Days */}
          <div className="card-soft flex flex-col px-6 py-4">
            <h3 className="text-card-title mb-2">Prevalent Days</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityDayOfWeekChart events={filteredEvents} />
            </div>
          </div>

          {/* Time of Day */}
          <div className="card-soft flex flex-col px-8 py-6">
            <h3 className="text-card-title mb-4">Time of Day</h3>
            <div className="flex-1 min-h-0 w-full">
              <TimeOfDayChart events={filteredEvents} />
            </div>
          </div>

          {/* Peak Month - Hide for Month filter */}
          {selectedFilter !== "Month" && (
            <div className="card-soft col-span-2 flex flex-col px-6 py-4">
              <h3 className="text-card-title mb-2">Peak Month</h3>
              <div className="flex-1 min-h-0 w-full">
                <ActivityPeakMonthChart events={filteredEvents} />
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
}

