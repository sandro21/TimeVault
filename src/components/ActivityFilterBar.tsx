"use client";

import { Upload, Filter, Search } from "lucide-react";
import { useState } from "react";

interface ActivityFilterBarProps {
  selectedFilter: "Month" | "Year" | "LifeTime" | "Custom";
  onFilterChange: (filter: "Month" | "Year" | "LifeTime" | "Custom") => void;
  currentYear: number;
  onYearChange: (year: number) => void;
}

export function ActivityFilterBar({
  selectedFilter,
  onFilterChange,
  currentYear,
  onYearChange,
}: ActivityFilterBarProps) {
  return (
    <div className="max-w-full h-[70px] flex items-center gap-4">
      {/* Left: Icons */}
      <div className="flex items-center gap-3">
        <div className="card-soft w-12 h-12 flex items-center justify-center cursor-pointer">
          <Upload size={20} className="text-[color:var(--text-primary)]" />
        </div>
        <div className="card-soft w-12 h-12 flex items-center justify-center cursor-pointer">
          <Filter size={20} className="text-[color:var(--text-primary)]" />
        </div>
      </div>

      {/* Center: Filter Options */}
      <div className="flex-1 flex flex-col items-center gap-2">
        {/* Filter Type Capsules */}
        <div className="flex items-center gap-2">
          {(["Month", "Year", "LifeTime", "Custom"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`card-soft px-4 py-2 text-body-24 ${
                selectedFilter === filter ? "font-bold" : "font-normal"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Year/Month Navigation (only shows for Month and Year) */}
        {(selectedFilter === "Month" || selectedFilter === "Year") && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onYearChange(currentYear - 1)}
              className="card-soft px-3 py-1 text-body-24 cursor-pointer"
            >
              ←
            </button>
            <span className="text-body-24 text-[color:var(--text-primary)]">{currentYear}</span>
            <button
              onClick={() => onYearChange(currentYear + 1)}
              className="card-soft px-3 py-1 text-body-24 cursor-pointer"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Right: Search Activity */}
      <div className="card-soft px-4 py-2 flex items-center gap-2 cursor-pointer">
        <Search size={18} className="text-[color:var(--text-primary)]" />
        <span className="text-body-24 text-[color:var(--text-primary)]">Search an activity</span>
      </div>
    </div>
  );
}



