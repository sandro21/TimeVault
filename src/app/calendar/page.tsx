import { CalendarViewClient } from "@/components/CalendarViewClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace — Actual",
  description:
    "Plan on the calendar, then record what you actually did with the live timer. Planned vs actual blocks stay in sync.",
};

export default function CalendarPage() {
  return <CalendarViewClient />;
}
