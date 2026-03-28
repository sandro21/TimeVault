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

import type { DashboardViewMode } from "@/components/TimeLoggedChart";

interface ActivityDurationChartProps {
  events: CalendarEvent[];
  billingRates?: Record<string, number>;
  viewMode?: DashboardViewMode;
}

const DURATION_RANGES = [
  { label: "0-30m", min: 0, max: 30 },
  { label: "30m-1h", min: 30, max: 60 },
  { label: "1h-2h", min: 60, max: 120 },
  { label: "2h+", min: 120, max: Infinity },
];

export function ActivityDurationChart({ events, billingRates, viewMode = "time" }: ActivityDurationChartProps) {
  const isRevenue = !!billingRates && viewMode === "revenue";

  const chartData = useMemo(() => {
    const rangeCounts = new Array(4).fill(0);
    const rangeRevenue = new Array(4).fill(0);

    events.forEach((event) => {
      const duration = event.durationMinutes;
      const rate = billingRates?.[event.title] ?? 0;
      const rev = (duration / 60) * rate;
      let idx = -1;
      if (duration >= 0 && duration < 30) idx = 0;
      else if (duration >= 30 && duration < 60) idx = 1;
      else if (duration >= 60 && duration < 120) idx = 2;
      else if (duration >= 120) idx = 3;
      if (idx >= 0) {
        rangeCounts[idx]++;
        rangeRevenue[idx] += rev;
      }
    });

    const values = isRevenue
      ? rangeCounts.map((c, i) => (c > 0 ? Math.round(rangeRevenue[i] / c) : 0))
      : rangeCounts;

    const maxValue = Math.max(...values, 1);

    return values.map((value, index) => {
      const intensity = maxValue > 0 ? value / maxValue : 0;
      return {
        range: DURATION_RANGES[index].label,
        count: value,
        color: isRevenue ? `rgba(22, 163, 74, ${0.2 + intensity * 0.8})` : getPrimaryGradientColor(intensity),
      };
    });
  }, [events, isRevenue, billingRates]);

  const CustomLabel = ({ x, y, width, value }: any) => {
    if (value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill={isRevenue ? "#16a34a" : "var(--primary)"}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
      >
        {isRevenue ? `$${value}` : value}
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

  return (
    <div className="w-full h-full min-h-[200px] flex items-center">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="range"
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--chart-axis)"
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


