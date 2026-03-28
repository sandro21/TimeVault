"use client";

import { Suspense } from "react";
import { ActivityBreadcrumbSearch } from "./ActivityBreadcrumbSearch";
import { CalendarEvent } from "@/lib/calculations/stats";

interface ActivityBreadcrumbSearchWrapperProps {
  events: CalendarEvent[];
}

function ActivityBreadcrumbSearchFallback() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-body-24 text-[color:var(--text-primary)] font-semibold">
        All Activities
      </span>
      <span className="text-body-24 text-[color:var(--text-secondary)]">/</span>
      <span className="text-body-24 text-[color:var(--text-secondary)] opacity-50">
        Loading...
      </span>
    </div>
  );
}

export function ActivityBreadcrumbSearchWrapper({ events }: ActivityBreadcrumbSearchWrapperProps) {
  return (
    <Suspense fallback={<ActivityBreadcrumbSearchFallback />}>
      <ActivityBreadcrumbSearch events={events} />
    </Suspense>
  );
}


