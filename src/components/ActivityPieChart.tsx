"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";

interface PieChartData {
  name: string;
  value: number;
}

interface ActivityPieChartProps {
  data: PieChartData[];
}

const COLORS = [
  "#DB1E18", // Red
  "#3B82F6", // Blue
  "#10B981", // Green
  "#A855F7", // Purple
  "#F97316", // Orange
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EF4444", // Light Red
  "#A0A0A0", // Gray for "Other"
];

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/30 rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold text-black">{data.name}</p>
        <p className="text-sm text-[color:var(--red-1)]">
          {formatAsCompactHoursMinutes(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function ActivityPieChart({ data }: ActivityPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
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
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

