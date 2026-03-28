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

interface DayOfWeekChartProps {
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
      fontSize={12}
      fontWeight={600}
    >
      {formatAsCompactHoursMinutes(value)}
    </text>
  );
};

export function DayOfWeekChart({ events }: DayOfWeekChartProps) {
  const chartData = useMemo(() => {
    // Initialize array for 7 days (Sunday=0 to Saturday=6)
    const dayTotals = new Array(7).fill(0);

    // Sum up minutes for each day of the week
    events.forEach((event) => {
      const dayOfWeek = event.dayOfWeek; // 0-6 (Sun-Sat)
      dayTotals[dayOfWeek] += event.durationMinutes;
    });

    // Find max value for color normalization
    const maxValue = Math.max(...dayTotals, 1); // Avoid division by zero

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
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px] flex items-center">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="day"
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => {
              if (value >= 60) {
                const hours = Math.floor(value / 60);
                return `${hours}h`;
              }
              return `${value}m`;
            }}
          />
          <Bar
            dataKey="minutes"
            radius={[4, 4, 0, 0]}
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

