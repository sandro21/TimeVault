"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo, useState } from "react";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";
import { getPrimaryGradientColor } from "@/lib/colors";

interface TimeOfDayChartProps {
  events: CalendarEvent[];
}

export function TimeOfDayChart({ events }: TimeOfDayChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const chartData = useMemo(() => {
    // Initialize array for 24 hours (0-23)
    const hourTotals = new Array(24).fill(0);
    const hourCounts = new Array(24).fill(0);

    // Sum up minutes and count activities for each hour of the day
    events.forEach((event) => {
      const hour = event.start.getHours(); // 0-23
      hourTotals[hour] += event.durationMinutes;
      hourCounts[hour] += 1;
    });

    // Find max value for normalization
    const maxValue = Math.max(...hourTotals, 1);

    // Convert to percentage (0-100) for visualization
    return hourTotals.map((minutes, hour) => ({
      hour,
      minutes,
      count: hourCounts[hour],
      intensity: (minutes / maxValue) * 100, // 0-100%
    }));
  }, [events]);

  const totalMinutes = useMemo(() => {
    return chartData.reduce((sum, entry) => sum + entry.minutes, 0);
  }, [chartData]);

  // Format hour label for all 24 hours
  const formatHourLabel = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Calculate position on clock (SVG coordinates)
  const getClockPosition = (hour: number, radius: number, size: number) => {
    // Start at top (12 o'clock = hour 0) and go clockwise
    // Adjust: hour 0 should be at top, so we subtract 6 to rotate
    const angle = (hour - 6) * (Math.PI / 12);
    const center = size / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Get color based on intensity - primary-based gradient
  const getIntensityColor = (intensity: number) => {
    // Convert intensity from 0-100 to 0-1 for gradient function
    const ratio = intensity / 100;
    // Use primary-based gradient (ratio 0 = lightest, 1 = darkest)
    return getPrimaryGradientColor(ratio);
  };

  // Create path for segment outline (full segment)
  const createSegmentOutlinePath = (
    hour: number,
    size: number,
    innerRadius: number,
    outerRadius: number
  ) => {
    const center = size / 2;
    // Remove gap by making segments touch (each segment is 15 degrees, use full width)
    const startAngle = (hour - 6) * (Math.PI / 12) - (Math.PI / 24);
    const endAngle = (hour - 6) * (Math.PI / 12) + (Math.PI / 24);

    const startInner = {
      x: center + innerRadius * Math.cos(startAngle),
      y: center + innerRadius * Math.sin(startAngle),
    };
    const endInner = {
      x: center + innerRadius * Math.cos(endAngle),
      y: center + innerRadius * Math.sin(endAngle),
    };
    const startOuter = {
      x: center + outerRadius * Math.cos(startAngle),
      y: center + outerRadius * Math.sin(startAngle),
    };
    const endOuter = {
      x: center + outerRadius * Math.cos(endAngle),
      y: center + outerRadius * Math.sin(endAngle),
    };

    return `
      M ${startInner.x} ${startInner.y}
      L ${startOuter.x} ${startOuter.y}
      A ${outerRadius} ${outerRadius} 0 0 1 ${endOuter.x} ${endOuter.y}
      L ${endInner.x} ${endInner.y}
      A ${innerRadius} ${innerRadius} 0 0 0 ${startInner.x} ${startInner.y}
    `;
  };

  // Create path for filled portion (based on intensity)
  const createSegmentFillPath = (
    hour: number,
    intensity: number,
    size: number,
    innerRadius: number,
    outerRadius: number
  ) => {
    const center = size / 2;
    // Remove gap by making segments touch (each segment is 15 degrees, use full width)
    const startAngle = (hour - 6) * (Math.PI / 12) - (Math.PI / 24);
    const endAngle = (hour - 6) * (Math.PI / 12) + (Math.PI / 24);
    // Fill radius based on intensity (0-100%)
    const fillRadius = innerRadius + ((outerRadius - innerRadius) * intensity / 100);

    const startInner = {
      x: center + innerRadius * Math.cos(startAngle),
      y: center + innerRadius * Math.sin(startAngle),
    };
    const endInner = {
      x: center + innerRadius * Math.cos(endAngle),
      y: center + innerRadius * Math.sin(endAngle),
    };
    const startOuter = {
      x: center + fillRadius * Math.cos(startAngle),
      y: center + fillRadius * Math.sin(startAngle),
    };
    const endOuter = {
      x: center + fillRadius * Math.cos(endAngle),
      y: center + fillRadius * Math.sin(endAngle),
    };

    return `
      M ${startInner.x} ${startInner.y}
      L ${startOuter.x} ${startOuter.y}
      A ${fillRadius} ${fillRadius} 0 0 1 ${endOuter.x} ${endOuter.y}
      L ${endInner.x} ${endInner.y}
      A ${innerRadius} ${innerRadius} 0 0 0 ${startInner.x} ${startInner.y}
    `;
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  // SVG size - make it responsive
  const size = 400;
  const innerRadius = 60; // Decreased from 80
  const outerRadius = 160;
  const outlineRadius = outerRadius + 5;
  const labelRadius = outlineRadius + 20; // More distance between outline and labels

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {/* Hour labels for all 24 hours */}
        {Array.from({ length: 24 }, (_, i) => {
          const pos = getClockPosition(i, labelRadius, size);
          return (
            <text
              key={`hour-${i}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--chart-axis)"
              fontSize="11"
              fontWeight="500"
            >
              {formatHourLabel(i)}
            </text>
          );
        })}

        {/* Activity segments - outline and fill */}
        {chartData.map((data, i) => {
          const isHovered = hoveredHour === data.hour;
          const segmentCenter = getClockPosition(
            data.hour,
            innerRadius + (outerRadius - innerRadius) / 2,
            size
          );
          
          return (
            <g key={i}>
              {/* Segment outline (full segment) - red */}
              <path
                d={createSegmentOutlinePath(data.hour, size, innerRadius, outerRadius)}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1"
              />
              {/* Filled portion based on intensity */}
              <path
                d={createSegmentFillPath(data.hour, data.intensity, size, innerRadius, outerRadius)}
                fill={getIntensityColor(data.intensity)}
                stroke="none"
                opacity={isHovered ? 0.9 : 1}
                onMouseEnter={(e) => {
                  setHoveredHour(data.hour);
                  const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                  const svg = (e.currentTarget as SVGElement).ownerSVGElement;
                  if (svg) {
                    const svgRect = svg.getBoundingClientRect();
                    setTooltipPosition({
                      x: segmentCenter.x + svgRect.left,
                      y: segmentCenter.y + svgRect.top,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredHour(null);
                  setTooltipPosition(null);
                }}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}

        {/* Center circle with red outline */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="var(--white)"
          stroke="var(--primary)"
          strokeWidth="2"
        />

        {/* Center label - shows hovered hour or total */}
        {hoveredHour !== null ? (
          <>
            {/* Time label - always shown prominently when hovering */}
            <text
              x={size / 2}
              y={size / 2 - 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--primary)"
              fontSize="18"
              fontWeight="700"
            >
              {formatHourLabel(hoveredHour)}
            </text>
            <text
              x={size / 2}
              y={size / 2 + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--black)"
              fontSize="14"
              fontWeight="600"
            >
              {chartData[hoveredHour].count} {chartData[hoveredHour].count === 1 ? 'activity' : 'activities'}
            </text>
          </>
        ) : (
          <>
            <text
              x={size / 2}
              y={size / 2 - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--gray)"
              fontSize="11"
            >
              Total
            </text>
            <text
              x={size / 2}
              y={size / 2 + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--black)"
              fontSize="14"
              fontWeight="600"
            >
              {formatAsCompactHoursMinutes(totalMinutes)}
            </text>
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredHour !== null && tooltipPosition && (
        <div
          className="absolute bg-white/70 backdrop-blur-sm border border-gray-200/30 rounded-xl p-3 shadow-lg z-10 pointer-events-none"
          style={{
            left: `${tooltipPosition.x - 120}px`,
            top: `${tooltipPosition.y - 60}px`,
            minWidth: '150px',
          }}
        >
          <div className="text-center">
            <div className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">
              {formatHourLabel(hoveredHour)}
            </div>
            <div className="text-sm text-[color:var(--primary)] font-semibold">
              {chartData[hoveredHour].count} {chartData[hoveredHour].count === 1 ? 'activity' : 'activities'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
