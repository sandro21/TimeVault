import { CalendarEvent } from "./stats";

export interface MergeSuggestion {
  activities: string[];
  suggestedName: string;
  confidence: number; // 0-1
  eventCount: number;
  totalMinutes: number;
}

export interface DataQualityIssue {
  type: "long_duration" | "zero_duration" | "duplicate" | "future_event" | "birthday" | "recurring_holiday";
  event: CalendarEvent;
  message: string;
  severity: "warning" | "error";
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize activity name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Calculate similarity score between two activity names (0-1)
 */
function calculateSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match after normalization
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return shorter / longer;
  }

  // Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;

  return 1 - distance / maxLen;
}

/**
 * Get unique activity names from events
 */
function getUniqueActivities(events: CalendarEvent[]): string[] {
  const activitySet = new Set<string>();
  events.forEach((event) => activitySet.add(event.title));
  return Array.from(activitySet);
}

/**
 * Suggest canonical name for a group of activities
 */
function suggestCanonicalName(activities: string[]): string {
  if (activities.length === 0) return "";
  if (activities.length === 1) return activities[0];

  // Find the most common capitalization pattern
  const capitalized = activities.filter((a) => /^[A-Z]/.test(a));
  if (capitalized.length > 0) {
    // Return the longest capitalized name
    return capitalized.reduce((a, b) => (a.length > b.length ? a : b));
  }

  // Return the longest name
  return activities.reduce((a, b) => (a.length > b.length ? a : b));
}

/**
 * Generate merge suggestions for activities
 */
export function generateMergeSuggestions(
  events: CalendarEvent[],
  similarityThreshold: number = 0.7
): MergeSuggestion[] {
  const activities = getUniqueActivities(events);
  const suggestions: MergeSuggestion[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < activities.length; i++) {
    if (processed.has(activities[i])) continue;

    const group: string[] = [activities[i]];
    processed.add(activities[i]);

    for (let j = i + 1; j < activities.length; j++) {
      if (processed.has(activities[j])) continue;

      const similarity = calculateSimilarity(activities[i], activities[j]);
      if (similarity >= similarityThreshold) {
        group.push(activities[j]);
        processed.add(activities[j]);
      }
    }

    if (group.length > 1) {
      const groupEvents = events.filter((e) => group.includes(e.title));
      const totalMinutes = groupEvents.reduce(
        (sum, e) => sum + e.durationMinutes,
        0
      );

      // Calculate average confidence
      let totalSimilarity = 0;
      let comparisons = 0;
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          totalSimilarity += calculateSimilarity(group[a], group[b]);
          comparisons++;
        }
      }
      const confidence = comparisons > 0 ? totalSimilarity / comparisons : 0.5;

      suggestions.push({
        activities: group,
        suggestedName: suggestCanonicalName(group),
        confidence,
        eventCount: groupEvents.length,
        totalMinutes,
      });
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if event title suggests it's a birthday
 */
function isBirthdayEvent(title: string): boolean {
  const normalized = title.toLowerCase();
  const birthdayKeywords = [
    'birthday', 'bday', 'b-day', 'born', 'birth day',
    '\'s birthday', 'cumpleaños', 'aniversário', 'geburtstag'
  ];
  return birthdayKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Check if event title suggests it's a holiday or special day
 */
function isHolidayEvent(title: string): boolean {
  const normalized = title.toLowerCase();
  const holidayKeywords = [
    'holiday', 'christmas', 'thanksgiving', 'easter', 'new year',
    'independence day', 'memorial day', 'labor day', 'halloween',
    'valentine', 'mother\'s day', 'father\'s day', 'anniversary'
  ];
  return holidayKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Detect data quality issues
 */
export function detectDataQualityIssues(
  events: CalendarEvent[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Check for future events
  events.forEach((event) => {
    if (event.start > today) {
      issues.push({
        type: "future_event",
        event,
        message: `Event scheduled for ${event.start.toLocaleDateString()}`,
        severity: "warning",
      });
    }
  });

  // Check for suspicious durations
  events.forEach((event) => {
    if (event.durationMinutes <= 0) {
      issues.push({
        type: "zero_duration",
        event,
        message: "Event has zero or negative duration",
        severity: "error",
      });
    } else if (event.durationMinutes > 24 * 60) {
      // More than 24 hours
      const hours = Math.floor(event.durationMinutes / 60);
      issues.push({
        type: "long_duration",
        event,
        message: `Event duration is ${hours} hours (${event.durationMinutes} minutes)`,
        severity: "warning",
      });
    }
  });

  // Check for duplicates (same title, same start time, same duration)
  const seen = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    const key = `${event.title}|${event.start.getTime()}|${event.durationMinutes}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(event);
  });

  seen.forEach((duplicates, key) => {
    if (duplicates.length > 1) {
      duplicates.slice(1).forEach((event) => {
        issues.push({
          type: "duplicate",
          event,
          message: `Duplicate of "${event.title}" at ${event.start.toLocaleString()}`,
          severity: "warning",
        });
      });
    }
  });

  // Check for birthdays
  events.forEach((event) => {
    if (isBirthdayEvent(event.title)) {
      issues.push({
        type: "birthday",
        event,
        message: `This appears to be a birthday event. Consider excluding it from time tracking.`,
        severity: "warning",
      });
    }
  });

  // Check for recurring holidays/special days (same title appearing yearly)
  const titlesByYear = new Map<string, Map<number, CalendarEvent[]>>();
  events.forEach((event) => {
    const normalized = normalizeName(event.title);
    const year = event.start.getFullYear();
    
    if (!titlesByYear.has(normalized)) {
      titlesByYear.set(normalized, new Map());
    }
    const yearMap = titlesByYear.get(normalized)!;
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(event);
  });

  // Detect events that occur once per year for multiple years (likely holidays/birthdays)
  titlesByYear.forEach((yearMap, normalized) => {
    const years = Array.from(yearMap.keys());
    if (years.length >= 2) { // Appears in at least 2 different years
      // Check if it appears roughly once per year (1-3 times per year)
      const eventsPerYear = Array.from(yearMap.values());
      const avgPerYear = eventsPerYear.reduce((sum, events) => sum + events.length, 0) / years.length;
      
      if (avgPerYear <= 3 && (isHolidayEvent(eventsPerYear[0][0].title) || isBirthdayEvent(eventsPerYear[0][0].title))) {
        // Flag all instances of this recurring event
        yearMap.forEach((yearEvents) => {
          yearEvents.forEach((event) => {
            issues.push({
              type: "recurring_holiday",
              event,
              message: `This event recurs yearly (appears in ${years.length} years). Likely a holiday or birthday.`,
              severity: "warning",
            });
          });
        });
      }
    }
  });

  return issues;
}

