"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { CalendarEvent } from "@/lib/calculations/stats";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";

interface EventsContextType {
  events: CalendarEvent[];
  refreshEvents: () => void;
  hiddenStateVersion: number; // Increment this to trigger re-renders when hidden state changes
  refreshHiddenState: () => void; // Call this when hidden state is saved
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ 
  children
}: { 
  children: ReactNode;
}) {
  const [uploadedEvents, setUploadedEvents] = useState<CalendarEvent[]>([]);
  const [hiddenStateVersion, setHiddenStateVersion] = useState(0);

  const loadUploadedCalendars = () => {
    if (typeof window === 'undefined') return [];
    
    try {
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      const allEvents: CalendarEvent[] = [];
      
      // Load title mappings from processing (original title -> processed title)
      const titleMappings = JSON.parse(localStorage.getItem('activityTitleMappings') || '{}');
      
      // Load removed event IDs
      const removedEventIds = new Set(JSON.parse(localStorage.getItem('removedEventIds') || '[]'));
      
      // Load hidden calendar IDs
      const hiddenCalendarIds = new Set(JSON.parse(localStorage.getItem('hiddenCalendarIds') || '[]'));
      
      // Load Google Calendar events stored separately
      const googleEvents = JSON.parse(localStorage.getItem('googleCalendarEvents') || '{}');
      
      for (const calendar of storedCalendars) {
        // Skip hidden calendars
        if (hiddenCalendarIds.has(calendar.id)) {
          continue;
        }
        let events: CalendarEvent[] = [];
        
        // Check if this is a Google calendar
        if (calendar.source === 'google' && calendar.googleCalendarId) {
          // Load events from googleEvents storage
          const calendarEvents = googleEvents[calendar.id] || [];
          // Convert date strings back to Date objects
          events = calendarEvents.map((e: any) => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
          }));
        } else if (calendar.icsText) {
          // Parse ICS file
          events = parseIcsToEventsBrowser(calendar.icsText, calendar.id);
        } else {
          console.warn(`Calendar ${calendar.id} has no icsText or Google events`);
          continue;
        }
        
        // Apply title mappings and filter removed events
        const processedEvents = events
          .filter((event) => !removedEventIds.has(event.id))
          .map((event) => {
            const mappedTitle = titleMappings[event.title];
            if (mappedTitle) {
              return { ...event, title: mappedTitle };
            }
            return event;
          });
        
        allEvents.push(...processedEvents);
      }
      
      return allEvents;
    } catch (error) {
      console.error('Error loading uploaded calendars:', error);
      return [];
    }
  };

  useEffect(() => {
    const loaded = loadUploadedCalendars();
    setUploadedEvents(loaded);
  }, []);

  const refreshEvents = () => {
    const loaded = loadUploadedCalendars();
    setUploadedEvents(loaded);
  };

  const refreshHiddenState = () => {
    setHiddenStateVersion(prev => prev + 1);
  };

  return (
    <EventsContext.Provider value={{ events: uploadedEvents, refreshEvents, hiddenStateVersion, refreshHiddenState }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}

