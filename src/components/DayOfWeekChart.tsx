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
      fill="#DB1E18"
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
      // Calculate color intensity (0 to 1) - more pronounced variation
      const intensity = maxValue > 0 ? minutes / maxValue : 0;
      
      // Create more pronounced color gradient: bright pink/light red to darker red
      // Lower values: brighter, more pink (higher RGB values)
      // Higher values: darker red (lower RGB values)
      const red = Math.floor(255 - (intensity * 60)); // 255 to 195 (bright to darker)
      const green = Math.floor(150 - (intensity * 120)); // 150 to 30 (pink to red)
      const blue = Math.floor(150 - (intensity * 126)); // 150 to 24 (pink to red)
      
      const color = `rgb(${red}, ${green}, ${blue})`;
      
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="day"
            stroke="#3B3C40"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#3B3C40"
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

