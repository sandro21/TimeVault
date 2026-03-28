"use client";

import { X, Zap, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { usePro } from "@/contexts/ProContext";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: DollarSign, text: "Set hourly billing rates per activity" },
  { icon: TrendingUp, text: "Track total unbilled revenue in real time" },
  { icon: BarChart3, text: "Revenue overlay on your time-series charts" },
  { icon: Zap, text: "Revenue breakdown in Top Activities table" },
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { activatePro } = usePro();

  if (!open) return null;

  const handleContinue = () => {
    activatePro();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-[#FBBF24]/30 p-8 shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,251,235,0.95) 100%)",
          backdropFilter: "blur(24px)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[color:var(--text-secondary)] transition-colors hover:bg-black/[0.06]"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-[#FBBF24] to-[#D97706] shadow-lg">
            <Zap className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <h2
            id="upgrade-title"
            className="text-[28px] font-bold text-[color:var(--text-primary)]"
          >
            Upgrade to Pro
          </h2>
          <p className="mt-1 text-[16px] text-[color:var(--text-secondary)]">
            Unlock financial tracking for your calendar
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#FBBF24]/20 bg-white/60 p-5">
          <div className="mb-4 flex items-baseline justify-center gap-1">
            <span className="text-[40px] font-bold text-[color:var(--text-primary)]">
              $9
            </span>
            <span className="text-[16px] font-medium text-[color:var(--text-secondary)]">
              /month
            </span>
          </div>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FBBF24]/20 to-[#D97706]/20">
                  <Icon className="h-4 w-4 text-[#B45309]" strokeWidth={2} />
                </span>
                <span className="text-[15px] font-medium text-[color:var(--text-primary)]">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-full py-3 text-[17px] font-semibold text-white shadow-lg transition-opacity hover:opacity-95"
            style={{
              background: "linear-gradient(to bottom, #FBBF24, #D97706)",
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.08), 0 8px 24px rgba(217,119,6,0.3)",
            }}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-black/10 bg-white/80 py-3 text-[17px] font-semibold text-[color:var(--text-primary)] transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
