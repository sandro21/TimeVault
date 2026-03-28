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

interface DayOfWeekChartProps {
  events: CalendarEvent[];
  billingRates?: Record<string, number>;
  viewMode?: DashboardViewMode;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DayOfWeekChart({ events, billingRates, viewMode = "time" }: DayOfWeekChartProps) {
  const isRevenue = !!billingRates && viewMode === "revenue";

  const chartData = useMemo(() => {
    const dayTotals = new Array(7).fill(0);

    events.forEach((event) => {
      const dayOfWeek = event.dayOfWeek;
      if (isRevenue) {
        const rate = billingRates?.[event.title] ?? 0;
        dayTotals[dayOfWeek] += (event.durationMinutes / 60) * rate;
      } else {
        dayTotals[dayOfWeek] += event.durationMinutes;
      }
    });

    const maxValue = Math.max(...dayTotals, 1);

    return dayTotals.map((value, index) => {
      const intensity = maxValue > 0 ? value / maxValue : 0;
      const color = isRevenue ? getPrimaryGradientColor(intensity).replace("var(--primary)", "#16a34a") : getPrimaryGradientColor(intensity);
      return {
        day: DAY_NAMES[index],
        dayIndex: index,
        minutes: value,
        color: isRevenue ? `rgba(22, 163, 74, ${0.2 + intensity * 0.8})` : color,
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
        {isRevenue ? `$${Math.round(value).toLocaleString()}` : formatAsCompactHoursMinutes(value)}
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
              if (isRevenue) return `$${Math.round(value).toLocaleString()}`;
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

