"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo } from "react";
import { computeTopActivities } from "@/lib/calculations/stats";

interface EventTimelineChartProps {
  events: CalendarEvent[];
}

interface TimelineBar {
  activityName: string;
  color: string;
  segments: {
    start: Date;
    end: Date;
    startX: number;
    endX: number;
    width: number;
  }[];
}

interface MonthMarker {
  date: Date;
  position: number;
  label: string;
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

export function EventTimelineChart({ events }: EventTimelineChartProps) {
  const { timelineData, dateRange, monthMarkers } = useMemo(() => {
    if (events.length === 0) {
      return { timelineData: [], dateRange: null, monthMarkers: [] };
    }

    // Get top 10 activities
    const top10 = computeTopActivities(events, "time", 10);

    // Find date range from all events (not just top 10)
    const allDates = events.map(e => [e.start, e.end]).flat();
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalRange = maxDate.getTime() - minDate.getTime();

    if (totalRange === 0) {
      return { timelineData: [], dateRange: null, monthMarkers: [] };
    }

    // Helper function to calculate position percentage (0-100)
    const calculatePosition = (date: Date): number => {
      const timeDiff = date.getTime() - minDate.getTime();
      return (timeDiff / totalRange) * 100;
    };

    // Generate month markers - one for each month in the range
    const markers: MonthMarker[] = [];
    const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    let currentMonth = new Date(startMonth);
    
    while (currentMonth <= maxDate) {
      const position = calculatePosition(currentMonth);
      if (position >= -1 && position <= 101) { // Allow slight overflow for edge alignment
        const month = currentMonth.toLocaleDateString('en-US', { month: 'short' });
        const year = currentMonth.getFullYear();
        markers.push({
          date: new Date(currentMonth),
          position: Math.max(0, Math.min(100, position)), // Clamp to 0-100
          label: `${month} ${year}`,
        });
      }
      // Move to first day of next month
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    // Group events by activity name (case-insensitive matching)
    const eventsByActivity = new Map<string, CalendarEvent[]>();
    top10.forEach((activity) => {
      const activityEvents = events.filter(
        e => e.title.toLowerCase().trim() === activity.name.toLowerCase().trim()
      );
      if (activityEvents.length > 0) {
        eventsByActivity.set(activity.name, activityEvents);
      }
    });

    // Helper function to calculate days between dates
    const getDaysBetween = (date1: Date, date2: Date): number => {
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Create timeline bars
    const bars: TimelineBar[] = [];
    top10.forEach((activity, index) => {
      const activityEvents = eventsByActivity.get(activity.name) || [];
      if (activityEvents.length === 0) return;

      // Sort events by start time
      const sortedEvents = [...activityEvents].sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );

      // Merge consecutive events if gap is less than 10 days
      const segments: {
        start: Date;
        end: Date;
        startX: number;
        endX: number;
        width: number;
      }[] = [];

      if (sortedEvents.length > 0) {
        let currentSegment = {
          start: sortedEvents[0].start,
          end: sortedEvents[0].end,
        };

        for (let i = 1; i < sortedEvents.length; i++) {
          const prevEvent = sortedEvents[i - 1];
          const currentEvent = sortedEvents[i];
          
          // Calculate gap between previous event end and current event start
          const gapDays = getDaysBetween(prevEvent.end, currentEvent.start);

          if (gapDays < 10) {
            // Merge: extend current segment to include this event
            currentSegment.end = currentEvent.end;
          } else {
            // Gap >= 10 days: save current segment and start a new one
            const startX = calculatePosition(currentSegment.start);
            const endX = calculatePosition(currentSegment.end);
            const width = Math.max(0.1, endX - startX);
            
            segments.push({
              start: currentSegment.start,
              end: currentSegment.end,
              startX: Math.max(0, Math.min(100, startX)),
              endX: Math.max(0, Math.min(100, endX)),
              width: Math.max(0.1, Math.min(100, width)),
            });

            // Start new segment
            currentSegment = {
              start: currentEvent.start,
              end: currentEvent.end,
            };
          }
        }

        // Add the last segment
        const startX = calculatePosition(currentSegment.start);
        const endX = calculatePosition(currentSegment.end);
        const width = Math.max(0.1, endX - startX);
        
        segments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          startX: Math.max(0, Math.min(100, startX)),
          endX: Math.max(0, Math.min(100, endX)),
          width: Math.max(0.1, Math.min(100, width)),
        });
      }

      bars.push({
        activityName: activity.name,
        color: COLORS[index % COLORS.length],
        segments,
      });
    });

    return {
      timelineData: bars,
      dateRange: { min: minDate, max: maxDate, total: totalRange },
      monthMarkers: markers,
    };
  }, [events]);

  if (timelineData.length === 0 || !dateRange) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  const formatDateLabel = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const barHeight = 35;
  const barGap = 4;
  const totalHeight = timelineData.length * (barHeight + barGap) - barGap;

  const activityLabelWidth = 160; // w-40 = 160px (10rem * 16px)

  return (
    <div className="w-full h-full flex flex-col">
      {/* X-axis month labels - positioned to match the timeline area */}
      <div className="relative h-10 mb-4 border-b-2 border-gray-300 flex">
        {/* Spacer to match activity label width */}
        <div style={{ width: `${activityLabelWidth}px`, flexShrink: 0 }} />
        {/* Labels container matching timeline width */}
        <div className="flex-1 relative">
          {monthMarkers.map((marker, index) => (
            <div
              key={`label-${index}`}
              className="absolute text-xs text-[color:var(--gray)] whitespace-nowrap font-medium"
              style={{ 
                left: `${marker.position}%`, 
                transform: 'translateX(-50%)',
              }}
            >
              {marker.label}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline bars */}
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <div className="relative" style={{ height: `${Math.max(totalHeight, 400)}px` }}>
          {timelineData.map((bar, barIndex) => (
            <div
              key={bar.activityName}
              className="absolute flex items-center"
              style={{
                top: `${barIndex * (barHeight + barGap)}px`,
                height: `${barHeight}px`,
                width: '100%',
                zIndex: 2,
              }}
            >
              {/* Activity label */}
              <div 
                className="w-40 pr-4 text-sm font-semibold text-black truncate flex-shrink-0 bg-[color:var(--card-bg)] z-10" 
                title={bar.activityName}
                style={{ height: `${barHeight}px`, lineHeight: `${barHeight}px` }}
              >
                {bar.activityName}
              </div>

              {/* Timeline bar container */}
              <div 
                className="flex-1 relative h-full bg-gray-50 rounded" 
                style={{ minHeight: `${barHeight}px` }}
              >
                {/* Month marker vertical lines - positioned behind bars */}
                {monthMarkers.map((marker, index) => (
                  <div
                    key={`line-${barIndex}-${index}`}
                    className="absolute border-l-2 border-gray-300 opacity-50 pointer-events-none"
                    style={{ 
                      left: `${marker.position}%`, 
                      top: 0,
                      height: '100%',
                      zIndex: 1,
                    }}
                  />
                ))}

                {bar.segments.map((segment, segIndex) => (
                  <div
                    key={segIndex}
                    className="absolute h-full rounded cursor-pointer transition-opacity hover:opacity-100"
                    style={{
                      left: `${segment.startX}%`,
                      width: `${segment.width}%`,
                      backgroundColor: bar.color,
                      opacity: 0.75,
                      minWidth: '2px', // Ensure very short events are still visible
                      top: 0,
                      height: '100%',
                      zIndex: 2,
                    }}
                    title={`${bar.activityName}\n${formatDateLabel(segment.start)} - ${formatDateLabel(segment.end)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
