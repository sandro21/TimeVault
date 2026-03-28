import { loadLocalCalendars } from "@/lib/calculations/load-local-calendars";
import { ActivityPageClient } from "@/components/ActivityPageClient";
import { FilterInitializer } from "@/components/FilterInitializer";

interface ActivityPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const searchString = params.search || "workout"; // Default to "workout" if no search param
  const timeFilter = "All Time"; // Placeholder
  
  const events = loadLocalCalendars([
    { id: "fitness", fileName: "fitness.ics" },
    { id: "career", fileName: "career.ics" },
  ]);

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
