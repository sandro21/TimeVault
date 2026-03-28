"use client";

import { Suspense } from "react";
import { ActivitySearch } from "./ActivitySearch";
import { CalendarEvent } from "@/lib/calculations/stats";

interface ActivitySearchWrapperProps {
  events: CalendarEvent[];
}

function ActivitySearchFallback() {
  return (
    <div className="relative flex items-center gap-2">
      <div className="bg-[color:var(--bg-white)] px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer min-w-[200px]">
        <div className="h-[18px] w-[18px] bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ActivitySearchWrapper({ events }: ActivitySearchWrapperProps) {
  return (
    <Suspense fallback={<ActivitySearchFallback />}>
      <ActivitySearch events={events} />
    </Suspense>
  );
}


