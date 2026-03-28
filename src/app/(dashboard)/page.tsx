import Image from "next/image";
import "@/lib/calculations/stats";
import {
  computeGlobalStats,
  computeTopActivities,
  formatAsDaysHoursMinutes,
  formatAsHoursMinutes,
  formatAsMinutes,
  formatAsCompactHoursMinutes,
} from "@/lib/calculations/stats";
import { loadLocalCalendars } from "@/lib/calculations/load-local-calendars";
import { ActivityPieChart } from "@/components/ActivityPieChart";
import { TimeLoggedChart } from "@/components/TimeLoggedChart";
import { TopActivitiesChart } from "@/components/TopActivitiesChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { ActivityDurationChart } from "@/components/ActivityDurationChart";
import { TimeOfDayChart } from "@/components/TimeOfDayChart";
import { FilterInitializer } from "@/components/FilterInitializer";
import { DashboardClient } from "@/components/DashboardClient";

export default function Home() {
  const events = loadLocalCalendars([
    { id: "fitness", fileName: "fitness.ics" },
    { id: "career", fileName: "career.ics" },
  ]);

  return (
    <main className="mx-auto min-h-screen flex-col gap-18 px-18 py-12">
      <FilterInitializer events={events} />
      <DashboardClient events={events} />
    </main>
  );
}
