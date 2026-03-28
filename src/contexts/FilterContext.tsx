"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type FilterType = "Month" | "Year" | "LifeTime";

interface FilterContextType {
  selectedFilter: FilterType;
  setSelectedFilter: (filter: FilterType) => void;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  currentMonth: number; // 0-11 (0 = January, 11 = December)
  setCurrentMonth: (month: number) => void;
  minDate: Date | null;
  setMinDate: (date: Date | null) => void;
  maxDate: Date | null;
  setMaxDate: (date: Date | null) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("LifeTime");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);

  // Clamp currentYear and currentMonth when minDate is set
  useEffect(() => {
    if (minDate) {
      const minYear = minDate.getFullYear();
      const minMonth = minDate.getMonth();
      const now = new Date();
      const currentYearValue = now.getFullYear();
      const currentMonthValue = now.getMonth();

      // Clamp year
      if (currentYear < minYear) {
        setCurrentYear(minYear);
      }
      if (currentYear > currentYearValue) {
        setCurrentYear(currentYearValue);
      }

      // Clamp month if in min year
      if (currentYear === minYear && currentMonth < minMonth) {
        setCurrentMonth(minMonth);
      }
      // Clamp month if in current year
      if (currentYear === currentYearValue && currentMonth > currentMonthValue) {
        setCurrentMonth(currentMonthValue);
      }
    }
  }, [minDate, currentYear, currentMonth]);

  return (
    <FilterContext.Provider
      value={{
        selectedFilter,
        setSelectedFilter,
        currentYear,
        setCurrentYear,
        currentMonth,
        setCurrentMonth,
        minDate,
        setMinDate,
        maxDate,
        setMaxDate,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
}

