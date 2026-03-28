import { CalendarEvent, createCalendarEvent } from "./stats";

/**
 * Browser-compatible ICS parser
 * Parses basic ICS format without external dependencies
 */
export function parseIcsToEventsBrowser(icsText: string, calendarId: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  // Split by BEGIN:VEVENT
  const eventBlocks = icsText.split(/BEGIN:VEVENT/i);
  
  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i];
    
    // Extract UID
    const uidMatch = block.match(/UID[:\s]+([^\r\n]+)/i);
    const uid = uidMatch ? uidMatch[1].trim() : `event-${i}-${Date.now()}`;
    
    // Extract SUMMARY (title)
    const summaryMatch = block.match(/SUMMARY[:\s]+([^\r\n]+)/i);
    const title = summaryMatch ? summaryMatch[1].trim() : "Untitled";
    
    // Extract DTSTART
    const dtstartMatch = block.match(/DTSTART[^:]*:([^\r\n]+)/i);
    if (!dtstartMatch) continue;
    
    const dtstartValue = dtstartMatch[1].trim();
    const start = parseICSDate(dtstartValue);
    if (!start) continue;
    
    // Extract DTEND or calculate from DURATION
    let end: Date | null;
    const dtendMatch = block.match(/DTEND[^:]*:([^\r\n]+)/i);
    if (dtendMatch) {
      const dtendValue = dtendMatch[1].trim();
      end = parseICSDate(dtendValue);
      if (!end) continue;
    } else {
      // Try DURATION
      const durationMatch = block.match(/DURATION[:\s]+([^\r\n]+)/i);
      if (durationMatch) {
        const duration = parseDuration(durationMatch[1].trim());
        end = new Date(start.getTime() + duration);
      } else {
        // Default to 1 hour if no end time
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
    }
    
    // Check if all-day event
    const isAllDay = dtstartValue.length === 8 || block.includes('VALUE=DATE');
    
    const event = createCalendarEvent({
      id: uid,
      calendarId,
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
 * Parse ICS date/time values.
 * - Compact form ending in Z (UTC) must use UTC — otherwise wall-clock digits are misread as local (typical ~5h error in US/Eastern).
 * - No Z / floating time: treat as local wall time (matches most desktop exports for "same timezone" users).
 * - All-day: YYYYMMDD only.
 */
function parseICSDate(dateString: string): Date | null {
  try {
    const raw = dateString.trim();
    const isUtc = /Z$/i.test(raw);

    // Optional colons: 20250115T14:00:00 or 20250115T140000
    const compact = raw.replace(/Z$/i, "").replace(/:/g, "");

    // All-day: YYYYMMDD (no time part)
    if (/^\d{8}$/.test(compact)) {
      const year = parseInt(compact.substring(0, 4), 10);
      const month = parseInt(compact.substring(4, 6), 10) - 1;
      const day = parseInt(compact.substring(6, 8), 10);
      return new Date(year, month, day);
    }

    const m = compact.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/
    );
    if (!m) {
      return null;
    }

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const second = parseInt(m[6], 10);

    if (isUtc) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    console.error("Error parsing date:", dateString, e);
    return null;
  }
}

function parseDuration(durationString: string): number {
  // Parse ISO 8601 duration format: PT1H30M or P1D
  let totalMs = 0;
  
  // Days
  const daysMatch = durationString.match(/(\d+)D/i);
  if (daysMatch) {
    totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
  }
  
  // Hours
  const hoursMatch = durationString.match(/(\d+)H/i);
  if (hoursMatch) {
    totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
  }
  
  // Minutes
  const minutesMatch = durationString.match(/(\d+)M/i);
  if (minutesMatch) {
    totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
  }
  
  // Seconds
  const secondsMatch = durationString.match(/(\d+)S/i);
  if (secondsMatch) {
    totalMs += parseInt(secondsMatch[1]) * 1000;
  }
  
  return totalMs;
}



