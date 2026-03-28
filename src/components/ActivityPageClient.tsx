"use client";

import { useEffect } from "react";
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
import { ContributionsCalendar } from "@/components/ContributionsCalendar";
import { ActivityDayOfWeekChart } from "@/components/ActivityDayOfWeekChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { ActivityScatterLineChart } from "@/components/ActivityScatterLineChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { ActivityPeakMonthChart } from "@/components/ActivityPeakMonthChart";

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
  timeFilter: string;
}

export function ActivityPageClient({ events, searchString, timeFilter }: ActivityPageClientProps) {
  const {
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    setMinDate,
    maxDate,
    setMaxDate,
  } = useFilter();


  // Filter events by activity name first
  const activityFilteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchString.toLowerCase())
  );

  // Then filter by time range
  const filteredEvents = filterEventsByTimeRange(
    activityFilteredEvents,
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate
  );

  const activityStats = computeActivityStats(filteredEvents, searchString);

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
  const remainingMinutes = activityStats.totalMinutes % (24 * 60);
  const totalHours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  
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
  const calculateDailyAverage = () => {
    if (!firstSessionEvent || !lastSessionEvent || activityStats.totalMinutes === 0) {
      return 0;
    }
    const firstDate = new Date(firstSessionEvent.start);
    const lastDate = new Date(lastSessionEvent.start);
    firstDate.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.round(activityStats.totalMinutes / daysDiff);
  };

  const calculateWeeklyAverage = () => {
    if (!firstSessionEvent || !lastSessionEvent || activityStats.totalMinutes === 0) {
      return 0;
    }
    const firstDate = new Date(firstSessionEvent.start);
    const lastDate = new Date(lastSessionEvent.start);
    firstDate.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeksDiff = Math.ceil(daysDiff / 7);
    
    return Math.round(activityStats.totalMinutes / weeksDiff);
  };

  const dailyAverage = calculateDailyAverage();
  const weeklyAverage = calculateWeeklyAverage();

  return (
    <>
      {/* Section 1 Header */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-section-header text-black font-bold italic">
            {activityStats.name}
          </h2>
          {firstSessionEvent && lastSessionEvent && (
            <span className="text-section-header text-[color:var(--gray)]">
              {formatDate(firstSessionEvent.start)} - {formatDate(lastSessionEvent.start)}
            </span>
          )}
        </div>

        {/* grid of cards */}
        <div className="grid grid-cols-[.9fr_1.1fr_3fr] auto-rows-[200px] gap-3">
          {/* 1. Top left - Total Count (spans 1 col) */}
          <div className="card-soft">
            <h3 className="text-card-title">Total Count</h3>
            <div className="text-number-large text-[color:var(--red-1)]">
              {activityStats.totalCount}
            </div>
          </div>

          {/* 2. Top middle - Time Logged (spans 1 col) */}
          <div className="card-soft px-8">
            <h3 className="text-card-title mb-2">Time Logged</h3>
            <p className="text-body-24 text-[color:var(--red-1)]">
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
            <h3 className="text-card-title text-black">Daily Average</h3>
            <div className="mt-4 text-number-large text-[color:var(--red-1)]">
              {formatAsCompactHoursMinutes(dailyAverage)}
            </div>
          </div>

          {/* 5. Bottom - Weekly Average */}
          <div className="card-soft flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-card-title text-black">Weekly Average</h3>
            <div className="mt-4 text-number-large text-[color:var(--red-1)]">
              {formatAsCompactHoursMinutes(weeklyAverage)}
            </div>
          </div>
        </div>
      </section>

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
            <div className="text-number-medium text-[color:var(--red-1)]">
              {formatAsCompactHoursMinutes(activityStats.averageSessionMinutes)}
            </div>
          </div>

          {/* 3. Activity Scatter Line Chart (spans 2 rows, right column) */}
          <div className="card-soft row-span-2 flex flex-col px-3 py-3">
            <h3 className="text-card-title mb-4">Activity Distribution</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityScatterLineChart events={filteredEvents} />
            </div>
          </div>

          {/* 4. Longest (spans 1 col, 1 row, middle column, under Average) */}
          <div className="card-soft gap-0">
            <h3 className="text-card-title">Longest</h3>
            <div className="text-number-medium text-[color:var(--red-1)]">
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

      {/* Consistency Section */}
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
            <div className="text-number-medium text-[color:var(--red-1)]">
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
            <div className="text-number-medium text-[color:var(--red-1)]">
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

      {/* Habits Section */}
      <section>
        <h2 className="text-section-header text-black">
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

          {/* Peak Month */}
          <div className="card-soft col-span-2 flex flex-col px-6 py-4">
            <h3 className="text-card-title mb-2">Peak Month</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityPeakMonthChart events={filteredEvents} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

