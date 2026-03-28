"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";

interface ActivityScatterLineChartProps {
  events: CalendarEvent[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonth = (month: number): string => MONTH_NAMES[month] || '';

// Helper: Format day key (YYYY-MM-DD)
const getDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Get week start (Monday) for a date
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

interface WeekData {
  date: string; // First day of week (Monday)
  averageMinutes: number;
  monthLabel: string;
}

interface ScatterPoint {
  date: string;
  minutes: number;
}

export function ActivityScatterLineChart({ events }: ActivityScatterLineChartProps) {
  const [clickedPoint, setClickedPoint] = useState<{ x: number; y: number; data: any } | null>(null);

  const { lineData, scatterData, allDays, monthLabels } = useMemo(() => {
    // Filter out future events (cutoff at today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const filteredEvents = events.filter(event => event.start <= today);
    
    if (filteredEvents.length === 0) {
      return { lineData: [] as WeekData[], scatterData: [] as ScatterPoint[], allDays: [] as string[], monthLabels: new Map<string, string>() };
    }

    // Group events by week for line (weekly averages)
    const eventsByWeek = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const weekStart = getWeekStart(event.start);
      const weekKey = getDayKey(weekStart);
      const weekEvents = eventsByWeek.get(weekKey) || [];
      weekEvents.push(event);
      eventsByWeek.set(weekKey, weekEvents);
    });

    // Get date range for generating all days
    const allDates = filteredEvents.map(e => e.start);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.min(...allDates.map(d => d.getTime()).filter(t => t <= today.getTime())));
    // Ensure maxDate doesn't exceed today
    if (maxDate > today) {
      maxDate.setTime(today.getTime());
    }
    
    // Generate all days in range for x-axis
    const allDaysList: string[] = [];
    const monthLabelsMap = new Map<string, string>();
    const currentDay = new Date(minDate);
    currentDay.setHours(0, 0, 0, 0);
    const maxDateEnd = new Date(maxDate);
    maxDateEnd.setHours(0, 0, 0, 0);
    
    let prevMonth = -1;
    let prevYear = -1;
    while (currentDay <= maxDateEnd) {
      const dayKey = getDayKey(currentDay);
      allDaysList.push(dayKey);
      
      // Track month labels (first day of each month)
      const [year, month] = dayKey.split('-').map(Number);
      if (prevMonth === -1 || prevMonth !== month || prevYear !== year) {
        monthLabelsMap.set(dayKey, formatMonth(month - 1));
        prevMonth = month;
        prevYear = year;
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Build line data: one entry per week (on Monday of each week)
    const lineData: WeekData[] = [];
    const processedWeeks = new Set<string>();
    
    allDaysList.forEach((dayKey) => {
      const date = new Date(dayKey + 'T00:00:00');
      const weekStart = getWeekStart(date);
      const weekKey = getDayKey(weekStart);
      
      // Only process each week once (on its Monday)
      if (!processedWeeks.has(weekKey) && dayKey === weekKey) {
        processedWeeks.add(weekKey);
        const weekEvents = eventsByWeek.get(weekKey) || [];
        
        // Calculate weekly average
        const totalMinutes = weekEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
        const averageMinutes = weekEvents.length > 0 ? totalMinutes / weekEvents.length : 0;
        
        const [year, month] = weekKey.split('-').map(Number);
        const monthLabel = monthLabelsMap.get(weekKey) || '';
        
        lineData.push({
          date: weekKey,
          averageMinutes,
          monthLabel,
        });
      }
    });

    // Build scatter data: one entry per event (daily)
    const scatterData: ScatterPoint[] = filteredEvents.map((event) => ({
      date: getDayKey(event.start),
      minutes: event.durationMinutes,
    }));

    return { lineData, scatterData, allDays: allDaysList, monthLabels: monthLabelsMap };
  }, [events]);

  // Get indices where month labels exist
  const monthTickIndices = useMemo(() => {
    return allDays
      .map((dayKey, index) => monthLabels.has(dayKey) ? index : -1)
      .filter(index => index !== -1);
  }, [allDays, monthLabels]);

  // Custom X-axis tick (only show month labels on first day of month)
  const CustomTick = ({ x, y, payload }: any) => {
    // payload.value is the index, find the corresponding date
    const dayKey = allDays[payload.value];
    if (!dayKey) return null;
    
    const label = monthLabels.get(dayKey) || '';
    if (!label) return null;
    
    return (
      <text x={x} y={y + 15} fill="var(--chart-axis)" fontSize={12} textAnchor="middle">
        {label}
      </text>
    );
  };


  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  // Group scatter points by day (multiple events can occur on same day)
  const scatterByDay = new Map<string, number[]>();
  scatterData.forEach((point) => {
    const dayScatters = scatterByDay.get(point.date) || [];
    dayScatters.push(point.minutes);
    scatterByDay.set(point.date, dayScatters);
  });

  // Combine data: one entry per day with both line and scatter data
  // Use index for x-axis positioning to ensure proper alignment
  const chartData = allDays.map((dayKey, index) => {
    const lineEntry = lineData.find(d => d.date === dayKey);
    const dayScatters = scatterByDay.get(dayKey) || [];
    
    return {
      date: dayKey,
      index, // Numeric index for x-axis
      averageMinutes: lineEntry?.averageMinutes ?? null,
      minutes: dayScatters.length > 0 ? dayScatters[0] : null,
    };
  });
  
  // Add additional scatter entries for days with multiple events
  scatterData.forEach((scatterPoint) => {
    const dayIndex = allDays.indexOf(scatterPoint.date);
    const dayScatters = scatterByDay.get(scatterPoint.date) || [];
    
    // Only add if this is not the first event on this day
    if (dayScatters.length > 1 && dayScatters.indexOf(scatterPoint.minutes) > 0) {
      chartData.push({
        date: scatterPoint.date,
        index: dayIndex,
        averageMinutes: null,
        minutes: scatterPoint.minutes,
      });
    }
  });
  
  // Sort by index to ensure proper ordering
  chartData.sort((a, b) => a.index - b.index);

  return (
    <div className="w-full h-full relative" onClick={() => setClickedPoint(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="index"
            type="number"
            scale="linear"
            tick={<CustomTick />}
            ticks={monthTickIndices}
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
            tickFormatter={formatAsCompactHoursMinutes}
          />
          {/* Scatter first (rendered below) */}
          <Scatter
            dataKey="minutes"
            xAxisId={0}
            fill="var(--primary)"
            fillOpacity={0.6}
            shape={(props: any) => {
              if (!props.cx || !props.cy || !props.payload || props.payload.minutes === null) {
                return <g />;
              }
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={2}
                  fill="var(--primary)"
                  fillOpacity={0.6}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setClickedPoint({
                      x: props.cx,
                      y: props.cy,
                      data: props.payload,
                    });
                  }}
                />
              );
            }}
          />
          {/* Line last (rendered on top, non-interactive) */}
          <Line
            type="monotone"
            dataKey="averageMinutes"
            xAxisId={0}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Click tooltip */}
      {clickedPoint && clickedPoint.data && (
        <div
          className="absolute bg-white/70 backdrop-blur-sm border border-gray-200/30 rounded-xl p-2 shadow-lg z-10 pointer-events-none"
          style={{
            left: `${clickedPoint.x - 85}px`,
            top: `${clickedPoint.y - 50}px`,
          }}
        >
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            {(() => {
              const [year, month, day] = clickedPoint.data.date.split('-').map(Number);
              return `${formatMonth(month - 1)} ${day}, ${year}`;
            })()}
          </p>
          <p className="text-sm text-[color:var(--primary)]">
            {formatAsCompactHoursMinutes(clickedPoint.data.minutes)}
          </p>
        </div>
      )}
    </div>
  );
}
