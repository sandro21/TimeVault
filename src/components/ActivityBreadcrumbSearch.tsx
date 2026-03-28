"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarEvent } from "@/lib/calculations/stats";
import { getUniqueActivities, filterActivitiesBySearch, ActivityOption } from "@/lib/calculations/get-activities";

interface ActivityBreadcrumbSearchProps {
  events: CalendarEvent[];
}

export function ActivityBreadcrumbSearch({ events }: ActivityBreadcrumbSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchingActivities, setMatchingActivities] = useState<ActivityOption[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get current search param to display in breadcrumb
  const currentActivity = pathname === "/activity" ? (searchParams?.get("search") || null) : null;
  const searchType = (searchParams?.get("type") || "string");
  
  // Get all unique activities - memoize to prevent recalculation
  const allActivities = useMemo(() => getUniqueActivities(events), [events]);

  // Calculate total event count for search term (substring matching)
  const getTotalEventCountForSearch = useMemo(() => {
    return (search: string): number => {
      if (!search || search.trim().length < 1) return 0;
      const normalizedSearch = search.toLowerCase().trim();
      return events.filter(event => 
        event.title.toLowerCase().includes(normalizedSearch)
      ).length;
    };
  }, [events]);

  // Filter activities based on search term
  useEffect(() => {
    if (searchTerm.trim().length >= 1) {
      const filtered = filterActivitiesBySearch(allActivities, searchTerm);
      setMatchingActivities(filtered);
    } else {
      setMatchingActivities(allActivities.slice(0, 10)); // Show top 10 when no search
    }
  }, [searchTerm, allActivities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard shortcut (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isOpen && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleBreadcrumbClick = () => {
    if (currentActivity) {
      // If on activity page, set search term to current activity and open for editing
      setSearchTerm(currentActivity);
      setIsOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
        // Select all text so user can easily replace it
        inputRef.current?.select();
      }, 0);
    } else {
      // If on all activities, open search
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleAllActivitiesClick = () => {
    setSearchTerm("");
    setIsOpen(false);
    router.push("/all-activity");
  };

  const handleActivitySelect = (activityName: string) => {
    setSearchTerm("");
    setIsOpen(false);
    // Event search - exact match
    router.push(`/activity?search=${encodeURIComponent(activityName)}&type=event`);
  };

  const handleStringSearch = (searchValue: string) => {
    if (searchValue.trim().length >= 1) {
      setSearchTerm("");
      setIsOpen(false);
      // String search - substring matching
      router.push(`/activity?search=${encodeURIComponent(searchValue.trim())}&type=string`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchTerm.trim()) {
        // If there's a search term, do string search
        handleStringSearch(searchTerm);
      } else if (matchingActivities.length > 0) {
        // Otherwise select first activity
        handleActivitySelect(matchingActivities[0].name);
      }
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Breadcrumb Display */}
      <div className="flex items-center gap-2 group">
        {isOpen ? (
          // State 2: Editing - Show inline input
          <>
            <span 
              className="text-body-24 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleAllActivitiesClick();
              }}
            >
              All Activities
            </span>
            <span className="text-body-24 text-[color:var(--text-secondary)]">/</span>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Type to filter..."
              className="text-body-24 bg-transparent border-none outline-none min-w-0 placeholder:text-[color:var(--text-secondary)] placeholder:opacity-50 text-[color:var(--text-primary)] font-semibold"
              style={{ width: searchTerm ? `${searchTerm.length + 2}ch` : '12ch' }}
              autoFocus
            />
            <Search 
              size={20} 
              className="text-[color:var(--text-secondary)]" 
            />
          </>
        ) : currentActivity ? (
          // State 3: Filtered View - "All Activities / Activity Name"
          <>
            <span 
              className="text-body-24 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleAllActivitiesClick();
              }}
            >
              All Activities
            </span>
            <span className="text-body-24 text-[color:var(--text-secondary)]">/</span>
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleBreadcrumbClick}>
              <span className="text-body-24 text-[color:var(--text-primary)] font-semibold">
                {currentActivity}
              </span>
              <ChevronDown 
                size={20} 
                className="text-[color:var(--text-secondary)]" 
              />
            </div>
          </>
        ) : (
          // State 1: Default View - "All Activities / Type to filter..."
          <>
            <span className="text-body-24 text-[color:var(--text-primary)] font-semibold">
              All Activities
            </span>
            <span className="text-body-24 text-[color:var(--text-secondary)]">/</span>
            <span 
              className="text-body-24 text-[color:var(--text-secondary)] opacity-50 group-hover:opacity-70 transition-opacity cursor-pointer"
              onClick={handleBreadcrumbClick}
            >
              Type to filter...
            </span>
            <Search 
              size={20} 
              className="text-[color:var(--text-secondary)] opacity-50 group-hover:opacity-100 transition-opacity" 
            />
          </>
        )}
      </div>

      {/* Dropdown - Activity List */}
      {isOpen && (searchTerm.trim().length >= 1 || matchingActivities.length > 0) && (
        <div 
          className="absolute top-full left-0 mt-2 rounded-2xl shadow-lg border border-[color:var(--text-secondary)]/2 z-50 w-[400px] overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Activity List */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {/* Show total count for search term at the top (if there's a search term) */}
            {searchTerm.trim().length >= 1 && (
              <button
                onClick={() => handleStringSearch(searchTerm)}
                className="w-full px-4 py-3 text-left hover:bg-[color:var(--primary-10)] transition-colors flex items-center justify-between border-b border-[color:var(--text-secondary)]/20"
                type="button"
              >
                <span className="text-body-24 font-semibold text-[color:var(--text-primary)]">
                  Search "{searchTerm}"
                </span>
                <span className="text-sm text-[color:var(--text-secondary)] ml-2 flex-shrink-0">
                  {getTotalEventCountForSearch(searchTerm)} {getTotalEventCountForSearch(searchTerm) === 1 ? "event" : "events"}
                </span>
              </button>
            )}
            
            {/* Show individual matching activities below */}
            {matchingActivities.map((activity) => (
              <button
                key={activity.name}
                onClick={() => handleActivitySelect(activity.name)}
                className="w-full px-4 py-3 text-left hover:bg-[color:var(--primary-10)] transition-colors flex items-center justify-between group"
                type="button"
              >
                <span className="text-body-24 truncate text-[color:var(--text-primary)]">
                  {activity.name}
                </span>
                <span className="text-sm text-[color:var(--text-secondary)] ml-2 flex-shrink-0">
                  {activity.count} {activity.count === 1 ? "event" : "events"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

