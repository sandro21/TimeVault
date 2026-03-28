"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import { getCalendarGradientColors } from "@/lib/colors";

interface ContributionsCalendarProps {
  events: CalendarEvent[];
}

type Activity = {
  date: string;
  count: number;
  level: number;
};

function calculateLevel(count: number, maxCount: number, maxLevel: number = 4): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  
  // Calculate level based on percentage of max activity
  const percentage = count / maxCount;
  return Math.min(Math.ceil(percentage * maxLevel), maxLevel);
}

export function ContributionsCalendar({ events }: ContributionsCalendarProps) {
  // Get primary-based gradient colors for calendar levels
  const calendarColors = useMemo(() => {
    return getCalendarGradientColors();
  }, []);

  // Generate calendar data for the last 365 days
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter out future events (cutoff at today)
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate <= today;
    });
    
    // Group events by day
    const eventsByDay = new Map<string, number>();
    filteredEvents.forEach((event) => {
      const dayString = event.dayString;
      eventsByDay.set(dayString, (eventsByDay.get(dayString) || 0) + 1);
    });

    // Find max count for level calculation
    const maxCount = Math.max(...Array.from(eventsByDay.values()), 1);

    // Generate array of last 365 days
    const data: Activity[] = [];
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const count = eventsByDay.get(dayString) || 0;
      const level = calculateLevel(count, maxCount);
      
      data.push({
        date: dayString,
        count,
        level,
      });
    }

    return data;
  }, [events]);

  return (
    <div className="w-full flex justify-center">
      <ActivityCalendar 
        data={calendarData}
        blockSize={19}
        blockRadius={7}
        blockMargin={3}
        fontSize={15}
        maxLevel={4}
        theme={{
          light: calendarColors,
        }}
        colorScheme="light"
        showColorLegend={false}
        showMonthLabels={true}
        showTotalCount={false}
        showWeekdayLabels={true}
      />
    </div>
  );
}

