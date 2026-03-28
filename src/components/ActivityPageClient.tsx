"use client";

import { useMemo, useState } from "react";
import { useFilter } from "@/contexts/FilterContext";
import {
  computeActivityStats,
  formatAsCompactHoursMinutes,
  CalendarEvent,
} from "@/lib/calculations/stats";
import { filterEventsByTimeRange } from "@/lib/calculations/filter-events";
import { filterHiddenEvents } from "@/lib/calculations/filter-hidden";
import { ActivityDayOfWeekChart } from "@/components/ActivityDayOfWeekChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import type { DashboardViewMode } from "@/components/TimeLoggedChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { ActivityScatterLineChart } from "@/components/ActivityScatterLineChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { ActivityPeakMonthChart } from "@/components/ActivityPeakMonthChart";
import { ActivityBreadcrumbSearchWrapper } from "@/components/ActivityBreadcrumbSearchWrapper";
import { usePro } from "@/contexts/ProContext";

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
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
  const { isPro, billingRates } = usePro();
  const [viewMode, setViewMode] = useState<DashboardViewMode>("time");
  const isRevenue = isPro && viewMode === "revenue";
  const br = isPro ? billingRates : undefined;
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
  const totalRevenue = useMemo(
    () =>
      filteredEvents.reduce((sum, e) => {
        const rate = billingRates[e.title] ?? 0;
        return sum + (e.durationMinutes / 60) * rate;
      }, 0),
    [filteredEvents, billingRates]
  );

  // Calculate days for parentheses
  const totalDays = Math.floor(activityStats.totalMinutes / (24 * 60));
  
  // Calculate total hours and minutes (not remaining after days)
  // This matches the dashboard table which shows total hours/minutes
  const totalHours = Math.floor(activityStats.totalMinutes / 60);
  const minutes = activityStats.totalMinutes % 60;
  
  const timeHoursMinutesFormatted = totalHours > 0 
    ? `${totalHours} Hour${totalHours !== 1 ? "s" : ""}, ${minutes} Minute${minutes !== 1 ? "s" : ""}`
    : `${minutes} Minute${minutes !== 1 ? "s" : ""}`;

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
  const dailyAverageRevenue = useMemo(() => {
    if (filteredEvents.length === 0) return 0;
    const uniqueDays = new Set(filteredEvents.map((event) => event.dayString));
    if (uniqueDays.size === 0) return 0;
    return totalRevenue / uniqueDays.size;
  }, [filteredEvents, totalRevenue]);
  const weeklyAverageRevenue = useMemo(() => {
    if (filteredEvents.length === 0) return 0;
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    };
    const uniqueWeeks = new Set(filteredEvents.map((event) => getWeekKey(event.start)));
    if (uniqueWeeks.size === 0) return 0;
    return totalRevenue / uniqueWeeks.size;
  }, [filteredEvents, totalRevenue]);

  const highestEarningSession = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    let best: { revenue: number; date: Date } | null = null;
    for (const e of filteredEvents) {
      const revenue = (e.durationMinutes / 60) * (billingRates[e.title] ?? 0);
      if (!best || revenue > best.revenue) {
        best = { revenue, date: e.start };
      }
    }
    return best;
  }, [filteredEvents, billingRates]);
  const avgRevenuePerSession =
    activityStats.totalCount > 0 ? totalRevenue / activityStats.totalCount : 0;
  const revenueValueStyle = isRevenue ? { color: "#16a34a" } : undefined;
  const formatCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <>
      {/* Activity Breadcrumb Search */}
      <div className="flex items-center justify-between">
        <ActivityBreadcrumbSearchWrapper events={allEventsForSearch} />
        {isPro && (
          <div className="flex shrink-0 items-center rounded-full bg-black/[0.04] p-0.5 text-[13px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("time")}
              className={`rounded-full px-3 py-1 transition-colors ${
                viewMode === "time"
                  ? "bg-white shadow-sm text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)]"
              }`}
            >
              Time &amp; Productivity
            </button>
            <button
              type="button"
              onClick={() => setViewMode("revenue")}
              className={`rounded-full px-3 py-1 transition-colors ${
                viewMode === "revenue"
                  ? "bg-white shadow-sm text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)]"
              }`}
            >
              Revenue &amp; Financials
            </button>
          </div>
        )}
      </div>

      {/* All Sections Grouped */}
      <div className="sections-container">
        {/* grid of cards */}
        <div className="grid grid-cols-[1fr_1.1fr_3fr] auto-rows-[200px] gap-3">
          {/* 1. Top left - Total Count (spans 1 col) */}
          <div className="card-soft">
            <h3 className="text-card-title">{isRevenue ? "Total Revenue" : "Total Count"}</h3>
            <div className="text-number-large text-[color:var(--primary)]" style={revenueValueStyle}>
              {isRevenue ? formatCurrency(totalRevenue) : activityStats.totalCount}
            </div>
          </div>

          {/* 2. Top middle - Time Logged (spans 1 col) */}
          <div className="card-soft px-8">
            <h3 className="text-card-title mb-2">Time Logged</h3>
            <p className="text-body-24 text-[color:var(--primary)]" style={revenueValueStyle}>
              {timeHoursMinutesFormatted}
            </p>
            {totalDays > 0 && (
              <p className="text-[18px] text-[color:var(--gray)] mt-1">
                ({totalDays}+ days)
              </p>
            )}
          </div>

          {/* 3. Top right - Trend chart (spans 2 rows) */}
          <div className="card-soft row-span-2 flex flex-col px-8 py-6">
            <div className="flex-1 min-h-0 w-full">
              <TimeLoggedChart
                events={filteredEvents}
                title={isRevenue ? "Money Earned" : "Time Logged"}
                billingRates={br}
                viewMode={viewMode}
              />
            </div>
          </div>

          {/* 4. Bottom - Daily Average */}
          <div className="card-soft flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-card-title">{isRevenue ? "Daily Avg" : "Daily Average"}</h3>
            <div className="mt-4 text-number-large text-[color:var(--primary)]" style={revenueValueStyle}>
              {isRevenue ? formatCurrency(dailyAverageRevenue) : formatAsCompactHoursMinutes(dailyAverage)}
            </div>
          </div>

          {/* 5. Bottom - Weekly Average */}
          <div className="card-soft flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-card-title">{isRevenue ? "Weekly Avg" : "Weekly Average"}</h3>
            <div className="mt-4 text-number-large text-[color:var(--primary)]" style={revenueValueStyle}>
              {isRevenue ? formatCurrency(weeklyAverageRevenue) : formatAsCompactHoursMinutes(weeklyAverage)}
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
            <h3 className="text-card-title mb-4">{isRevenue ? "Earnings by Session Length" : "Activity Duration"}</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityDurationChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
            </div>
          </div>

          {/* 2. Average (spans 1 col, 1 row, middle column) */}
          <div className="card-soft">
            <h3 className="text-card-title">{isRevenue ? "Avg per Session" : "Average"}</h3>
            <div className="text-number-medium text-[color:var(--primary)]" style={revenueValueStyle}>
              {isRevenue
                ? formatCurrency(avgRevenuePerSession)
                : formatAsCompactHoursMinutes(activityStats.averageSessionMinutes)}
            </div>
          </div>

          {/* 3. Activity Scatter Line Chart (spans 2 rows, right column) - Hidden on mobile */}
          <div className="card-soft row-span-2 hidden md:flex flex-col px-3 py-3 activity-distribution-chart">
            <h3 className="text-card-title mb-4">{isRevenue ? "Earnings Distribution" : "Activity Distribution"}</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityScatterLineChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
            </div>
          </div>

          {/* 4. Longest (spans 1 col, 1 row, middle column, under Average) */}
          <div className="card-soft gap-0">
            <h3 className="text-card-title">{isRevenue ? "Session Maximum" : "Longest"}</h3>
            <div className="text-number-medium text-[color:var(--primary)]" style={revenueValueStyle}>
              {isRevenue
                ? highestEarningSession
                  ? formatCurrency(highestEarningSession.revenue)
                  : "N/A"
                : activityStats.longestSession
                  ? formatAsCompactHoursMinutes(activityStats.longestSession.minutes)
                  : "N/A"}
            </div>
            {((isRevenue && highestEarningSession) || (!isRevenue && activityStats.longestSession)) && (
              <p className="text-date">
                on {formatDate(isRevenue ? highestEarningSession!.date : activityStats.longestSession!.date)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Habits Section */}
      <section>
        <h2 className="text-section-header text-[color:var(--text-primary)]">
          Habits
        </h2>

        {/* grid of cards */}
        <div className="grid grid-cols-[2fr_400px] auto-rows-[400px] gap-3">
          {/* Prevalent Days */}
          <div className="card-soft flex flex-col px-6 py-4">
            <h3 className="text-card-title mb-2">{isRevenue ? "Revenue by Day" : "Prevalent Days"}</h3>
            <div className="flex-1 min-h-0 w-full">
              <ActivityDayOfWeekChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
            </div>
          </div>

          {/* Time of Day */}
          <div className="card-soft flex flex-col px-8 py-6">
            <h3 className="text-card-title mb-4">{isRevenue ? "Billable Hours" : "Time of Day"}</h3>
            <div className="flex-1 min-h-0 w-full">
              <TimeOfDayChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
            </div>
          </div>

          {/* Peak Month - Hide for Month filter */}
          {selectedFilter !== "Month" && (
            <div className="card-soft col-span-2 flex flex-col px-6 py-4">
              <h3 className="text-card-title mb-2">{isRevenue ? "Peak Revenue Month" : "Peak Month"}</h3>
              <div className="flex-1 min-h-0 w-full">
                <ActivityPeakMonthChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
}

