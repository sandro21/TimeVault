"use client";

import { useRouter } from "next/navigation";
import { useFilter } from "@/contexts/FilterContext";
import { CalendarEvent } from "@/lib/calculations/stats";
import {
  computeGlobalStats,
  computeTopActivities,
  formatAsCompactHoursMinutes,
} from "@/lib/calculations/stats";
import { filterEventsByTimeRange } from "@/lib/calculations/filter-events";
import { filterHiddenEvents } from "@/lib/calculations/filter-hidden";
import { useEvents } from "@/contexts/EventsContext";
import { ActivityPieChart } from "@/components/ActivityPieChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import { TopActivitiesChart } from "@/components/TopActivitiesChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { EventTimelineChart } from "@/components/EventTimelineChart";
import { ActivityBreadcrumbSearchWrapper } from "@/components/ActivityBreadcrumbSearchWrapper";

interface DashboardClientProps {
  events: CalendarEvent[];
}

export function DashboardClient({ events }: DashboardClientProps) {
  const router = useRouter();
  const {
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate,
  } = useFilter();
  // Filter events by time range
  const timeFilteredEvents = filterEventsByTimeRange(
    events,
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate
  );
  
  // Filter out hidden activities/issues for statistics
  const filteredEvents = filterHiddenEvents(timeFilteredEvents);
  
  // Use all events (not filtered by hidden) for the breadcrumb search
  const allEventsForSearch = timeFilteredEvents;

  const stats = computeGlobalStats(filteredEvents);
  const topActivities = computeTopActivities(filteredEvents, "time", 10);
  const topActivitiesForChart = computeTopActivities(filteredEvents, "time", 10);

  // Calculate "Other" category (all activities not in top 10)
  const top10TotalMinutes = topActivitiesForChart.reduce((sum, activity) => sum + activity.totalMinutes, 0);
  const otherMinutes = stats.totalMinutes - top10TotalMinutes;

  // Prepare pie chart data
  const pieChartData = [
    ...topActivitiesForChart.map((activity) => ({
      name: activity.name,
      value: activity.totalMinutes,
    })),
    ...(otherMinutes > 0 ? [{ name: "Other", value: otherMinutes }] : []),
  ];

  // Calculate days for parentheses
  const totalDays = Math.floor(stats.totalMinutes / (24 * 60));
  
  // Calculate total hours and minutes (not remaining after days)
  const totalHours = Math.floor(stats.totalMinutes / 60);
  const minutes = stats.totalMinutes % 60;
  
  const timeHoursMinutesFormatted = totalHours > 0 
    ? `${totalHours} Hour${totalHours !== 1 ? "s" : ""}, ${minutes} Minute${minutes !== 1 ? "s" : ""}`
    : `${minutes} Minute${minutes !== 1 ? "s" : ""}`;

  return (
    <>
      {/* Activity Breadcrumb Search */}
      <ActivityBreadcrumbSearchWrapper events={allEventsForSearch} />

      {/* All Sections Grouped */}
      <div className="sections-container">
        {/* All Logging Details - NO TITLE */}
        <section>
          {/* grid of cards */}
          <div className="grid grid-cols-[200px_200px_1fr] auto-rows-[200px] gap-3">
            {/* Total Activities */}
            <div className="card-soft flex flex-col items-center justify-center text-center px-6">
              <h3 className="text-card-title">Total Activities</h3>
              <div className="mt-4 text-number-large text-[color:var(--primary)]">
                {stats.totalCount}
              </div>
            </div>

            {/* Different Activities */}
            <div className="card-soft flex flex-col items-center justify-center text-center px-6">
              <h3 className="text-card-title">Different Activities</h3>
              <div className="mt-4 text-number-large text-[color:var(--primary)]">
                {stats.uniqueActivities}
              </div>
            </div>

            {/* Right big card – Logging Progress Chart */}
            <div className="card-soft row-span-2 flex flex-col px-8 py-6 text-left">
              <div className="flex-1 min-h-0 w-full">
                <TimeLoggedChart events={filteredEvents} title="Logging Progress" />
              </div>
            </div>

            {/* Time Logged */}
            <div className="card-soft col-span-2 flex flex-col items-center justify-center text-center px-8">
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
          </div>
        </section>

        {/* Top Activities */}
        <section>
          {/* header */}
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Top Activities
          </h2>

          {/* grid of cards */}
          <div className="grid grid-cols-[5fr_2fr] grid-rows-[300px_300px] gap-3">
            {/* Top Activities Table */}
            <div className="card-soft flex flex-col px-8 py-4 text-left">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <table className="table-fixed w-full">
                  <thead>
                    <tr className="border-b border-[color:var(--gray)]/20 text-left">
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[33%] pr-4">Name</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[20%] pr-4">Duration</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[15%] pr-4">Count</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[18%] pr-4">Avg</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[%] hidden md:table-cell">Longest</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topActivities.map((activity, index) => {
                      const colorVars = [
                        '--chart-color-1',
                        '--chart-color-2',
                        '--chart-color-3',
                        '--chart-color-4',
                        '--chart-color-5',
                        '--chart-color-6',
                        '--chart-color-7',
                        '--chart-color-8',
                        '--chart-color-9',
                        '--chart-color-10',
                      ];
                      const colorVar = colorVars[index] || '--chart-color-5';
                      const rowColorStyle = { color: `var(${colorVar})` };
                      
                      const handleActivityClick = () => {
                        router.push(`/activity?search=${encodeURIComponent(activity.name)}&type=event`);
                      };
                      
                      return (
                        <tr 
                          key={activity.name} 
                          onClick={handleActivityClick}
                          className="text-body-24 border-b border-[color:var(--gray)]/10 last:border-0 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-2 text-body-24 font-semibold pr-4 truncate text-left" style={rowColorStyle} title={activity.name}>
                            {index + 1}. {activity.name}
                          </td>
                          <td className="py-2 text-body-24 text-left" style={rowColorStyle}>
                            {formatAsCompactHoursMinutes(activity.totalMinutes)}
                          </td>
                          <td className="py-2 text-body-24 text-left" style={rowColorStyle}>
                            {activity.count}
                          </td>
                          <td className="py-2 text-body-24 text-left" style={rowColorStyle}>
                            {formatAsCompactHoursMinutes(activity.averageSessionMinutes)}
                          </td>
                          <td className="py-2 text-body-24 text-left hidden md:table-cell" style={rowColorStyle}>
                            {formatAsCompactHoursMinutes(activity.longestSessionMinutes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="card-soft flex flex-col pie-chart-container">
              <ActivityPieChart data={pieChartData} />
            </div>

            {/* Bottom element spanning 2 columns - Top Activities Over Time */}
            <div className="card-soft row-span-2 col-span-2 flex flex-col px-8 py-6 text-left">
              <h3 className="text-card-title mb-4">Top Activities Over Time</h3>
              <div className="flex-1 min-h-0 w-full">
                <TopActivitiesChart events={filteredEvents} topActivities={topActivitiesForChart} />
              </div>
            </div>
          </div>
        </section>

        {/* Habits */}
        <section>
          {/* header */}
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Habits
          </h2>

          {/* grid of cards */}
          <div className="grid grid-cols-[2fr_1fr] auto-rows-[310px-280px] gap-3">
            {/* Left side - Top card */}
            <div className="card-soft flex flex-col px-8 py-6">
              <h3 className="text-card-title mb-4">Day of Week</h3>
              <div className="flex-1 min-h-0 w-full">
                <DayOfWeekChart events={filteredEvents} />
              </div>
            </div>

            {/* Right side - Square card spanning 2 rows */}
            <div className="card-soft row-span-2 flex flex-col px-8 py-6">
              <h3 className="text-card-title mb-4">Time of Day</h3>
              <div className="flex-1 min-h-0 w-full">
                <TimeOfDayChart events={filteredEvents} />
              </div>
            </div>

            {/* Left side - Bottom card */}
            <div className="card-soft flex flex-col px-3 py-3">
              <h3 className="text-card-title mb-4">Activity Duration</h3>
              <div className="flex-1 min-h-0 w-full">
                <ActivityDurationChart events={filteredEvents} />
              </div>
            </div>
          </div>
        </section>

        {/* Event Timeline - Hidden on mobile */}
        <section className="hidden md:block">
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Event Timeline
          </h2>
          <div className="card-soft flex flex-col px-8 py-6">
            <div className="flex-1 min-h-0 w-full" style={{ minHeight: '500px' }}>
              <EventTimelineChart events={filteredEvents} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

