"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";
import { getPrimaryGradientColor } from "@/lib/colors";

interface ActivityDayOfWeekChartProps {
  events: CalendarEvent[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Custom label component for bars
const CustomLabel = ({ x, y, width, value }: any) => {
  if (value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="var(--primary)"
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {formatAsCompactHoursMinutes(value)}
    </text>
  );
};

export function ActivityDayOfWeekChart({ events }: ActivityDayOfWeekChartProps) {
  const chartData = useMemo(() => {
    // Initialize array for 7 days (Sunday=0 to Saturday=6)
    const dayTotals = new Array(7).fill(0);

    // Sum up minutes for each day of the week
    events.forEach((event) => {
      const dayOfWeek = event.dayOfWeek; // 0-6 (Sun-Sat)
      dayTotals[dayOfWeek] += event.durationMinutes;
    });

    // Find max value for color normalization
    const maxValue = Math.max(...dayTotals, 1);

    // Convert to chart data format with color based on value
    return dayTotals.map((minutes, index) => {
      // Calculate color intensity (0 to 1) - higher values = darker
      const intensity = maxValue > 0 ? minutes / maxValue : 0;
      
      // Use primary-based gradient (intensity 0 = lightest, 1 = darkest)
      const color = getPrimaryGradientColor(intensity);
      
      return {
        day: DAY_NAMES[index],
        dayIndex: index,
        minutes,
        color,
      };
    });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)] text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[120px] flex items-center">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 13, right: 0, left: 0, bottom: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="day"
            stroke="var(--chart-axis)"
            style={{ fontSize: '10px' }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            style={{ fontSize: '10px' }}
            tickFormatter={(value) => {
              if (value >= 60) {
                const hours = Math.floor(value / 60);
                return `${hours}h`;
              }
              return `${value}m`;
            }}
            width={35}
          />
          <Bar
            dataKey="minutes"
            radius={[3, 3, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

