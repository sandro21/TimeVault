"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarEvent } from "@/lib/calculations/stats";
import { getUniqueActivities, filterActivitiesBySearch, ActivityOption } from "@/lib/calculations/get-activities";

interface ActivitySearchProps {
  events: CalendarEvent[];
}

export function ActivitySearch({ events }: ActivitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchingActivities, setMatchingActivities] = useState<ActivityOption[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get current search param and set it as the search term if on activity page
  useEffect(() => {
    if (searchParams && pathname === "/activity") {
      const currentSearch = searchParams.get("search");
      if (currentSearch) {
        setSearchTerm(currentSearch);
      }
    } else if (pathname !== "/activity") {
      // Clear search term when not on activity page
      setSearchTerm("");
    }
  }, [searchParams, pathname]);
  
  const isOnActivityPage = pathname === "/activity";

  // Get all unique activities
  const allActivities = getUniqueActivities(events);

  // Calculate total event count for search term (substring matching)
  const getTotalEventCountForSearch = (search: string): number => {
    if (!search || search.trim().length < 1) return 0;
    const normalizedSearch = search.toLowerCase().trim();
    return events.filter(event => 
      event.title.toLowerCase().includes(normalizedSearch)
    ).length;
  };

  // Filter activities based on search term
  useEffect(() => {
    if (searchTerm.trim().length >= 1) {
      const filtered = filterActivitiesBySearch(allActivities, searchTerm);
      setMatchingActivities(filtered);
      setIsOpen(true);
    } else {
      setMatchingActivities([]);
      setIsOpen(false);
    }
  }, [searchTerm, allActivities, events]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleActivitySelect = (activityName: string) => {
    setSearchTerm(activityName); // Keep the activity name in the search bar
    setIsOpen(false);
    router.push(`/activity?search=${encodeURIComponent(activityName)}`);
  };

  const handleSearch = (searchValue: string) => {
    if (searchValue.trim().length >= 1) {
      setSearchTerm(searchValue.trim()); // Keep the search term in the search bar
      setIsOpen(false);
      router.push(`/activity?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleBackToHome = () => {
    setSearchTerm("");
    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(searchTerm);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.trim().length >= 1) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    if (isOnActivityPage) {
      // If on activity page, clear and go back to home
      handleBackToHome();
    } else {
      // If on home page, just clear the input
      setSearchTerm("");
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={searchRef}>
      <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer min-w-[200px]">
        <Search size={18} className="text-black flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search an activity"
          className="text-body-24 text-black bg-transparent border-none outline-none flex-1 min-w-0"
        />
      </div>
      {(searchTerm || isOnActivityPage) && (
        <button
          onClick={handleClear}
          className="flex-shrink-0 hover:opacity-70 bg-white w-10 h-10 rounded-full flex items-center justify-center"
          type="button"
          title={isOnActivityPage ? "Back to all activities" : "Clear search"}
        >
          <X size={18} className="text-black" />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && matchingActivities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[300px] overflow-y-auto">
          {/* Show total count for search term at the top */}
          <button
            onClick={() => handleSearch(searchTerm)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-100"
            type="button"
          >
            <span className="text-body-24 text-black font-semibold">
              Search "{searchTerm}"
            </span>
            <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
              {getTotalEventCountForSearch(searchTerm)} {getTotalEventCountForSearch(searchTerm) === 1 ? "event" : "events"}
            </span>
          </button>
          {/* Show individual matching activities below */}
          {matchingActivities.map((activity) => (
            <button
              key={activity.name}
              onClick={() => handleActivitySelect(activity.name)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              type="button"
            >
              <span className="text-body-24 text-black truncate">{activity.name}</span>
              <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                {activity.count} {activity.count === 1 ? "event" : "events"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchTerm.trim().length >= 1 && matchingActivities.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 px-4 py-3">
          <span className="text-body-24 text-gray-500">No activities found</span>
        </div>
      )}
    </div>
  );
}

