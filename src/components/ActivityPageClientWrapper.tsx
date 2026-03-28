"use client";

import { useEvents } from "@/contexts/EventsContext";
import { ActivityPageClient } from "@/components/ActivityPageClient";
import { FilterInitializer } from "@/components/FilterInitializer";

interface ActivityPageClientWrapperProps {
  searchString: string;
  timeFilter: string;
}

export function ActivityPageClientWrapper({ searchString, timeFilter }: ActivityPageClientWrapperProps) {
  const { events } = useEvents();

  return (
    <main className="mx-auto flex flex-col gap-12 px-18 py-12">
      <FilterInitializer events={events} />
      <ActivityPageClient 
        events={events}
        searchString={searchString}
        timeFilter={timeFilter}
      />
    </main>
  );
}



