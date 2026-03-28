import { AllActivityPageClient } from "@/components/AllActivityPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Activities - MyCalendarStats",
  description: "View comprehensive statistics and analytics for all your calendar activities. Track time logged, analyze top activities, and discover patterns in how you spend your time.",
  openGraph: {
    title: "All Activities - MyCalendarStats",
    description: "View comprehensive statistics and analytics for all your calendar activities.",
    url: "https://mycalendarstats.com/all-activity",
  },
};

export default function AllActivityPage() {
  return <AllActivityPageClient />;
}

