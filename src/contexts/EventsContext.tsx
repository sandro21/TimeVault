"use client";

import { createContext, useContext, ReactNode } from "react";
import { CalendarEvent } from "@/lib/calculations/stats";

interface EventsContextType {
  events: CalendarEvent[];
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ 
  children, 
  events 
}: { 
  children: ReactNode;
  events: CalendarEvent[];
}) {
  return (
    <EventsContext.Provider value={{ events }}>
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

