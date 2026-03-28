"use client";

import { CalendarEvent } from "@/lib/calculations/stats";
import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatAsCompactHoursMinutes } from "@/lib/calculations/stats";
import { useFilter } from "@/contexts/FilterContext";
import { ChevronDown } from "lucide-react";

interface TimeLoggedChartProps {
  events: CalendarEvent[];
  title?: string;
}

type IntervalType = "Daily" | "Every 4 days" | "Weekly" | "Monthly";

// Manual month formatting to avoid hydration errors
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonth = (month: number): string => {
  return MONTH_NAMES[month] || '';
};

interface ChartDataPoint {
  date: string;
  minutes: number;
  dateObj: Date;
  monthLabel?: string;
}

export function TimeLoggedChart({ events, title = "Time Logged" }: TimeLoggedChartProps) {
  const { selectedFilter, currentYear } = useFilter();
  
  // Determine available intervals based on filter type
  const availableIntervals: IntervalType[] = useMemo(() => {
    if (selectedFilter === "Month") {
      return ["Daily", "Every 4 days", "Weekly"];
    } else if (selectedFilter === "Year") {
      return ["Daily", "Weekly", "Monthly"];
    } else {
      return ["Weekly", "Monthly"];
    }
  }, [selectedFilter]);

  // Set default interval based on filter type
  const defaultInterval: IntervalType = useMemo(() => {
    if (selectedFilter === "Month") {
      return "Daily";
    } else if (selectedFilter === "Year") {
      return "Weekly";
    } else {
      return "Monthly";
    }
  }, [selectedFilter]);

  const [selectedInterval, setSelectedInterval] = useState<IntervalType>(defaultInterval);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update interval when filter type changes
  useEffect(() => {
    setSelectedInterval(defaultInterval);
  }, [defaultInterval]);

  // Group events by interval and calculate total minutes
  const chartData = useMemo(() => {
    if (events.length === 0) {
      return [];
    }

    // Filter out future events (cutoff at today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const filteredEvents = events.filter(event => event.start <= today);
    
    if (filteredEvents.length === 0) {
      return [];
    }

    // Helper functions for different intervals
    const getIntervalStart = (date: Date, interval: IntervalType): Date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      
      if (interval === "Daily") {
        return d;
      } else if (interval === "Every 4 days") {
        // Round down to nearest 4-day interval (starting from a fixed date)
        const epoch = new Date(2020, 0, 1); // Fixed reference date
        const daysSinceEpoch = Math.floor((d.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
        const intervalNumber = Math.floor(daysSinceEpoch / 4);
        const daysToAdd = intervalNumber * 4;
        const result = new Date(epoch);
        result.setDate(result.getDate() + daysToAdd);
        return result;
      } else if (interval === "Weekly") {
        // Week start (Monday)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
      } else if (interval === "Monthly") {
        // First day of month
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
      return d;
    };

    const getIntervalKey = (date: Date, interval: IntervalType): string => {
      const intervalStart = getIntervalStart(date, interval);
      const year = intervalStart.getFullYear();
      const month = String(intervalStart.getMonth() + 1).padStart(2, "0");
      const day = String(intervalStart.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Group by interval
    const eventsByInterval = new Map<string, number>();
    filteredEvents.forEach((event) => {
      const intervalKey = getIntervalKey(event.start, selectedInterval);
      const currentMinutes = eventsByInterval.get(intervalKey) || 0;
      eventsByInterval.set(intervalKey, currentMinutes + event.durationMinutes);
    });

    // Special handling for Year filter - show entire year for all intervals
    if (selectedFilter === "Year") {
      const allIntervals: string[] = [];
      let currentInterval: Date;
      
      // Cap yearEnd at today if it's the current year
      const yearEnd = currentYear === today.getFullYear() 
        ? new Date(today) 
        : new Date(currentYear, 11, 31);
      
      if (selectedInterval === "Monthly") {
        // Generate all 12 months, but cap at current month if it's current year
        const maxMonth = currentYear === today.getFullYear() ? today.getMonth() : 11;
        for (let month = 0; month <= maxMonth; month++) {
          const monthDate = new Date(currentYear, month, 1);
          const intervalKey = getIntervalKey(monthDate, selectedInterval);
          allIntervals.push(intervalKey);
        }
      } else if (selectedInterval === "Weekly") {
        // Generate all weeks in the year (from Jan 1 to yearEnd)
        const yearStart = new Date(currentYear, 0, 1); // January 1
        const firstWeekStart = getIntervalStart(yearStart, selectedInterval);
        const lastWeekStart = getIntervalStart(yearEnd, selectedInterval);
        
        currentInterval = new Date(firstWeekStart);
        while (currentInterval <= lastWeekStart && currentInterval <= today) {
          const intervalKey = getIntervalKey(currentInterval, selectedInterval);
          // Only include weeks that are within the selected year
          if (currentInterval.getFullYear() === currentYear || 
              (currentInterval.getFullYear() === currentYear - 1 && currentInterval.getMonth() === 11)) {
            if (!allIntervals.includes(intervalKey)) {
              allIntervals.push(intervalKey);
            }
          }
          currentInterval.setDate(currentInterval.getDate() + 7);
        }
      } else if (selectedInterval === "Daily") {
        // Generate all days in the year, capped at today
        const yearStart = new Date(currentYear, 0, 1); // January 1
        currentInterval = new Date(yearStart);
        
        while (currentInterval <= yearEnd && currentInterval <= today) {
          const intervalKey = getIntervalKey(currentInterval, selectedInterval);
          if (!allIntervals.includes(intervalKey)) {
            allIntervals.push(intervalKey);
          }
          currentInterval.setDate(currentInterval.getDate() + 1);
        }
      }
      
      // Create data points for all intervals in the year
      const data: ChartDataPoint[] = allIntervals.map((intervalKey, index) => {
        const [year, month, day] = intervalKey.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        // Determine label based on interval type
        let monthLabel = '';
        if (selectedInterval === "Monthly") {
          monthLabel = formatMonth(month - 1);
        } else if (selectedInterval === "Weekly") {
          // Show month label for first week of month
          if (index === 0) {
            monthLabel = formatMonth(month - 1);
          } else {
            const prevIntervalKey = allIntervals[index - 1];
            const [prevYear, prevMonth] = prevIntervalKey.split('-').map(Number);
            if (prevMonth !== month || prevYear !== year) {
              monthLabel = formatMonth(month - 1);
            }
          }
        } else if (selectedInterval === "Daily") {
          // Show month label for first day of month
          if (day === 1) {
            monthLabel = formatMonth(month - 1);
          } else if (index > 0) {
            const prevIntervalKey = allIntervals[index - 1];
            const [prevYear, prevMonth, prevDay] = prevIntervalKey.split('-').map(Number);
            if (prevMonth !== month || prevYear !== year) {
              monthLabel = formatMonth(month - 1);
            }
          }
        }
        
        return {
          date: intervalKey,
          minutes: eventsByInterval.get(intervalKey) || 0,
          dateObj,
          monthLabel,
        };
      });

      return data;
    }
    
    // Find the date range (for non-Year filters)
    const allDates = filteredEvents.map(e => e.start);
    if (allDates.length === 0) return [];
    
    const validDates = allDates.filter(d => d.getTime() <= today.getTime());
    if (validDates.length === 0) return [];
    
    const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
    const maxDate = new Date(Math.min(today.getTime(), Math.max(...validDates.map(d => d.getTime()))));
    
    // Get the interval start for the first and last dates
    const firstIntervalStart = getIntervalStart(minDate, selectedInterval);
    const lastIntervalStart = getIntervalStart(maxDate, selectedInterval);
    
    // Generate all intervals in the range
    const allIntervals: string[] = [];
    const currentInterval = new Date(firstIntervalStart);
    
    while (currentInterval <= lastIntervalStart) {
      const intervalKey = getIntervalKey(currentInterval, selectedInterval);
      if (!allIntervals.includes(intervalKey)) {
        allIntervals.push(intervalKey);
      }
      
      // Move to next interval
      if (selectedInterval === "Daily") {
        currentInterval.setDate(currentInterval.getDate() + 1);
      } else if (selectedInterval === "Every 4 days") {
        currentInterval.setDate(currentInterval.getDate() + 4);
      } else if (selectedInterval === "Weekly") {
        currentInterval.setDate(currentInterval.getDate() + 7);
      } else if (selectedInterval === "Monthly") {
        currentInterval.setMonth(currentInterval.getMonth() + 1);
      }
    }
    
    // Create data points for all intervals, filling in missing ones with 0
    const data: ChartDataPoint[] = allIntervals.map((intervalKey, index) => {
      const [year, month, day] = intervalKey.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      // Determine label based on interval type
      let monthLabel = '';
      if (selectedInterval === "Monthly") {
        monthLabel = formatMonth(month - 1);
      } else if (selectedInterval === "Weekly") {
        // Show month label for first week of month
        if (index === 0) {
          monthLabel = formatMonth(month - 1);
        } else {
          const prevIntervalKey = allIntervals[index - 1];
          const [prevYear, prevMonth] = prevIntervalKey.split('-').map(Number);
          if (prevMonth !== month || prevYear !== year) {
            monthLabel = formatMonth(month - 1);
          }
        }
      }
      
      return {
        date: intervalKey,
        minutes: eventsByInterval.get(intervalKey) || 0,
        dateObj,
        monthLabel,
      };
    });

    return data;
  }, [events, selectedInterval, selectedFilter, currentYear]);

  // Calculate number of unique months
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    chartData.forEach(d => {
      if (d.monthLabel) {
        months.add(d.monthLabel);
      }
    });
    return months.size;
  }, [chartData]);

  // Custom tick component that only renders when there's a label
  const CustomTick = ({ x, y, payload }: any) => {
    const dataPoint = chartData.find(d => d.date === payload.value);
    const label = dataPoint?.monthLabel || '';
    
    if (!label) return null;
    
    return (
      <text
        x={x}
        y={y + 15}
        fill="var(--chart-axis)"
        fontSize={12}
        textAnchor="middle"
      >
        {label}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!coordinate) return null;
      
      const getTooltipLabel = () => {
        const [year, month, day] = data.date.split('-').map(Number);
        if (selectedInterval === "Daily") {
          return `${formatMonth(month - 1)} ${day}, ${year}`;
        } else if (selectedInterval === "Every 4 days") {
          return `${formatMonth(month - 1)} ${day}, ${year}`;
        } else if (selectedInterval === "Weekly") {
          return `Week of ${formatMonth(month - 1)} ${day}, ${year}`;
        } else if (selectedInterval === "Monthly") {
          return `${formatMonth(month - 1)} ${year}`;
        }
        return `${formatMonth(month - 1)} ${day}, ${year}`;
      };
      
      return (
        <div 
          className="bg-white/70 backdrop-blur-sm border border-gray-200/30 rounded-xl p-2 shadow-lg"
          style={{
            position: 'absolute',
            left: `${coordinate.x - 170}px`,
            top: `${coordinate.y - 60}px`,
            pointerEvents: 'none',
            minWidth: '160px',
          }}
        >
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            {getTooltipLabel()}
          </p>
          <p className="text-sm text-[color:var(--primary)]">
            {formatAsCompactHoursMinutes(data.minutes)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[color:var(--gray)]">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      {/* Title and Interval Selector */}
      <div className="mb-4 flex items-center justify-between px-6">
        <h3 className="text-card-title">{title}</h3>
        <div className="relative">
          <div 
            className="bg-white px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer text-[18px] text-[color:var(--text-primary)]"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>Interval: {selectedInterval}</span>
            <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
          
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg z-20 min-w-[180px]">
                {availableIntervals.map((interval) => (
                  <button
                    key={interval}
                    onClick={() => {
                      setSelectedInterval(interval);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[18px] text-[color:var(--text-primary)] hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                      selectedInterval === interval ? 'bg-[color:var(--primary-10)]' : ''
                    }`}
                  >
                    {interval}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right:10, left: 0, bottom: 0 }} style={{ position: 'relative' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            tick={<CustomTick />}
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
            interval={0}
          />
          <YAxis
            stroke="var(--chart-axis)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatAsCompactHoursMinutes(value)}
            width={60}
            tick={{ fontSize: 12 }}
            axisLine={false}
          />
          <Tooltip 
            content={<CustomTooltip />}
            position={{ x: 0, y: 0 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "var(--primary)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

