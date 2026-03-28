"use client";

import { ProcessCalendarClient } from "@/components/ProcessCalendarClient";
import { useEvents } from "@/contexts/EventsContext";

export default function ProcessPage() {
  const { events } = useEvents();
  
  return (
    <main className="min-h-screen px-18 py-12">
      <ProcessCalendarClient events={events} />
    </main>
  );
}

