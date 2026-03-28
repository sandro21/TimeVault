import { BillingPageClient } from "@/components/BillingPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing Rates - MyCalendarStats",
  description: "Configure hourly billing rates for your activities and track revenue.",
};

export default function BillingPage() {
  return <BillingPageClient />;
}
