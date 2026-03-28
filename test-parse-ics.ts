import fs from "fs";
import path from "path";
import { parseIcsToEvents } from "./src/lib/calculations/parse-ics";
import {
  computeGlobalStats,
  formatAsDaysHoursMinutes,
  formatAsHoursMinutes,
  formatAsMinutes,
} from "./src/lib/calculations/stats";
import { loadLocalCalendars } from "./src/lib/calculations/load-local-calendars";

async function main() {
  const events = loadLocalCalendars([
    { id: "fitness", fileName: "fitness.ics" },
    { id: "career", fileName: "career.ics" },
  ]);

  console.log("Total events:", events.length);
  console.log("First event:", events[0]);

  const stats = computeGlobalStats(events);
  console.log("Global stats:", stats);
  console.log("Days/Hours/Minutes:", formatAsDaysHoursMinutes(stats.totalMinutes));
  console.log("Hours/Minutes:", formatAsHoursMinutes(stats.totalMinutes));
  console.log("Minutes:", formatAsMinutes(stats.totalMinutes));

  // Test time filtering
  const { filterByTimeRange, filterByCalendars } = await import("./src/lib/calculations/filter");
  const filtered = filterByTimeRange(events, { type: "month", year: 2025, month: 7 });
  console.log("\n--- Time Filter Test ---");
  console.log("Total events:", events.length);
  console.log("Events in July 2025:", filtered.length);

  // Test calendar filtering
  const fitnessOnly = filterByCalendars(events, ["fitness"]);
  console.log("\n--- Calendar Filter Test ---");
  console.log("Total events:", events.length);
  console.log("Fitness events only:", fitnessOnly.length);
  console.log("First fitness event:", fitnessOnly[0]?.title);
}

// Actually run the script
main().catch((err) => {
  console.error(err);
  process.exit(1);
});