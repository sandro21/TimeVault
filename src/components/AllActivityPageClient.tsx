"use client";

import { useEvents } from "@/contexts/EventsContext";
import { FilterInitializer } from "@/components/FilterInitializer";
import { DashboardClient } from "@/components/DashboardClient";

export function AllActivityPageClient() {
  const { events } = useEvents();

  return (
    <main className="page-container">
      <FilterInitializer events={events} />
      <DashboardClient events={events} />
    </main>
  );
}



