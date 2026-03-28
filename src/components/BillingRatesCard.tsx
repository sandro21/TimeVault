"use client";

import { useMemo } from "react";
import { DollarSign } from "lucide-react";
import type { CalendarEvent } from "@/lib/calculations/stats";
import { usePro } from "@/contexts/ProContext";

interface BillingRatesCardProps {
  events: CalendarEvent[];
}

export function BillingRatesCard({ events }: BillingRatesCardProps) {
  const { billingRates, setBillingRate } = usePro();

  const totalRevenue = useMemo(() => {
    return events.reduce((sum, e) => {
      const rate = billingRates[e.title] ?? 0;
      return sum + (e.durationMinutes / 60) * rate;
    }, 0);
  }, [events, billingRates]);

  const rows = useMemo(() => {
    const totalsByName = new Map<string, number>(); // total minutes by activity
    for (const e of events) {
      totalsByName.set(e.title, (totalsByName.get(e.title) ?? 0) + e.durationMinutes);
    }

    const totalMinutes = Array.from(totalsByName.values()).reduce(
      (sum, m) => sum + m,
      0
    );

    const formatHours = (minutes: number) => {
      const hours = minutes / 60;
      const rounded = Math.round(hours * 10) / 10; // 1 decimal
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    return Array.from(totalsByName.entries())
      .map(([name, totalMinutesForActivity]) => ({
        name,
        totalMinutes: totalMinutesForActivity,
        totalHoursText: formatHours(totalMinutesForActivity),
        totalPct: totalMinutes > 0 ? Math.round((totalMinutesForActivity / totalMinutes) * 100) : 0,
      }))
      // Sort most hours -> least
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [events]);

  if (rows.length === 0) return null;

  // Billing page keeps a `$` icon, so format as a plain number (no `$` symbol).
  const formatCurrency = (v: number) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <section className="w-full">
      <h2 className="text-section-header text-[color:var(--text-primary)] mb-6">
        Billing Rates
      </h2>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/60 px-5 py-3">
        <span className="text-[15px] font-semibold text-[color:var(--text-secondary)]">
          Total revenue
        </span>
        <span className="text-[18px] font-bold text-[color:var(--text-primary)]">
          {formatCurrency(totalRevenue)}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-[color:var(--gray)]/20 text-left">
                <th className="pb-2 text-body-24 text-[color:var(--gray)] w-[50%] pr-4">
                  Activity (Hours • %)
                </th>
                <th className="pb-2 text-body-24 text-[color:var(--gray)] w-[30%]">
                  Rate ($/hr)
                </th>
                <th className="pb-2 text-body-24 text-[color:var(--gray)] w-[20%] pr-4">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, totalMinutes, totalHoursText, totalPct }) => {
                const rate = billingRates[name] ?? 0;
                const revenue = (totalMinutes / 60) * rate;
                return (
                  <tr
                    key={name}
                    className="border-b border-[color:var(--gray)]/10 last:border-0"
                  >
                    <td
                      className="py-3 pr-4 text-[17px] font-semibold text-[color:var(--text-primary)]"
                      title={name}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate">
                          {name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[15px] font-semibold text-[color:var(--text-secondary)]">
                        {totalHoursText}h ({totalPct}%)
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 shrink-0 text-[color:var(--text-primary)]" />
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={billingRates[name] ?? ""}
                          placeholder="0"
                          onChange={(e) => {
                            const v = e.target.value;
                            setBillingRate(
                              name,
                              v === "" ? 0 : Math.max(0, Number(v))
                            );
                          }}
                          className="w-full max-w-[160px] rounded-lg border border-black/12 bg-white/90 px-2 py-1.5 text-[16px] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--primary-30)]"
                        />
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5 justify-start">
                        <DollarSign className="h-4 w-4 shrink-0 text-[color:var(--text-primary)]" />
                        <span className="text-[16px] font-semibold text-[color:var(--text-primary)]">
                          {formatCurrency(revenue)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
