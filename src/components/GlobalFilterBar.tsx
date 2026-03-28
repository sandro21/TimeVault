"use client";

import { Trash2, SlidersHorizontal } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";
// import { ActivitySearchWrapper } from "@/components/ActivitySearchWrapper";
import { useEvents } from "@/contexts/EventsContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ManageFilterModal } from "@/components/ManageFilterModal";

export function GlobalFilterBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scrollY, setScrollY] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Call all hooks before any early returns (Rules of Hooks)
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

  const { events, refreshEvents } = useEvents();

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Hide filter bar on home, process, privacy, and terms pages
  if (pathname === "/" || pathname === "/process" || pathname === "/privacy" || pathname === "/terms") {
    return null;
  }

  const handleClearData = () => {
    if (typeof window !== 'undefined') {
      // Clear all calendar-related data from localStorage
      localStorage.removeItem('uploadedCalendars');
      localStorage.removeItem('activityTitleMappings');
      localStorage.removeItem('removedEventIds');
      localStorage.removeItem('googleCalendarEvents');
      
      // Refresh events context (will be empty now)
      refreshEvents();
      
      // Navigate to home page
      router.push('/');
    }
  };

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


  // Calculate top position based on scroll
  // Starts at 80px (top-20), moves to 10px as we scroll
  const maxTop = 90;
  const minTop = 10;
  const scrollThreshold = 100;
  const topPosition = Math.max(minTop, maxTop - (scrollY / scrollThreshold) * (maxTop - minTop));


  return (
    <div className="w-full">
      {/* Header Bar - Not Sticky */}
      <div 
        className="w-full flex flex-row items-center justify-between px-6 py-3"
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'blur(var(--card-backdrop-blur))',
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center">
          <img src="/blacklogo.png" alt="myCalendarStats" className="h-10" />
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex flex-row items-center gap-2">
        <button
          className="header-nav-button text-body-24 text-[color:var(--text-primary)] px-4 py-1 flex items-center gap-2"
          onClick={() => setIsFilterModalOpen(true)}
        >
          <SlidersHorizontal size={20} />
          Manage and Filter
        </button>
          <button
            className="header-delete-button flex items-center justify-center p-2"
            onClick={handleClearData}
          >
            <Trash2 size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Time Filter Component - Centered and Fixed */}
      <div 
        className="w-full flex justify-center fixed left-0 right-0 z-40 pointer-events-none transition-all duration-200 ease-out"
        style={{ top: `${topPosition}px` }}
      >
        <div className="flex flex-col items-center justify-center gap-1 pointer-events-auto">
          {/* Combined capsule with filter options and navigation */}
          <div 
            className="px-1 py-1 flex flex-row items-center gap-1 bg-[color:var(--inverse-color)] rounded-full"
            style={{
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {(["Month", "Year", "LifeTime"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-full text-body-24 whitespace-nowrap cursor-pointer ${
                  selectedFilter === filter 
                    ? "font-bold text-[color:var(--text-primary)]" 
                    : "font-normal text-[color:var(--text-primary)]"
                }`}
                style={
                  selectedFilter === filter
                    ? { backgroundColor: 'var(--primary-20)' }
                    : undefined
                }
              >
                {filter}
              </button>
            ))}

            {/* Year/Month Navigation (only shows for Month and Year) */}
            {(selectedFilter === "Month" || selectedFilter === "Year") && (
              <>
                <div className="h-8 w-px bg-[color:var(--text-secondary)] opacity-20 mx-1"></div>
                <button
                  onClick={() => selectedFilter === "Month" ? handleMonthChange(-1) : handleYearChange(-1)}
                  disabled={!canGoBack()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoBack() ? "text-[color:var(--primary)]" : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  ←
                </button>
                <span className="text-body-24 font-bold text-[color:var(--primary)] whitespace-nowrap px-2">
                  {selectedFilter === "Month" 
                    ? `${monthNames[currentMonth]} ${currentYear}`
                    : currentYear
                  }
                </span>
                <button
                  onClick={() => selectedFilter === "Month" ? handleMonthChange(1) : handleYearChange(1)}
                  disabled={!canGoForward()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoForward() ? "text-[color:var(--primary)]" : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manage Filter Modal */}
      <ManageFilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
      />
    </div>
  );
}
