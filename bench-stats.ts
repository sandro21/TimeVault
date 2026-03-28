import { computeGlobalStats, computeActivityStats, computeTopActivities, type CalendarEvent } from "./src/lib/calculations/stats";
import { getUniqueActivities } from "./src/lib/calculations/get-activities";
import { generateMergeSuggestions, detectDataQualityIssues } from "./src/lib/calculations/activity-suggestions";

function makeRandomDateInLastYears(years: number): Date {
  const now = Date.now();
  const past = now - years * 365 * 24 * 60 * 60 * 1000;
  const t = past + Math.random() * (now - past);
  return new Date(t);
}

function generateEvents(n: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let i = 0; i < n; i++) {
    const start = makeRandomDateInLastYears(5);
    const durationMinutes = 30 + Math.floor(Math.random() * 90); // 30–120 minutes
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const activityIndex = i % 50; // up to 50 distinct activities
    const title = `Activity ${activityIndex}`;

    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");

    events.push({
      id: `evt-${i}`,
      calendarId: `cal-${i % 3}`,
      title,
      start,
      end,
      durationMinutes,
      dayOfWeek: start.getDay(),
      dayString: `${year}-${month}-${day}`,
      isAllDay: false,
    });
  }
  return events;
}

function hrtimeMs(start: bigint, end: bigint): number {
  return Number(end - start) / 1_000_000;
}

function runStatsPipeline(events: CalendarEvent[]) {
  // Global stats
  const global = computeGlobalStats(events);

  // Per-activity stats for the top activity
  const activities = getUniqueActivities(events);
  const top = activities[0]?.name ?? "Activity 0";
  const topEvents = events.filter((e) => e.title === top);
  const activityStats = computeActivityStats(topEvents, top);

  // Top activities list
  const topActivities = computeTopActivities(events, "count", 5);

  // Suggestions and data quality checks
  const mergeSuggestions = generateMergeSuggestions(events, 0.75);
  const dataIssues = detectDataQualityIssues(events);

  // Use values so optimizer doesn't drop work
  return {
    global,
    activityStats,
    topActivitiesCount: topActivities.length,
    mergeSuggestionCount: mergeSuggestions.length,
    dataIssueCount: dataIssues.length,
  };
}

function benchmark(size: number, iterations: number): { size: number; avgMs: number } {
  const events = generateEvents(size);

  // Warm-up
  runStatsPipeline(events);

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    runStatsPipeline(events);
  }
  const end = process.hrtime.bigint();

  const totalMs = hrtimeMs(start, end);
  return { size, avgMs: totalMs / iterations };
}

function main() {
  const sizes = [1_000, 5_000, 10_000, 25_000, 50_000];
  const iterations = 10;

  console.log("Benchmarking stats pipeline (Node", process.version, ")");
  console.log("Each run includes: global stats, top-activity stats, top N activities, merge suggestions, data-quality checks.");
  console.log("");

  for (const size of sizes) {
    const { avgMs } = benchmark(size, iterations);
    console.log(`Events: ${size.toString().padStart(6, " ")}  | Avg time: ${avgMs.toFixed(3)} ms`);
  }
}

main();

