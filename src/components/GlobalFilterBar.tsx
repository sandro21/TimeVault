"use client";

import React from "react";
import { useFilter } from "@/contexts/FilterContext";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function GlobalFilterBar() {
  const pathname = usePathname();
  const [scrollY, setScrollY] = useState(0);

  const {
    selectedFilter,
    setSelectedFilter,
    currentYear,
    setCurrentYear,
    currentMonth,
    setCurrentMonth,
    minDate,
  } = useFilter();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (
    pathname === "/" ||
    pathname === "/process" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/calendar" ||
    pathname === "/chat"
  ) {
    return null;
  }

  const now = new Date();
  const currentYearValue = now.getFullYear();
  const currentMonthValue = now.getMonth();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const handleYearChange = (delta: number) => {
    const newYear = currentYear + delta;

    if (minDate) {
      const minYear = minDate.getFullYear();
      if (newYear < minYear) {
        return;
      }
    }

    if (newYear > currentYearValue) {
      return;
    }

    setCurrentYear(newYear);

    if (selectedFilter === "Month" && newYear === currentYearValue) {
      if (currentMonth > currentMonthValue) {
        setCurrentMonth(currentMonthValue);
      }
    }

    if (
      selectedFilter === "Month" &&
      minDate &&
      newYear === minDate.getFullYear()
    ) {
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

    if (minDate) {
      const minYear = minDate.getFullYear();
      const minMonth = minDate.getMonth();
      if (
        newYear < minYear ||
        (newYear === minYear && newMonth < minMonth)
      ) {
        return;
      }
    }

    if (
      newYear > currentYearValue ||
      (newYear === currentYearValue && newMonth > currentMonthValue)
    ) {
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
        return (
          currentYear > minYear ||
          (currentYear === minYear && currentMonth > minMonth)
        );
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
      return (
        currentYear < currentYearValue ||
        (currentYear === currentYearValue && currentMonth < currentMonthValue)
      );
    }
    return false;
  };

  /** Matches AppHeader `h-14` so the time filter sits below the main nav */
  const APP_HEADER_OFFSET = 56;
  const maxTop = 90;
  const minTop = 10;
  const scrollThreshold = 100;
  const topPosition = Math.max(
    minTop,
    maxTop - (scrollY / scrollThreshold) * (maxTop - minTop)
  );

  return (
    <div className="w-full">
      <div
        className="hidden md:flex w-full justify-center fixed left-0 right-0 z-40 pointer-events-none transition-all duration-200 ease-out"
        style={{ top: `${APP_HEADER_OFFSET + topPosition}px` }}
      >
        <div className="flex flex-col items-center justify-center gap-1 pointer-events-auto">
          <div
            className="px-1 py-1 flex flex-row items-center gap-1 bg-[color:var(--inverse-color)] rounded-full"
            style={{
              boxShadow: "var(--card-shadow)",
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
                    ? { backgroundColor: "var(--primary-20)" }
                    : undefined
                }
              >
                {filter}
              </button>
            ))}

            {(selectedFilter === "Month" || selectedFilter === "Year") && (
              <>
                <div className="h-8 w-px bg-[color:var(--text-secondary)] opacity-20 mx-1"></div>
                <button
                  onClick={() =>
                    selectedFilter === "Month"
                      ? handleMonthChange(-1)
                      : handleYearChange(-1)
                  }
                  disabled={!canGoBack()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoBack()
                      ? "text-[color:var(--primary)]"
                      : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  ←
                </button>
                <span className="text-body-24 font-bold text-[color:var(--primary)] whitespace-nowrap px-2">
                  {selectedFilter === "Month"
                    ? `${monthNames[currentMonth]} ${currentYear}`
                    : currentYear}
                </span>
                <button
                  onClick={() =>
                    selectedFilter === "Month"
                      ? handleMonthChange(1)
                      : handleYearChange(1)
                  }
                  disabled={!canGoForward()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoForward()
                      ? "text-[color:var(--primary)]"
                      : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mobile-filter-bar md:hidden w-full flex justify-center fixed left-0 right-0 bottom-0 z-40 pointer-events-none pb-1">
        <div className="mobile-filter-container w-[90%] max-w-[90%] pointer-events-auto">
          <div
            className="w-full bg-[color:var(--inverse-color)] rounded-[30px] flex flex-col"
            style={{
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            {(selectedFilter === "Month" || selectedFilter === "Year") && (
              <div className="flex items-center justify-between py-4 px-4 border-b border-[color:var(--text-secondary)]/20">
                <button
                  onClick={() =>
                    selectedFilter === "Month"
                      ? handleMonthChange(-1)
                      : handleYearChange(-1)
                  }
                  disabled={!canGoBack()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoBack()
                      ? "text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  ←
                </button>
                <span className="text-body-24 font-bold text-[color:var(--text-primary)] px-4">
                  {selectedFilter === "Month"
                    ? `${monthNames[currentMonth]} ${currentYear}`
                    : currentYear}
                </span>
                <button
                  onClick={() =>
                    selectedFilter === "Month"
                      ? handleMonthChange(1)
                      : handleYearChange(1)
                  }
                  disabled={!canGoForward()}
                  className={`text-body-24 cursor-pointer px-2 ${
                    canGoForward()
                      ? "text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-secondary)] cursor-not-allowed opacity-50"
                  }`}
                >
                  →
                </button>
              </div>
            )}

            <div className="flex flex-row">
              {(["Month", "Year", "LifeTime"] as const).map((filter, index) => (
                <React.Fragment key={filter}>
                  <button
                    onClick={() => setSelectedFilter(filter)}
                    className={`flex-1 py-4 text-body-24 cursor-pointer ${
                      selectedFilter === filter
                        ? "font-bold text-[color:var(--text-primary)] bg-[color:var(--primary-20)]"
                        : "font-normal text-[color:var(--text-primary)]"
                    }`}
                  >
                    {filter}
                  </button>
                  {index < 2 && (
                    <div className="w-px bg-[color:var(--text-secondary)]/20"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
