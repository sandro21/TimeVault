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
    let end: Date;
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

function parseICSDate(dateString: string): Date | null {
  try {
    // Remove timezone info and colons for parsing
    // Format: YYYYMMDDTHHMMSS or YYYYMMDD
    const cleanDate = dateString.replace(/[TZ:]/g, ' ').trim();
    
    if (cleanDate.length === 8) {
      // All-day event: YYYYMMDD
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      return new Date(year, month, day);
    } else if (cleanDate.length >= 14) {
      // Date-time: YYYYMMDD HHMMSS
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      const hour = parseInt(cleanDate.substring(9, 11) || '0');
      const minute = parseInt(cleanDate.substring(11, 13) || '0');
      const second = parseInt(cleanDate.substring(13, 15) || '0');
      return new Date(year, month, day, hour, minute, second);
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing date:', dateString, e);
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



