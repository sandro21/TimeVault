"use client";

import { useEvents } from "@/contexts/EventsContext";
import { usePro } from "@/contexts/ProContext";
import { filterHiddenEvents } from "@/lib/calculations/filter-hidden";
import { BillingRatesCard } from "@/components/BillingRatesCard";

export function BillingPageClient() {
  const { events } = useEvents();
  const { isPro } = usePro();

  const filteredEvents = filterHiddenEvents(events);

  if (!isPro) {
    return (
      <main className="page-container page-container--no-time-filter">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <h1 className="text-section-header text-[color:var(--text-primary)]">
            Billing Rates
          </h1>
          <div className="card-soft flex min-h-[320px] flex-col items-center justify-center gap-4 px-8 py-12 text-center">
            <p className="text-body-24 text-[color:var(--text-secondary)]">
              Billing rates is a Pro feature. Upgrade to unlock financial tracking.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container page-container--no-time-filter">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <BillingRatesCard events={filteredEvents} />
      </div>
    </main>
  );
}
