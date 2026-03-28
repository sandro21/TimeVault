"use client";

import { useFilter } from "@/contexts/FilterContext";
import { CalendarEvent } from "@/lib/calculations/stats";
import {
  computeGlobalStats,
  computeTopActivities,
  formatAsDaysHoursMinutes,
  formatAsHoursMinutes,
  formatAsMinutes,
  formatAsCompactHoursMinutes,
} from "@/lib/calculations/stats";
import { filterEventsByTimeRange } from "@/lib/calculations/filter-events";
import { ActivityPieChart } from "@/components/ActivityPieChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import { TopActivitiesChart } from "@/components/TopActivitiesChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { EventTimelineChart } from "@/components/EventTimelineChart";

interface DashboardClientProps {
  events: CalendarEvent[];
}

export function DashboardClient({ events }: DashboardClientProps) {
  const {
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate,
  } = useFilter();

  // Filter events by time range
  const filteredEvents = filterEventsByTimeRange(
    events,
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate
  );

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

  const timeDaysHoursMinutes = formatAsDaysHoursMinutes(stats.totalMinutes);
  const timeHoursMinutes = formatAsHoursMinutes(stats.totalMinutes);
  const timeMinutes = formatAsMinutes(stats.totalMinutes);

  return (
    <>
      {/* All Loging Details Class */}
      <section className="space-y-[60px]">
        <section className="space-y-[40px]">
          {/* header */}
          <h2 className="text-section-header text-black mb-4">
            All Logging Details
          </h2>

          {/* grid of cards */}
          <div className="grid grid-cols-[200px_200px_1fr] auto-rows-[200px] gap-3">
            {/* Total Activities */}
            <div className="card-soft flex flex-col items-center justify-center text-center px-6">
              <h3 className="text-card-title text-black">Total Activities</h3>
              <div className="mt-4 text-number-large text-[color:var(--red-1)]">
                {stats.totalCount}
              </div>
            </div>

            {/* Different Activities */}
            <div className="card-soft flex flex-col items-center justify-center text-center px-6">
              <h3 className="text-card-title text-black">Different Activities</h3>
              <div className="mt-4 text-number-large text-[color:var(--red-1)]">
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
              <h3 className="text-card-title text-black mb-2">Time Logged</h3>
              <p className="text-body-24 text-[color:var(--red-1)]">
                {timeDaysHoursMinutes}
              </p>
              <p className="text-body-24 text-[color:var(--red-2)]">
                {timeHoursMinutes}
              </p>
              <p className="text-body-24 text-black">
                {timeMinutes}
              </p>
            </div>
          </div>
        </section>

        {/* Habits */}
        <section className="space-y-[40px]">
          {/* header */}
          <h2 className="text-section-header text-black mb-4">
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

        {/* Top Activities */}
        <section className="space-y-[40px]">
          {/* header */}
          <h2 className="text-section-header text-black mb-4">
            Top Activities
          </h2>

          {/* grid of cards */}
          <div className="grid grid-cols-[3fr_2fr] grid-rows-[300px_300px] gap-3">
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
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[%]">Longest</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topActivities.map((activity, index) => {
                      const colors = [
                        'text-[#DB1E18]', // Red
                        'text-[#3B82F6]', // Blue
                        'text-[#10B981]', // Green
                        'text-[#A855F7]', // Purple
                        'text-[#F97316]', // Orange
                        'text-[#EC4899]', // Pink
                        'text-[#14B8A6]', // Teal
                        'text-[#F59E0B]', // Amber
                        'text-[#8B5CF6]', // Violet
                        'text-[#EF4444]', // Light Red
                      ];
                      const rowColor = colors[index] || 'text-[#F97316]';
                      
                      return (
                        <tr key={activity.name} className="text-body-24 border-b border-[color:var(--gray)]/10 last:border-0 text-left">
                          <td className={`py-2 text-body-24 font-semibold pr-4 truncate text-left ${rowColor}`} title={activity.name}>
                            {index + 1}. {activity.name}
                          </td>
                          <td className={`py-2 text-body-24 text-left ${rowColor}`}>
                            {formatAsCompactHoursMinutes(activity.totalMinutes)}
                          </td>
                          <td className={`py-2 text-body-24 text-left ${rowColor}`}>
                            {activity.count}
                          </td>
                          <td className={`py-2 text-body-24 text-left ${rowColor}`}>
                            {formatAsCompactHoursMinutes(activity.averageSessionMinutes)}
                          </td>
                          <td className={`py-2 text-body-24 text-left ${rowColor}`}>
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
            <div className="card-soft flex flex-col">
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

        {/* Event Timeline */}
        <section className="space-y-[40px]">
          <h2 className="text-section-header text-black mb-4">
            Event Timeline
          </h2>
          <div className="card-soft flex flex-col px-8 py-6">
            <div className="flex-1 min-h-0 w-full" style={{ minHeight: '500px' }}>
              <EventTimelineChart events={filteredEvents} />
            </div>
          </div>
        </section>
      </section>
    </>
  );
}

