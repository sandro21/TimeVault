"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";

interface TopActivitiesChartProps {
  events: CalendarEvent[];
  topActivities: Array<{ name: string; totalMinutes: number }>;
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
];

export function TopActivitiesChart({ events, topActivities }: TopActivitiesChartProps) {
  const [hoveredData, setHoveredData] = useState<Record<string, number> | null>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<Record<string, any> | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const hoveredDataRef = useRef<Record<string, number> | null>(null);
  const hoveredDataPointRef = useRef<Record<string, any> | null>(null);
  const tooltipPositionRef = useRef<{ x: number; y: number } | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const chartData = useMemo(() => {
    if (events.length === 0 || topActivities.length === 0) {
      console.log("TopActivitiesChart: No events or activities provided");
      return [];
    }

    // Filter out future events (cutoff at today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const filteredEvents = events.filter(event => event.start <= today);
    
    if (filteredEvents.length === 0) {
      return [];
    }

    // Helper function to get week start date (Monday)
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      return new Date(d.setDate(diff));
    };

    // Helper function to format week key (YYYY-MM-DD of week start)
    const getWeekKey = (date: Date): string => {
      const weekStart = getWeekStart(date);
      const year = weekStart.getFullYear();
      const month = String(weekStart.getMonth() + 1).padStart(2, "0");
      const day = String(weekStart.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Get all unique week keys across all events
    const allWeekKeys = new Set<string>();
    filteredEvents.forEach((event) => {
      allWeekKeys.add(getWeekKey(event.start));
    });

    // Group events by activity name
    const eventsByActivity = new Map<string, CalendarEvent[]>();
    topActivities.forEach((activity) => {
      const activityEvents = filteredEvents.filter((event) =>
        event.title.toLowerCase() === activity.name.toLowerCase()
      );
      eventsByActivity.set(activity.name, activityEvents);
    });

    // For each activity, group by week
    const activityWeekData = new Map<string, Map<string, number>>();
    topActivities.forEach((activity) => {
      const activityEvents = eventsByActivity.get(activity.name) || [];
      const weekData = new Map<string, number>();
      
      activityEvents.forEach((event) => {
        const weekKey = getWeekKey(event.start);
        const currentMinutes = weekData.get(weekKey) || 0;
        weekData.set(weekKey, currentMinutes + event.durationMinutes);
      });
      
      activityWeekData.set(activity.name, weekData);
    });

    // Create data points for all weeks, with minutes for each activity
    const sortedWeeks = Array.from(allWeekKeys).sort();
    const data = sortedWeeks.map((weekKey, index) => {
      const [year, month, day] = weekKey.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      // Check if this is first week of month
      const isFirstWeekOfMonth = index === 0 || (() => {
        const prevWeekKey = sortedWeeks[index - 1];
        const [prevYear, prevMonth] = prevWeekKey.split('-').map(Number);
        return prevMonth !== month || prevYear !== year;
      })();
      
      const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
      const yearFull = dateObj.getFullYear();
      
      const dataPoint: Record<string, any> = {
        date: weekKey,
        dateObj,
        month: dateObj.getMonth(), // 0-11
        year: yearFull,
        monthLabel: isFirstWeekOfMonth ? monthShort : '',
        monthYearLabel: `${monthShort}, ${yearFull}`, // Always show month/year
      };

      // Add minutes for each activity
      topActivities.forEach((activity) => {
        const weekData = activityWeekData.get(activity.name);
        dataPoint[activity.name] = weekData?.get(weekKey) || 0;
      });

      return dataPoint;
    });

    console.log("TopActivitiesChart: Generated data points", data.length, data.slice(0, 3));
    return data;
  }, [events, topActivities]);

  // Calculate max value for Y-axis with nice round intervals
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    let max = 0;
    chartData.forEach((point) => {
      topActivities.forEach((activity) => {
        const value = point[activity.name] || 0;
        if (value > max) max = value;
      });
    });
    
    // Round up to next nice number (e.g., 1234 -> 1500, 567 -> 600)
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const normalized = max / magnitude;
    let niceMax;
    if (normalized <= 1) niceMax = 1;
    else if (normalized <= 2) niceMax = 2;
    else if (normalized <= 5) niceMax = 5;
    else niceMax = 10;
    
    return niceMax * magnitude;
  }, [chartData, topActivities]);

  // Format date for X-axis (show only month labels)
  const formatXAxisLabel = (dateString: string) => {
    const dataPoint = chartData.find(d => d.date === dateString);
    return dataPoint?.monthLabel || '';
  };

  // Find the topmost point (highest value across all activities)
  const topmostPoint = useMemo<Record<string, any> | null>(() => {
    if (chartData.length === 0) return null;
    
    let maxValue = 0;
    let topmostDataPoint: Record<string, any> | null = null;
    
    chartData.forEach((point) => {
      topActivities.forEach((activity) => {
        const value = point[activity.name] || 0;
        if (value > maxValue) {
          maxValue = value;
          topmostDataPoint = point;
        }
      });
    });
    
    return topmostDataPoint;
  }, [chartData, topActivities]);

  // Calculate tooltip position based on topmost point using useEffect
  useEffect(() => {
    if (!topmostPoint || !chartContainerRef.current || chartData.length === 0) {
      setTooltipPosition(null);
      return;
    }
    
    const container = chartContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Find the index of the topmost point in chartData
    if (!topmostPoint) {
      setTooltipPosition(null);
      return;
    }
    const topmostIndex = chartData.findIndex(d => d.date === topmostPoint.date);
    if (topmostIndex === -1) {
      setTooltipPosition(null);
      return;
    }
    
    // Estimate X position: assume chart takes up most of container width
    // Chart typically has margins, so we estimate ~80% of width is chart area
    const chartWidth = containerRect.width * 0.8;
    const chartLeftMargin = containerRect.width * 0.1;
    const xPosition = chartLeftMargin + (topmostIndex / Math.max(chartData.length - 1, 1)) * chartWidth;
    
    // Y position: near the top of the chart (topmost point is at max Y value)
    // Chart typically has ~10% margin at top
    const yPosition = containerRect.height * 0.15;
    
    const position = { x: xPosition, y: yPosition };
    tooltipPositionRef.current = position;
    setTooltipPosition(position);
  }, [topmostPoint, chartData]);

  // Custom tooltip that updates hoveredData state and Y position via ref (to avoid setState during render)
  const prevPayloadRef = useRef<any>(null);
  
  const CustomTooltip = useCallback(({ active, payload, coordinate }: any) => {
    // Only update if payload actually changed to prevent infinite loops
    const payloadKey = payload?.[0]?.payload?.date;
    const prevKey = prevPayloadRef.current;
    
    if (active && payload && payload.length && payloadKey !== prevKey) {
      const data = payload[0].payload;
      const hoverData: Record<string, number> = {};
      
      topActivities.forEach((activity) => {
        hoverData[activity.name] = data[activity.name] || 0;
      });
      
      prevPayloadRef.current = payloadKey;
      hoveredDataRef.current = hoverData;
      hoveredDataPointRef.current = data;
      
      // Update position to follow mouse smoothly
      if (coordinate && chartContainerRef.current) {
        // coordinate from Recharts is relative to the chart area
        // Subtract to move tooltip higher up
        const relativeY = coordinate.y - 80; // Move tooltip higher
        const relativeX = coordinate.x; // X position follows mouse
        
        // Update tooltip position ref: X and Y both follow mouse
        tooltipPositionRef.current = { 
          x: relativeX, // X follows mouse
          y: relativeY // Y follows mouse
        };
        
        // Update position immediately for smooth following (using requestAnimationFrame)
        requestAnimationFrame(() => {
          if (tooltipPositionRef.current) {
            setTooltipPosition({ ...tooltipPositionRef.current });
          }
        });
      }
      
      // Defer hover data update to avoid setState during render
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setHoveredData(hoveredDataRef.current);
        setHoveredDataPoint(hoveredDataPointRef.current);
      }, 0);
    } else if (!active && prevPayloadRef.current !== null) {
      prevPayloadRef.current = null;
      hoveredDataRef.current = null;
      hoveredDataPointRef.current = null;
      
      // Defer state update to avoid setState during render
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setHoveredData(null);
        setHoveredDataPoint(null);
      }, 0);
    }
    
    return null; // Don't render default tooltip, we use custom overlay instead
  }, [topActivities]);

  if (chartData.length === 0 || topActivities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  return (
    <div ref={chartContainerRef} className="w-full h-full min-h-[400px] relative">
      {/* Chart - full width */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          onMouseLeave={() => {
            setHoveredData(null);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisLabel}
            stroke="#3B3C40"
            style={{ fontSize: '12px' }}
            height={40}
          />
          <YAxis
            stroke="#3B3C40"
            style={{ fontSize: '12px' }}
            domain={[0, maxValue]}
            tickFormatter={(value) => {
              // Format to nice round numbers
              if (value >= 60) {
                const hours = Math.floor(value / 60);
                return `${hours}h`;
              }
              return `${value}m`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {topActivities.map((activity, index) => (
            <Line
              key={activity.name}
              type="monotone"
              dataKey={activity.name}
              stroke={COLORS[index]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: COLORS[index] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Floating tooltip positioned at topmost point */}
      {hoveredData && tooltipPosition && (
        <div
          className="absolute bg-white/70 backdrop-blur-sm border border-gray-200/30 rounded-xl p-3 shadow-lg z-10 pointer-events-none"
          style={{
            left: `${tooltipPosition.x - 250}px`, // Position significantly to the left
            top: `${tooltipPosition.y}px`, // Position follows mouse Y
            transition: 'left 0.01s ease-out, top 0.01s ease-out',
            willChange: 'transform',
          }}
        >
          {/* Month/Year label at top */}
          {hoveredDataPoint?.monthYearLabel && (
            <div className="text-xs text-[color:var(--gray)] font-medium mb-1">
              {hoveredDataPoint.monthYearLabel}
            </div>
          )}
          
          <div className="space-y-1">
            {(() => {
              // Create array with values and sort by hovered value
              const activitiesWithValues = topActivities.map((activity, index) => ({
                ...activity,
                index,
                value: hoveredData[activity.name] || 0,
              }));
              
              // Sort by value descending and take top 3
              const sorted = [...activitiesWithValues]
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
              
              return sorted.map((item, displayIndex) => {
                // Truncate name if too long (max ~20 chars)
                const displayName = item.name.length > 20 
                  ? item.name.substring(0, 17) + '...' 
                  : item.name;
                
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: COLORS[item.index] }}
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-black">
                        {displayIndex + 1}. {displayName}
                      </span>
                      {' - '}
                      <span style={{ color: COLORS[item.index] }}>
                        {formatAsCompactHoursMinutes(item.value)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

