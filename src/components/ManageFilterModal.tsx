"use client";

import { useState, useEffect, useMemo } from "react";
import { useEvents } from "@/contexts/EventsContext";
import { detectDataQualityIssues, DataQualityIssue } from "@/lib/calculations/activity-suggestions";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";
import { CalendarEvent } from "@/lib/calculations/stats";
import { Eye, EyeOff } from "lucide-react";

interface CalendarSource {
  id: string;
  name: string;
  icsText?: string;
  source?: 'google';
  googleCalendarId?: string;
  color?: string;
  accessRole?: string; // 'owner', 'writer', 'reader', 'freeBusyReader' - for Google calendars
}

interface ManageFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = "Calendars" | "Merge Similar" | "Hide Activities";
type HideActivitiesFilter = "Potential Problems" | "All Activities" | "Active" | "Hidden";

export function ManageFilterModal({ isOpen, onClose }: ManageFilterModalProps) {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("Calendars");
  const [pendingChanges, setPendingChanges] = useState(0);
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(new Set());
  const [hideActivitiesFilter, setHideActivitiesFilter] = useState<HideActivitiesFilter>("Potential Problems");
  const [pendingHiddenIssueIds, setPendingHiddenIssueIds] = useState<Set<string>>(new Set());
  const [initialHiddenIssueIds, setInitialHiddenIssueIds] = useState<Set<string>>(new Set());
  const [pendingHiddenActivityNames, setPendingHiddenActivityNames] = useState<Set<string>>(new Set());
  const [initialHiddenActivityNames, setInitialHiddenActivityNames] = useState<Set<string>>(new Set()); // Track initial state
  const [pendingHiddenCalendarIds, setPendingHiddenCalendarIds] = useState<Set<string>>(new Set());
  const [initialHiddenCalendarIds, setInitialHiddenCalendarIds] = useState<Set<string>>(new Set());
  const { events, refreshHiddenState } = useEvents();

  // Load calendars from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCalendars: CalendarSource[] = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
        setCalendars(storedCalendars);
        
        // Initialize all calendars as enabled
        const enabled = new Set<string>(storedCalendars.map((cal) => cal.id));
        setEnabledCalendars(enabled);
      } catch (error) {
        console.error('Error loading calendars:', error);
      }
    }
  }, [isOpen]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initialize hidden activities, issues, and calendars state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load from localStorage
      const storedActivities = typeof window !== 'undefined' ? localStorage.getItem('hiddenActivityNames') : null;
      const initialHiddenActivities = storedActivities ? new Set<string>(JSON.parse(storedActivities)) : new Set<string>();
      setInitialHiddenActivityNames(initialHiddenActivities);
      setPendingHiddenActivityNames(initialHiddenActivities);
      
      // Initialize hidden issues from localStorage
      const storedIssues = typeof window !== 'undefined' ? localStorage.getItem('hiddenIssueIds') : null;
      const initialHiddenIssues = storedIssues ? new Set<string>(JSON.parse(storedIssues)) : new Set<string>();
      setInitialHiddenIssueIds(initialHiddenIssues);
      setPendingHiddenIssueIds(initialHiddenIssues);
      
      // Initialize hidden calendars from localStorage
      const storedHiddenCalendars = typeof window !== 'undefined' ? localStorage.getItem('hiddenCalendarIds') : null;
      const initialHiddenCalendars = storedHiddenCalendars ? new Set<string>(JSON.parse(storedHiddenCalendars)) : new Set<string>();
      setInitialHiddenCalendarIds(initialHiddenCalendars);
      setPendingHiddenCalendarIds(initialHiddenCalendars);
    }
  }, [isOpen]); // Remove unused dependencies

  // Get event count for a calendar (including hidden calendars)
  const getEventCount = (calendarId: string): number => {
    if (typeof window === 'undefined') return 0;
    
    try {
      // Load events directly from localStorage to get true count (ignoring hidden calendar filter)
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      const calendar = storedCalendars.find((cal: CalendarSource) => cal.id === calendarId);
      if (!calendar) return 0;
      
      // Load removed event IDs
      const removedEventIds = new Set(JSON.parse(localStorage.getItem('removedEventIds') || '[]'));
      
      let calendarEvents: CalendarEvent[] = [];
      
      // Check if this is a Google calendar
      if (calendar.source === 'google' && calendar.googleCalendarId) {
        // Load events from googleEvents storage
        const googleEvents = JSON.parse(localStorage.getItem('googleCalendarEvents') || '{}');
        const storedEvents = googleEvents[calendar.id] || [];
        // Convert date strings back to Date objects
        calendarEvents = storedEvents.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
      } else if (calendar.icsText) {
        // Parse ICS file
        calendarEvents = parseIcsToEventsBrowser(calendar.icsText, calendar.id);
      }
      
      // Filter out removed events
      return calendarEvents.filter((event) => !removedEventIds.has(event.id)).length;
    } catch (error) {
      console.error('Error getting event count:', error);
      return 0;
    }
  };

  // Get calendar color (default to a color based on index if not set)
  const getCalendarColor = (calendar: CalendarSource, index: number): string => {
    if (calendar.color) return calendar.color;
    
    // Default colors array
    const defaultColors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#A855F7', // Purple
      '#F97316', // Orange
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F59E0B', // Amber
      '#8B5CF6', // Violet
    ];
    
    return defaultColors[index % defaultColors.length];
  };

  // Toggle calendar enabled state
  const toggleCalendar = (calendarId: string) => {
    const newEnabled = new Set(enabledCalendars);
    if (newEnabled.has(calendarId)) {
      newEnabled.delete(calendarId);
    } else {
      newEnabled.add(calendarId);
    }
    setEnabledCalendars(newEnabled);
    setPendingChanges(pendingChanges + 1);
  };

  // Get data quality issues
  const dataQualityIssues = useMemo(() => {
    return detectDataQualityIssues(events);
  }, [events]);

  // Format duration from minutes to readable format
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
    }
    const hours = Math.round(minutes / 60);
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
  };

  // Get red flag message based on issue type
  const getRedFlagMessage = (issue: DataQualityIssue): string => {
    switch (issue.type) {
      case "long_duration":
        return "Long Duration";
      case "zero_duration":
        return "Zero Duration";
      case "duplicate":
        return "Duplicate";
      case "future_event":
        return "Future Event";
      case "birthday":
        return "Birthday";
      case "recurring_holiday":
        return "Recurring Holiday";
      default:
        return "Issue";
    }
  };

  // Get calendar color for an event
  const getEventCalendarColor = (calendarId: string): string => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    if (calendar) {
      const index = calendars.indexOf(calendar);
      return getCalendarColor(calendar, index);
    }
    return '#3B82F6'; // Default blue
  };

  // Get calendar name for an event
  const getEventCalendarName = (calendarId: string): string => {
    const calendar = calendars.find(cal => cal.id === calendarId);
    return calendar?.name || calendarId;
  };

  // Get grouped activities with stats
  const groupedActivities = useMemo(() => {
    const grouped = new Map<string, { 
      name: string; 
      totalDuration: number; 
      count: number;
      calendarIds: Set<string>;
    }>();
    
    events.forEach(event => {
      if (!grouped.has(event.title)) {
        grouped.set(event.title, {
          name: event.title,
          totalDuration: 0,
          count: 0,
          calendarIds: new Set(),
        });
      }
      const activity = grouped.get(event.title)!;
      activity.totalDuration += event.durationMinutes;
      activity.count += 1;
      activity.calendarIds.add(event.calendarId);
    });
    
    return Array.from(grouped.values()).sort((a, b) => b.totalDuration - a.totalDuration);
  }, [events]);

  // Filter activities based on view (Active/Hidden use initial state, All Activities shows all)
  const getFilteredActivities = (filter: HideActivitiesFilter) => {
    if (filter === "All Activities") {
      return groupedActivities;
    } else if (filter === "Active") {
      // Active tab shows items that are NOT hidden in the initial/saved state
      return groupedActivities.filter(activity => !initialHiddenActivityNames.has(activity.name));
    } else if (filter === "Hidden") {
      // Hidden tab shows items that ARE hidden in the initial/saved state
      return groupedActivities.filter(activity => initialHiddenActivityNames.has(activity.name));
    }
    return [];
  };

  // Calculate pending changes count
  const pendingActivityChanges = Array.from(pendingHiddenActivityNames).filter(name => !initialHiddenActivityNames.has(name)).length +
                                 Array.from(initialHiddenActivityNames).filter(name => !pendingHiddenActivityNames.has(name)).length;
  
  const pendingCalendarChanges = Array.from(pendingHiddenCalendarIds).filter(id => !initialHiddenCalendarIds.has(id)).length +
                                 Array.from(initialHiddenCalendarIds).filter(id => !pendingHiddenCalendarIds.has(id)).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="modal-container pointer-events-auto relative z-10 grid grid-rows-[auto_1fr_auto]" style={{ gridTemplateColumns: '18% 1fr' }}>
        {/* 1. Top Bar - Full Width, spans both columns */}
        <div className="col-span-2 border-b border-[color:var(--text-secondary)] px-8 py-4">
          <h2 
            className="text-[32px] leading-[1.1] font-semibold"
            style={{ color: 'var(--text-primary)', margin: 0 }}
          >
            Manage and Filter
          </h2>
        </div>

        {/* 2. Left Sidebar - Vertical, Full Height */}
        <div className="border-r border-[color:var(--text-secondary)] px-6 py-6">
          <nav className="flex flex-col gap-4">
            {(["Calendars", "Hide Activities", "Merge Similar"] as MenuItem[]).map((item) => (
              <button
                key={item}
                onClick={() => setSelectedMenu(item)}
                className={`text-body-24 text-left ${
                  selectedMenu === item ? "font-semibold" : "font-normal"
                }`}
                style={{
                  fontWeight: selectedMenu === item ? 600 : 400
                }}
              >
                {item}
                {item === "Merge Similar" && " (Soon)"}
              </button>
            ))}
          </nav>
        </div>

        {/* 3. Right Side - Main Content Area */}
        <div className="flex flex-col min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {selectedMenu === "Calendars" && (() => {
              // Separate calendars into "Your Calendars" (owner/writer or ICS files) and "Others" (read-only)
              const yourCalendars = calendars.filter(cal => 
                !cal.source || // ICS files (no source)
                cal.accessRole === 'owner' || 
                cal.accessRole === 'writer' ||
                !cal.accessRole // If accessRole is not set, assume it's owned
              );
              const otherCalendars = calendars.filter(cal => 
                cal.accessRole === 'reader' || 
                cal.accessRole === 'freeBusyReader'
              );

              return (
                <div className="px-8 py-6 space-y-6">
                  {/* Your Calendars Section */}
                  {yourCalendars.length > 0 && (
                    <div>
                      <h3 className="text-[24px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Your Calendars
                      </h3>
                      
                      {/* Calendar List */}
                      <div className="space-y-4">
                        {yourCalendars.map((calendar, index) => {
                          const isHidden = pendingHiddenCalendarIds.has(calendar.id);
                          const eventCount = getEventCount(calendar.id);
                          const calendarColor = getCalendarColor(calendar, index);
                          
                          const toggleCalendar = () => {
                            setPendingHiddenCalendarIds(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(calendar.id)) {
                                newSet.delete(calendar.id);
                              } else {
                                newSet.add(calendar.id);
                              }
                              return newSet;
                            });
                            setPendingChanges(prev => prev + 1);
                          };
                          
                          return (
                            <div key={calendar.id} className="flex items-center gap-4">
                              {/* Toggle Switch */}
                              <button
                                onClick={toggleCalendar}
                                className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                                style={{
                                  backgroundColor: !isHidden ? 'var(--primary)' : 'rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                <span
                                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                                  style={{
                                    left: !isHidden ? 'calc(100% - 1rem - 4px)' : '4px',
                                  }}
                                />
                              </button>
                              
                              {/* Calendar Info */}
                              <div className="flex-1 flex flex-col min-w-0" style={{ lineHeight: '1.2' }}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span 
                                    className="text-[24px] font-medium truncate max-w-[300px]" 
                                    style={{ color: 'var(--text-primary)' }}
                                    title={calendar.name}
                                  >
                                    {calendar.name}
                                  </span>
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: calendarColor }}
                                  />
                                </div>
                                <p className="text-[18px] font-medium" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                  {eventCount} {eventCount === 1 ? 'Event' : 'Events'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Others Section (Read-only calendars) */}
                  {otherCalendars.length > 0 && (
                    <div>
                      <h3 className="text-[24px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Others
                      </h3>
                      
                      {/* Calendar List */}
                      <div className="space-y-4">
                        {otherCalendars.map((calendar, index) => {
                          const isHidden = pendingHiddenCalendarIds.has(calendar.id);
                          const eventCount = getEventCount(calendar.id);
                          // Use index offset for color calculation
                          const calendarColor = getCalendarColor(calendar, yourCalendars.length + index);
                          
                          const toggleCalendar = () => {
                            setPendingHiddenCalendarIds(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(calendar.id)) {
                                newSet.delete(calendar.id);
                              } else {
                                newSet.add(calendar.id);
                              }
                              return newSet;
                            });
                            setPendingChanges(prev => prev + 1);
                          };
                          
                          return (
                            <div key={calendar.id} className="flex items-center gap-4">
                              {/* Toggle Switch */}
                              <button
                                onClick={toggleCalendar}
                                className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                                style={{
                                  backgroundColor: !isHidden ? 'var(--primary)' : 'rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                <span
                                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                                  style={{
                                    left: !isHidden ? 'calc(100% - 1rem - 4px)' : '4px',
                                  }}
                                />
                              </button>
                              
                              {/* Calendar Info */}
                              <div className="flex-1 flex flex-col min-w-0" style={{ lineHeight: '1.2' }}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span 
                                    className="text-[24px] font-medium truncate max-w-[300px]" 
                                    style={{ color: 'var(--text-primary)' }}
                                    title={calendar.name}
                                  >
                                    {calendar.name}
                                  </span>
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: calendarColor }}
                                  />
                                </div>
                                <p className="text-[18px] font-medium" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                  {eventCount} {eventCount === 1 ? 'Event' : 'Events'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {selectedMenu === "Merge Similar" && (
              <div className="px-8 py-6">
                {/* Merge Activities content will go here */}
              </div>
            )}
            
            {selectedMenu === "Hide Activities" && (
              <div className="flex flex-col h-full">
                {/* Top: Filter Bar */}
                <div className="border-b border-[color:var(--text-secondary)]">
                  <div className="flex items-center">
                    {(["Potential Problems", "All Activities", "Active", "Hidden"] as HideActivitiesFilter[]).map((filter, index) => (
                      <button
                        key={filter}
                        onClick={() => setHideActivitiesFilter(filter)}
                        className="text-[24px] font-medium px-6 border-r border-[color:var(--text-secondary)]"
                        style={{
                          color: hideActivitiesFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)',
                          backgroundColor: hideActivitiesFilter === filter ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                        }}
                      >
                        {filter}
                        {filter === "Active" && ` (${getFilteredActivities("Active").length})`}
                        {filter === "Hidden" && ` (${getFilteredActivities("Hidden").length})`}
                      </button>
                    ))}
                    {/* Reset All button */}
                    <button
                      onClick={() => {
                        // Reset all hidden activities and issues
                        setPendingHiddenActivityNames(new Set());
                        setPendingHiddenIssueIds(new Set());
                        setInitialHiddenActivityNames(new Set());
                        setInitialHiddenIssueIds(new Set());
                      }}
                      className="text-[24px] font-medium px-6 border-r border-[color:var(--text-secondary)] last:border-r-0"
                      style={{
                        color: 'var(--primary)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      Reset All
                    </button>
                  </div>
                </div>
                
                {/* Bottom: Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {(["All Activities", "Active", "Hidden"] as HideActivitiesFilter[]).includes(hideActivitiesFilter) && (
                    <div className="px-8 py-6">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col style={{ width: '30%' }} />
                          <col style={{ width: '30%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="text-[18px] font-medium text-left pb-4" style={{ color: 'var(--text-primary)' }}>Name</th>
                            <th className="text-[18px] font-medium text-center pb-4 pl-10" style={{ color: 'var(--text-primary)' }}>Total Duration</th>
                            <th className="text-[18px] font-medium text-center pb-4 px-2" style={{ color: 'var(--text-primary)' }}>Count</th>
                            <th className="text-[18px] font-medium text-left pb-4 px-2" style={{ color: 'var(--text-primary)' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredActivities(hideActivitiesFilter).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-[18px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {hideActivitiesFilter === "Active" && "No active activities"}
                                {hideActivitiesFilter === "Hidden" && "No hidden activities"}
                                {hideActivitiesFilter === "All Activities" && "No activities found"}
                              </td>
                            </tr>
                          ) : (
                            getFilteredActivities(hideActivitiesFilter).map((activity) => {
                              // Visual state uses pending changes (for graying out)
                              const isPendingHidden = pendingHiddenActivityNames.has(activity.name);
                              // But Active/Hidden tabs filter by initial state
                              const calendarIds = Array.from(activity.calendarIds);
                              const primaryCalendarId = calendarIds[0];
                              const calendarColor = getEventCalendarColor(primaryCalendarId);
                              
                              const toggleVisibility = () => {
                                setPendingHiddenActivityNames(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(activity.name)) {
                                    newSet.delete(activity.name);
                                  } else {
                                    newSet.add(activity.name);
                                  }
                                  return newSet;
                                });
                              };
                              
                              return (
                                <tr key={activity.name} className={isPendingHidden ? "opacity-50" : ""}>
                                  <td className="py-2 overflow-hidden pr-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[18px] font-medium truncate flex-1 min-w-0" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                        {activity.name}
                                      </span>
                                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: calendarColor, opacity: isPendingHidden ? 0.5 : 1 }} />
                                    </div>
                                  </td>
                                  <td className="py-2 pl-10 text-[18px] font-medium text-center" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    {formatDuration(activity.totalDuration)}
                                  </td>
                                  <td className="py-2 px-2 text-[18px] font-medium text-center" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    {activity.count}
                                  </td>
                                  <td className="py-2 px-2">
                                    <button
                                      onClick={toggleVisibility}
                                      className="flex items-center justify-center p-2 rounded hover:bg-[color:var(--text-secondary)]/10 transition-all"
                                      type="button"
                                      title={isPendingHidden ? "Show" : "Hide"}
                                    >
                                      {isPendingHidden ? (
                                        <EyeOff size={20} style={{ color: 'var(--text-secondary)' }} />
                                      ) : (
                                        <Eye size={20} style={{ color: 'var(--text-primary)' }} />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {hideActivitiesFilter === "Potential Problems" && (
                    <div className="px-8 py-6">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col style={{ width: '35%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '25%' }} />
                          <col style={{ width: '5%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="text-[18px] font-medium text-left pb-4" style={{ color: 'var(--text-primary)' }}>Name</th>
                            <th className="text-[18px] font-medium text-left pb-4 pl-10" style={{ color: 'var(--text-primary)' }}>Date</th>
                            <th className="text-[18px] font-medium text-center pb-4 px-2" style={{ color: 'var(--text-primary)' }}>Duration</th>
                            <th className="text-[18px] font-medium text-center pb-4 px-2" style={{ color: 'var(--text-primary)' }}>🚩</th>
                            <th className="text-[18px] font-medium text-left pb-4 px-2" style={{ color: 'var(--text-primary)' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataQualityIssues.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-[18px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                No potential problems found
                              </td>
                            </tr>
                          ) : (
                            dataQualityIssues.map((issue) => {
                              const calendarColor = getEventCalendarColor(issue.event.calendarId);
                              const calendarName = getEventCalendarName(issue.event.calendarId);
                              const dateStr = issue.event.start.toLocaleDateString('en-US', { 
                                month: '2-digit', 
                                day: '2-digit', 
                                year: 'numeric' 
                              });
                              const issueKey = `${issue.event.id}-${issue.type}`;
                              // An issue is hidden if either the issue itself is hidden OR the activity is hidden
                              const isPendingHidden = pendingHiddenIssueIds.has(issueKey) || pendingHiddenActivityNames.has(issue.event.title);
                              
                              const toggleVisibility = () => {
                                setPendingHiddenIssueIds(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(issueKey)) {
                                    newSet.delete(issueKey);
                                    // Also remove the activity from hidden activities if unhiding
                                    setPendingHiddenActivityNames(prevActivities => {
                                      const newActivities = new Set(prevActivities);
                                      newActivities.delete(issue.event.title);
                                      return newActivities;
                                    });
                                  } else {
                                    newSet.add(issueKey);
                                    // Also add the activity to hidden activities when hiding an issue
                                    setPendingHiddenActivityNames(prevActivities => {
                                      const newActivities = new Set(prevActivities);
                                      newActivities.add(issue.event.title);
                                      return newActivities;
                                    });
                                  }
                                  return newSet;
                                });
                              };
                              
                              return (
                                <tr key={issueKey} className={isPendingHidden ? "opacity-50" : ""}>
                                  <td className="py-2 overflow-hidden pr-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[18px] font-medium truncate" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                        {issue.event.title}
                                      </span>
                                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: calendarColor, opacity: isPendingHidden ? 0.5 : 1 }} />
                                    </div>
                                  </td>
                                  <td className="py-2 pl-10 text-[18px] font-medium" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    {dateStr}
                                  </td>
                                  <td className="py-2 px-2 text-[18px] font-medium text-center" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    {formatDuration(issue.event.durationMinutes)}
                                  </td>
                                  <td className="py-2 px-2 text-[18px] font-medium text-center" style={{ color: isPendingHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                    {getRedFlagMessage(issue)}
                                  </td>
                                  <td className="py-2 px-2">
                                    <button
                                      onClick={toggleVisibility}
                                      className="flex items-center justify-center p-2 rounded hover:bg-[color:var(--text-secondary)]/10 transition-all"
                                      type="button"
                                      title={isPendingHidden ? "Show" : "Hide"}
                                    >
                                      {isPendingHidden ? (
                                        <EyeOff size={20} style={{ color: 'var(--text-secondary)' }} />
                                      ) : (
                                        <Eye size={20} style={{ color: 'var(--text-primary)' }} />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Bottom Bar */}
          <div className="border-t border-[color:var(--text-secondary)] px-8 py-1.5 flex items-center justify-between">
            {/* Left: Pending Changes */}
            <div className="text-body-24" style={{ color: 'var(--text-secondary)' }}>
              {pendingChanges + pendingActivityChanges + pendingCalendarChanges} Pending {(pendingChanges + pendingActivityChanges + pendingCalendarChanges) === 1 ? 'Change' : 'Changes'}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Reset pending changes
                  setPendingHiddenActivityNames(new Set(initialHiddenActivityNames));
                  setPendingHiddenIssueIds(new Set(initialHiddenIssueIds));
                  setPendingHiddenCalendarIds(new Set(initialHiddenCalendarIds));
                  onClose();
                }}
                className="px-4 py-1 rounded-full text-body-24 font-semibold border border-[color:var(--text-primary)]"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Update initial state to match pending (for next modal open)
                  setInitialHiddenActivityNames(new Set(pendingHiddenActivityNames));
                  setInitialHiddenIssueIds(new Set(pendingHiddenIssueIds));
                  setInitialHiddenCalendarIds(new Set(pendingHiddenCalendarIds));
                  
                  // Save to localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('hiddenActivityNames', JSON.stringify(Array.from(pendingHiddenActivityNames)));
                    localStorage.setItem('hiddenIssueIds', JSON.stringify(Array.from(pendingHiddenIssueIds)));
                    localStorage.setItem('hiddenCalendarIds', JSON.stringify(Array.from(pendingHiddenCalendarIds)));
                  }
                  
                  // Notify components that hidden state changed (triggers re-render)
                  refreshHiddenState();
                  
                  // Show message to user
                  alert('Filter Applied. PLEASE REFRESH THE PAGE!');
                  
                  onClose();
                }}
                className="px-4 py-1 rounded-full text-body-24 font-semibold"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--inverse-color)',
                }}
              >
                Save and Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

