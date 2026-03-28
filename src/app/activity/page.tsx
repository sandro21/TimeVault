import { ActivityPageClientWrapper } from "@/components/ActivityPageClientWrapper";
import type { Metadata } from "next";

interface ActivityPageProps {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export async function generateMetadata({ searchParams }: ActivityPageProps): Promise<Metadata> {
  const params = await searchParams;
  const activityName = params.search || "Activity";
  
  return {
    title: `${activityName} Analytics - MyCalendarStats`,
    description: `Detailed analytics and statistics for ${activityName}. View time logged, activity patterns, and insights about this calendar activity.`,
    openGraph: {
      title: `${activityName} Analytics - MyCalendarStats`,
      description: `Detailed analytics and statistics for ${activityName}.`,
      url: `https://mycalendarstats.com/activity?search=${encodeURIComponent(activityName)}`,
    },
  };
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
