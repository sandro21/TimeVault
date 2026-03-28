"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";
import { getChartColorValue, CHART_COLORS } from "@/lib/colors";
import { useMemo } from "react";

interface PieChartData {
  name: string;
  value: number;
}

interface ActivityPieChartProps {
  data: PieChartData[];
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[color:var(--chart-tooltip-bg)] backdrop-blur-sm border border-[color:var(--chart-tooltip-border)] rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{data.name}</p>
        <p className="text-sm text-[color:var(--primary)]">
          {formatAsCompactHoursMinutes(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function ActivityPieChart({ data }: ActivityPieChartProps) {
  // Get chart colors from CSS variables
  const colors = useMemo(() => {
    return CHART_COLORS.map((_, index) => {
      const value = getChartColorValue(index);
      // Fallback to actual CSS values if not available (SSR)
      if (!value) {
        const fallbacks = [
          "#a43c38", "#3B82F6", "#10B981", "#A855F7", "#F97316",
          "#EC4899", "#14B8A6", "#F59E0B", "#8B5CF6", "#EF4444", "#A0A0A0"
        ];
        return fallbacks[index] || fallbacks[0];
      }
      return value;
    });
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--text-secondary)]">
        No data available
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={110}
            fill="var(--chart-color-1)"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index] || colors[colors.length - 1]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

