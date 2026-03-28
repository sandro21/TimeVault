"use client";

import { useEvents } from "@/contexts/EventsContext";
import { FilterInitializer } from "@/components/FilterInitializer";
import { DashboardClient } from "@/components/DashboardClient";

export function AllActivityPageClient() {
  const { events } = useEvents();

  return (
    <main className="flex-col gap-18 px-18 py-12">
      <FilterInitializer events={events} />
      <DashboardClient events={events} />
    </main>
  );
}



