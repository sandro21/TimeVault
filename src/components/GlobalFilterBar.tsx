"use client";

import { Upload, Filter } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
import { ActivitySearch } from "@/components/ActivitySearch";
import { useEvents } from "@/contexts/EventsContext";

export function GlobalFilterBar() {
  const {
    selectedFilter,
    setSelectedFilter,
    currentYear,
    setCurrentYear,
    currentMonth,
    setCurrentMonth,
    minDate,
    maxDate,
  } = useFilter();

  const { events } = useEvents();

  const now = new Date();
  const currentYearValue = now.getFullYear();
  const currentMonthValue = now.getMonth();

  // Format month name (3 letters)
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const handleYearChange = (delta: number) => {
    const newYear = currentYear + delta;
    
    // Check bounds - prevent going before first event
    if (minDate) {
      const minYear = minDate.getFullYear();
      if (newYear < minYear) {
        return; // Can't go before first event year
      }
    }
    
    // Prevent going beyond current year
    if (newYear > currentYearValue) {
      return;
    }
    
    setCurrentYear(newYear);
    
    // If month filter and we're at current year, clamp month
    if (selectedFilter === "Month" && newYear === currentYearValue) {
      if (currentMonth > currentMonthValue) {
        setCurrentMonth(currentMonthValue);
      }
    }
    
    // If month filter and we're at min year, clamp month to min month
    if (selectedFilter === "Month" && minDate && newYear === minDate.getFullYear()) {
      const minMonth = minDate.getMonth();
      if (currentMonth < minMonth) {
        setCurrentMonth(minMonth);
      }
    }
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear = currentYear - 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear = currentYear + 1;
    }

    // Check bounds
    if (minDate) {
      const minYear = minDate.getFullYear();
      const minMonth = minDate.getMonth();
      if (newYear < minYear || (newYear === minYear && newMonth < minMonth)) {
        return;
      }
    }
    
    if (newYear > currentYearValue || (newYear === currentYearValue && newMonth > currentMonthValue)) {
      return;
    }

    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  const canGoBack = () => {
    if (selectedFilter === "Year") {
      return minDate ? currentYear > minDate.getFullYear() : true;
    }
    if (selectedFilter === "Month") {
      if (minDate) {
        const minYear = minDate.getFullYear();
        const minMonth = minDate.getMonth();
        return currentYear > minYear || (currentYear === minYear && currentMonth > minMonth);
      }
      return true;
    }
    return false;
  };

  const canGoForward = () => {
    if (selectedFilter === "Year") {
      return currentYear < currentYearValue;
    }
    if (selectedFilter === "Month") {
      return currentYear < currentYearValue || (currentYear === currentYearValue && currentMonth < currentMonthValue);
    }
    return false;
  };

  return (
    <div className="max-w-full h-[50px] flex items-start">
      {/* Left: Icons */}
      <div className="flex-1 flex items-start justify-start gap-2">
        <div className="w-12 h-12 flex items-center justify-center cursor-pointer">
          <Upload size={20} className="text-black" />
        </div>
        <div className="w-12 h-12 flex items-center justify-center cursor-pointer">
          <Filter size={20} className="text-black" />
        </div>
      </div>

      {/* Center: Filter Options */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        {/* Big capsule with filter options */}
        <div 
          className="px-1 py-1 flex flex-row items-center gap-1"
          style={{
            borderRadius: 'var(--card-radius-lg)',
            background: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
            backdropFilter: 'blur(var(--card-backdrop-blur))',
          }}
        >
          {(["Month", "Year", "LifeTime"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-full text-body-24 whitespace-nowrap cursor-pointer ${
                selectedFilter === filter 
                  ? "font-bold text-black" 
                  : "font-normal text-black bg-white"
              }`}
              style={
                selectedFilter === filter
                  ? { backgroundColor: 'rgba(219, 30, 24, 0.2)' } // var(--red-1) with 20% opacity
                  : undefined
              }
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Year/Month Navigation (only shows for Month and Year) */}
        {(selectedFilter === "Month" || selectedFilter === "Year") && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedFilter === "Month" ? handleMonthChange(-1) : handleYearChange(-1)}
              disabled={!canGoBack()}
              className={`text-body-24 cursor-pointer ${
                canGoBack() ? "text-[color:var(--red-1)]" : "text-gray-400 cursor-not-allowed"
              }`}
            >
              ←
            </button>
            <div className="bg-white px-4 py-2 rounded-full" style={{ width: '15ch', minWidth: '10ch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-body-24 font-bold text-[color:var(--red-1)] whitespace-nowrap">
                {selectedFilter === "Month" 
                  ? `${monthNames[currentMonth]} ${currentYear}`
                  : currentYear
                }
              </span>
            </div>
            <button
              onClick={() => selectedFilter === "Month" ? handleMonthChange(1) : handleYearChange(1)}
              disabled={!canGoForward()}
              className={`text-body-24 cursor-pointer ${
                canGoForward() ? "text-[color:var(--red-1)]" : "text-gray-400 cursor-not-allowed"
              }`}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Right: Search Activity */}
      <div className="flex-1 flex items-start justify-end">
        <ActivitySearch events={events} />
      </div>
    </div>
  );
}
