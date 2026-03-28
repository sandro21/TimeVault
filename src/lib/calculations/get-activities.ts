import { CalendarEvent } from "./stats";

export interface ActivityOption {
  name: string;
  count: number;
}

/**
 * Get all unique activities from events with their event counts
 * Returns activities sorted by count (descending)
 */
export function getUniqueActivities(events: CalendarEvent[]): ActivityOption[] {
  const activityMap = new Map<string, number>();
  
  for (const event of events) {
    const title = event.title;
    const currentCount = activityMap.get(title) || 0;
    activityMap.set(title, currentCount + 1);
  }

  const activities: ActivityOption[] = [];
  for (const [name, count] of activityMap.entries()) {
    activities.push({ name, count });
  }

  // Sort by count descending
  activities.sort((a, b) => b.count - a.count);

  return activities;
}

/**
 * Filter activities by search term using substring matching (case-insensitive)
 */
export function filterActivitiesBySearch(
  activities: ActivityOption[],
  searchTerm: string
): ActivityOption[] {
  if (!searchTerm || searchTerm.trim().length < 1) {
    return activities.slice(0, 10); // Return top 10 if no search
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return activities
    .filter(activity => 
      activity.name.toLowerCase().includes(normalizedSearch)
    )
    .slice(0, 10); // Limit to 10 results
}

