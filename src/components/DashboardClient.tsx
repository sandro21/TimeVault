"use client";

import { useMemo, useState } from "react";
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
import { usePro } from "@/contexts/ProContext";
import { ActivityPieChart } from "@/components/ActivityPieChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import type { DashboardViewMode } from "@/components/TimeLoggedChart";
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
  const { isPro, billingRates } = usePro();
  const [viewMode, setViewMode] = useState<DashboardViewMode>("time");
  const isRevenue = isPro && viewMode === "revenue";

  const timeFilteredEvents = filterEventsByTimeRange(
    events,
    selectedFilter,
    currentYear,
    currentMonth,
    minDate,
    maxDate
  );

  const filteredEvents = filterHiddenEvents(timeFilteredEvents);
  const allEventsForSearch = timeFilteredEvents;

  const stats = computeGlobalStats(filteredEvents);
  const topActivitiesBase = useMemo(
    () => computeTopActivities(filteredEvents, "time", 10),
    [filteredEvents]
  );
  // Revenue view: keep existing computed metrics, just sort by revenue.
  const topActivities = useMemo(() => {
    if (!isRevenue) return topActivitiesBase;
    return [...topActivitiesBase].sort((a, b) => {
      const ra = (a.totalMinutes / 60) * (billingRates[a.name] ?? 0);
      const rb = (b.totalMinutes / 60) * (billingRates[b.name] ?? 0);
      return rb - ra;
    });
  }, [isRevenue, topActivitiesBase, billingRates]);
  const topActivitiesForChart = useMemo(() => {
    if (!isRevenue) return computeTopActivities(filteredEvents, "time", 10);

    // Pick top 10 activities by revenue (hours * rate)
    const minutesByName = new Map<string, number>();
    const revenueByName = new Map<string, number>();
    for (const e of filteredEvents) {
      const minutes = (minutesByName.get(e.title) ?? 0) + e.durationMinutes;
      minutesByName.set(e.title, minutes);
      const rate = billingRates[e.title] ?? 0;
      revenueByName.set(e.title, (revenueByName.get(e.title) ?? 0) + (e.durationMinutes / 60) * rate);
    }
    return Array.from(minutesByName.entries())
      .map(([name, totalMinutes]) => ({ name, totalMinutes, revenue: revenueByName.get(name) ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(({ name, totalMinutes }) => ({ name, totalMinutes }));
  }, [isRevenue, filteredEvents, billingRates]);

  const top10TotalMinutes = topActivitiesForChart.reduce((sum, a) => sum + a.totalMinutes, 0);
  const otherMinutes = stats.totalMinutes - top10TotalMinutes;

  const pieChartData = useMemo(() => {
    if (isRevenue) {
      const items = topActivitiesForChart.map((a) => ({
        name: a.name,
        value: (a.totalMinutes / 60) * (billingRates[a.name] ?? 0),
      }));
      const otherRev = filteredEvents.reduce((sum, e) => {
        if (topActivitiesForChart.some((t) => t.name === e.title)) return sum;
        return sum + (e.durationMinutes / 60) * (billingRates[e.title] ?? 0);
      }, 0);
      return [...items, ...(otherRev > 0 ? [{ name: "Other", value: otherRev }] : [])];
    }
    return [
      ...topActivitiesForChart.map((a) => ({ name: a.name, value: a.totalMinutes })),
      ...(otherMinutes > 0 ? [{ name: "Other", value: otherMinutes }] : []),
    ];
  }, [isRevenue, topActivitiesForChart, filteredEvents, billingRates, otherMinutes]);

  const totalDays = Math.floor(stats.totalMinutes / (24 * 60));
  const totalHours = Math.floor(stats.totalMinutes / 60);
  const minutes = stats.totalMinutes % 60;

  const timeHoursMinutesFormatted =
    totalHours > 0
      ? `${totalHours} Hour${totalHours !== 1 ? "s" : ""}, ${minutes} Minute${minutes !== 1 ? "s" : ""}`
      : `${minutes} Minute${minutes !== 1 ? "s" : ""}`;

  const activityRevenue = useMemo(() => {
    if (!isPro) return {};
    const map: Record<string, number> = {};
    for (const a of topActivities) {
      const rate = billingRates[a.name] ?? 0;
      map[a.name] = (a.totalMinutes / 60) * rate;
    }
    return map;
  }, [isPro, topActivities, billingRates]);

  const totalUnbilledRevenue = useMemo(() => {
    if (!isPro) return 0;
    return filteredEvents.reduce((sum, e) => {
      const rate = billingRates[e.title] ?? 0;
      return sum + (e.durationMinutes / 60) * rate;
    }, 0);
  }, [isPro, filteredEvents, billingRates]);

  const proMetrics = useMemo(() => {
    if (!isPro) return null;
    let billableMinutes = 0;
    let nonBillableMinutes = 0;
    for (const e of filteredEvents) {
      const rate = billingRates[e.title] ?? 0;
      if (rate > 0) billableMinutes += e.durationMinutes;
      else nonBillableMinutes += e.durationMinutes;
    }
    const billableHours = billableMinutes / 60;
    const avgRate = billableHours > 0 ? totalUnbilledRevenue / billableHours : 0;

    let topEarnerName = "—";
    let topEarnerRevenue = 0;
    for (const a of topActivities) {
      const rev = activityRevenue[a.name] ?? 0;
      if (rev > topEarnerRevenue) {
        topEarnerRevenue = rev;
        topEarnerName = a.name;
      }
    }

    return { avgRate, billableHours, nonBillableHours: nonBillableMinutes / 60, topEarnerName, topEarnerRevenue };
  }, [isPro, filteredEvents, billingRates, totalUnbilledRevenue, topActivities, activityRevenue]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const br = isPro ? billingRates : undefined;
  const billableStats = useMemo(() => {
    if (!isPro) return { billableHours: 0, billableActivities: 0 };
    let billableMinutes = 0;
    const names = new Set<string>();
    for (const e of filteredEvents) {
      const rate = billingRates[e.title] ?? 0;
      if (rate > 0) {
        billableMinutes += e.durationMinutes;
        names.add(e.title);
      }
    }
    return { billableHours: billableMinutes / 60, billableActivities: names.size };
  }, [isPro, filteredEvents, billingRates]);

  return (
    <>
      <div className="flex items-center justify-between">
        <ActivityBreadcrumbSearchWrapper events={allEventsForSearch} />

        {isPro && (
          <div className="flex shrink-0 items-center rounded-full bg-black/[0.04] p-0.5 text-[13px] font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("time")}
              className={`rounded-full px-3 py-1 transition-colors ${viewMode === "time" ? "bg-white shadow-sm text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)]"}`}
            >
              Time &amp; Productivity
            </button>
            <button
              type="button"
              onClick={() => setViewMode("revenue")}
              className={`rounded-full px-3 py-1 transition-colors ${viewMode === "revenue" ? "bg-white shadow-sm text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)]"}`}
            >
              Revenue &amp; Financials
            </button>
          </div>
        )}
      </div>

      <div className="sections-container">
        {/* ---- Summary cards ---- */}
        <section>
          <div className="grid grid-cols-[200px_200px_1fr] auto-rows-[200px] gap-3">
            {isRevenue ? (
              <>
                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Billable Activities</h3>
                  <div className="mt-4 text-number-medium" style={{ color: "#16a34a" }}>
                    {billableStats.billableActivities}
                  </div>
                </div>

                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Billable Hours</h3>
                  <div className="mt-4 text-number-medium" style={{ color: "#16a34a" }}>
                    {Math.round(billableStats.billableHours)}h
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Total Activities</h3>
                  <div className="mt-4 text-number-large text-[color:var(--primary)]">
                    {stats.totalCount}
                  </div>
                </div>

                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Different Activities</h3>
                  <div className="mt-4 text-number-large text-[color:var(--primary)]">
                    {stats.uniqueActivities}
                  </div>
                </div>
              </>
            )}

            <div className="card-soft row-span-2 flex flex-col px-8 py-6 text-left">
              <div className="flex-1 min-h-0 w-full">
                <TimeLoggedChart
                  events={filteredEvents}
                  title={isRevenue ? "Revenue Progress" : "Logging Progress"}
                  billingRates={br}
                  viewMode={viewMode}
                />
              </div>
            </div>

            {isRevenue ? (
              <>
                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Total Revenue</h3>
                  <div className="mt-4 text-number-medium" style={{ color: "#16a34a" }}>
                    {formatCurrency(totalUnbilledRevenue)}
                  </div>
                </div>

                <div className="card-soft flex flex-col items-center justify-center text-center px-6">
                  <h3 className="text-card-title">Avg Hourly Rate</h3>
                  <div className="mt-4 text-number-medium" style={{ color: "#16a34a" }}>
                    {formatCurrency(proMetrics?.avgRate ?? 0)}/hr
                  </div>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </section>

        {/* ---- Top Activities ---- */}
        <section>
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Top Activities
          </h2>

          <div className="grid grid-cols-[5fr_2fr] grid-rows-[300px_300px] gap-3">
            <div className="card-soft flex flex-col px-8 py-4 text-left">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <table className="table-fixed w-full">
                  <thead>
                    <tr className="border-b border-[color:var(--gray)]/20 text-left">
                      <th className={`pb-1 text-left text-body-24 text-[color:var(--gray)] ${isPro ? "w-[28%]" : "w-[33%]"} pr-4`}>Name</th>
                      <th className={`pb-1 text-left text-body-24 text-[color:var(--gray)] ${isPro ? "w-[16%]" : "w-[20%]"} pr-4`}>Duration</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[12%] pr-4">Count</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[15%] pr-4">Avg</th>
                      <th className="pb-1 text-left text-body-24 text-[color:var(--gray)] w-[%] hidden md:table-cell">Longest</th>
                      {isPro && (
                        <th className="pb-1 text-left text-body-24 w-[14%] pr-4" style={{ color: "#16a34a" }}>Revenue</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {topActivities.map((activity, index) => {
                      const colorVars = [
                        '--chart-color-1', '--chart-color-2', '--chart-color-3',
                        '--chart-color-4', '--chart-color-5', '--chart-color-6',
                        '--chart-color-7', '--chart-color-8', '--chart-color-9',
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
                          {isPro && (
                            <td className="py-2 text-body-24 text-left font-semibold" style={{ color: "#16a34a" }}>
                              {formatCurrency(activityRevenue[activity.name] ?? 0)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-soft flex flex-col pie-chart-container">
              <ActivityPieChart data={pieChartData} isRevenue={isRevenue} />
            </div>

            <div className="card-soft row-span-2 col-span-2 flex flex-col px-8 py-6 text-left">
              <h3 className="text-card-title mb-4">Top Activities Over Time</h3>
              <div className="flex-1 min-h-0 w-full">
                <TopActivitiesChart
                  events={filteredEvents}
                  topActivities={topActivitiesForChart}
                  billingRates={br}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---- Habits ---- */}
        <section>
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Habits
          </h2>

          <div className="grid grid-cols-[2fr_1fr] auto-rows-[310px-280px] gap-3">
            <div className="card-soft flex flex-col px-8 py-6">
              <h3 className="text-card-title mb-4">{isRevenue ? "Revenue by Day" : "Day of Week"}</h3>
              <div className="flex-1 min-h-0 w-full">
                <DayOfWeekChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
              </div>
            </div>

            <div className="card-soft row-span-2 flex flex-col px-8 py-6">
              <h3 className="text-card-title mb-4">{isRevenue ? "Billable Hours" : "Time of Day"}</h3>
              <div className="flex-1 min-h-0 w-full">
                <TimeOfDayChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
              </div>
            </div>

            <div className="card-soft flex flex-col px-3 py-3">
              <h3 className="text-card-title mb-4">{isRevenue ? "Avg Earnings / Session" : "Activity Duration"}</h3>
              <div className="flex-1 min-h-0 w-full">
                <ActivityDurationChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
              </div>
            </div>
          </div>
        </section>

        {/* ---- Event Timeline ---- */}
        <section className="hidden md:block">
          <h2 className="text-section-header text-[color:var(--text-primary)] mb-4">
            Event Timeline
          </h2>
          <div className="card-soft flex flex-col px-8 py-6">
            <div className="flex-1 min-h-0 w-full" style={{ minHeight: '500px' }}>
              <EventTimelineChart events={filteredEvents} billingRates={br} viewMode={viewMode} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
