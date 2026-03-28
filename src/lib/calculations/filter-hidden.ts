import { CalendarEvent } from "./stats";
import { detectDataQualityIssues } from "./activity-suggestions";

/**
 * Filter out hidden activities and issues from events for statistics calculations
 * This keeps all events in the data but excludes hidden ones from stats
 */
export function filterHiddenEvents(events: CalendarEvent[]): CalendarEvent[] {
  if (typeof window === 'undefined') return events;
  
  try {
    // Load hidden activity names
    const hiddenActivityNames = new Set(JSON.parse(localStorage.getItem('hiddenActivityNames') || '[]'));
    
    // Load hidden issue IDs
    const hiddenIssueIds = new Set(JSON.parse(localStorage.getItem('hiddenIssueIds') || '[]'));
    
    // If nothing is hidden, return all events
    if (hiddenActivityNames.size === 0 && hiddenIssueIds.size === 0) {
      return events;
    }
    
    // Detect all issues to check which events should be filtered
    let eventsWithHiddenIssues = new Set<string>();
    if (hiddenIssueIds.size > 0) {
      const allIssues = detectDataQualityIssues(events);
      allIssues.forEach(issue => {
        const issueKey = `${issue.event.id}-${issue.type}`;
        if (hiddenIssueIds.has(issueKey)) {
          eventsWithHiddenIssues.add(issue.event.id);
        }
      });
    }
    
    // Filter events based on hidden activities and issues
    return events.filter((event) => {
      // Filter out hidden activities
      if (hiddenActivityNames.has(event.title)) return false;
      
      // Filter out events with hidden issues
      if (eventsWithHiddenIssues.has(event.id)) return false;
      
      return true;
    });
  } catch (error) {
    console.error('Error filtering hidden events:', error);
    return events;
  }
}






