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

interface ActivityPeakMonthChartProps {
  events: CalendarEvent[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Custom label component for bars
const CustomLabel = ({ x, y, width, value }: any) => {
  if (value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#DB1E18"
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
    >
      {formatAsCompactHoursMinutes(value)}
    </text>
  );
};

export function ActivityPeakMonthChart({ events }: ActivityPeakMonthChartProps) {
  const chartData = useMemo(() => {
    // Initialize array for 12 months (January=0 to December=11)
    const monthTotals = new Array(12).fill(0);

    // Sum up minutes for each month
    events.forEach((event) => {
      const month = event.start.getMonth(); // 0-11 (Jan-Dec)
      monthTotals[month] += event.durationMinutes;
    });

    // Find max value for color normalization
    const maxValue = Math.max(...monthTotals, 1);

    // Convert to chart data format with color based on value
    return monthTotals.map((minutes, index) => {
      // Calculate color intensity (0 to 1) - more pronounced variation
      const intensity = maxValue > 0 ? minutes / maxValue : 0;
      
      // Create more pronounced color gradient: bright pink/light red to darker red
      const red = Math.floor(255 - (intensity * 60)); // 255 to 195
      const green = Math.floor(150 - (intensity * 120)); // 150 to 30
      const blue = Math.floor(150 - (intensity * 126)); // 150 to 24
      
      const color = `rgb(${red}, ${green}, ${blue})`;
      
      return {
        month: MONTH_NAMES[index],
        monthIndex: index,
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="month"
            stroke="#3B3C40"
            style={{ fontSize: '10px' }}
          />
          <YAxis
            stroke="#3B3C40"
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



