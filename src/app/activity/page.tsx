import { ActivityPageClientWrapper } from "@/components/ActivityPageClientWrapper";

interface ActivityPageProps {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = await searchParams;
  const searchString = params.search || "workout"; // Default to "workout" if no search param
  const searchType = params.type || "string"; // Default to string search
  const timeFilter = "All Time"; // Placeholder

  return (
    <ActivityPageClientWrapper 
      searchString={searchString}
      searchType={searchType}
      timeFilter={timeFilter}
    />
  );
}
