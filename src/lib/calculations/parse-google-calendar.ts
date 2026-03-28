import { CalendarEvent, createCalendarEvent } from "./stats";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

/**
 * Convert Google Calendar events to our CalendarEvent format
 */
export function parseGoogleCalendarEvents(
  googleEvents: GoogleCalendarEventsResponse,
  calendarId: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (!googleEvents.items || googleEvents.items.length === 0) {
    return events;
  }

  for (const gEvent of googleEvents.items) {
    // Skip cancelled events
    if (gEvent.status === 'cancelled') {
      continue;
    }

    // Get title
    const title = gEvent.summary || "Untitled";

    // Parse start date/time
    let start: Date;
    let isAllDay = false;

    if (gEvent.start.dateTime) {
      start = new Date(gEvent.start.dateTime);
    } else if (gEvent.start.date) {
      start = new Date(gEvent.start.date);
      isAllDay = true;
    } else {
      continue; // Skip events without start time
    }

    // Parse end date/time
    let end: Date;

    if (gEvent.end.dateTime) {
      end = new Date(gEvent.end.dateTime);
    } else if (gEvent.end.date) {
      end = new Date(gEvent.end.date);
      isAllDay = true;
    } else {
      // Default to 1 hour if no end time
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    // Create calendar event
    const event = createCalendarEvent({
      id: `google-${calendarId}-${gEvent.id}`,
      calendarId: `google-${calendarId}`,
      title,
      start,
      end,
      isAllDay,
    });

    events.push(event);
  }

  return events;
}

/**
 * Fetch all events from a Google Calendar (handles pagination)
 */
export async function fetchAllGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  let allEvents: CalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );
    
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('maxResults', '2500');
    
    if (timeMin) {
      url.searchParams.append('timeMin', timeMin);
    }
    if (timeMax) {
      url.searchParams.append('timeMax', timeMax);
    }
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }

    const data: GoogleCalendarEventsResponse = await response.json();
    const events = parseGoogleCalendarEvents(data, calendarId);
    allEvents = [...allEvents, ...events];

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allEvents;
}

