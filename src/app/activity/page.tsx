import { ActivityPageClientWrapper } from "@/components/ActivityPageClientWrapper";

interface ActivityPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const searchString = params.search || "workout"; // Default to "workout" if no search param
  const timeFilter = "All Time"; // Placeholder

  return (
    <ActivityPageClientWrapper 
      searchString={searchString}
      timeFilter={timeFilter}
    />
  );
}
