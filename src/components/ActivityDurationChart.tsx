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

interface ActivityDurationChartProps {
  events: CalendarEvent[];
}

const DURATION_RANGES = [
  { label: "0-30m", min: 0, max: 30 },
  { label: "30m-1h", min: 30, max: 60 },
  { label: "1h-2h", min: 60, max: 120 },
  { label: "2h+", min: 120, max: Infinity },
];

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
      {value}
    </text>
  );
};

export function ActivityDurationChart({ events }: ActivityDurationChartProps) {
  const chartData = useMemo(() => {
    // Count activities in each duration range
    const rangeCounts = new Array(4).fill(0);

    events.forEach((event) => {
      const duration = event.durationMinutes;
      
      if (duration >= 0 && duration < 30) {
        rangeCounts[0]++;
      } else if (duration >= 30 && duration < 60) {
        rangeCounts[1]++;
      } else if (duration >= 60 && duration < 120) {
        rangeCounts[2]++;
      } else if (duration >= 120) {
        rangeCounts[3]++;
      }
    });

    // Find max value for color normalization
    const maxValue = Math.max(...rangeCounts, 1); // Avoid division by zero

    // Convert to chart data format with color based on value
    return rangeCounts.map((count, index) => {
      // Calculate color intensity (0 to 1) - more pronounced variation
      const intensity = maxValue > 0 ? count / maxValue : 0;
      
      // Create more pronounced color gradient: bright pink/light red to darker red
      // Lower values: brighter, more pink (higher RGB values)
      // Higher values: darker red (lower RGB values)
      const red = Math.floor(255 - (intensity * 60)); // 255 to 195 (bright to darker)
      const green = Math.floor(150 - (intensity * 120)); // 150 to 30 (pink to red)
      const blue = Math.floor(150 - (intensity * 126)); // 150 to 24 (pink to red)
      
      const color = `rgb(${red}, ${green}, ${blue})`;
      
      return {
        range: DURATION_RANGES[index].label,
        count,
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
          margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="range"
            stroke="#3B3C40"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#3B3C40"
            style={{ fontSize: '12px' }}
            width={30}
            tick={{ fontSize: 12 }}
            axisLine={false}
          />
          <Bar
            dataKey="count"
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


