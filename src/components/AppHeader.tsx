"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { usePro } from "@/contexts/ProContext";
import { UpgradeModal } from "@/components/UpgradeModal";

const NAV_BASE = [
  { href: "/calendar", label: "Calendar" },
  { href: "/all-activity", label: "Statistics" },
  { href: "/chat", label: "AI Chat" },
] as const;

function isAppShellRoute(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/process" ||
    pathname === "/privacy" ||
    pathname === "/terms"
  ) {
    return false;
  }
  return true;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isPro, deactivatePro, setBillingRatesBatch } = usePro();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!isAppShellRoute(pathname)) {
    return null;
  }

  const navItems = isPro
    ? [...NAV_BASE, { href: "/billing" as const, label: "Billing" as const }]
    : [...NAV_BASE];

  const isActive = (href: string) => {
    if (href === "/calendar") return pathname === "/calendar";
    if (href === "/all-activity")
      return pathname.startsWith("/all-activity") || pathname.startsWith("/activity");
    if (href === "/chat") return pathname === "/chat";
    if (href === "/billing") return pathname === "/billing";
    return false;
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      // Keep Context in sync so "Pro" UI doesn't remain enabled
      // after localStorage is cleared (ProProvider stays mounted).
      deactivatePro();
      setBillingRatesBatch({});

      localStorage.clear();
      sessionStorage.clear();
    }
    router.push("/");
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b border-black/10"
        style={{
          background: "var(--card-bg)",
          backdropFilter: "blur(var(--card-backdrop-blur))",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <img
              src="/blacklogo.png"
              alt="MyCalendarStats"
              className="h-9 w-auto"
            />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-2 text-[15px] font-semibold transition-colors sm:px-5 sm:text-[17px] ${
                  isActive(href)
                    ? "bg-[color:var(--primary-20)] text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-secondary)] hover:bg-black/[0.04]"
                }`}
              >
                {label}
              </Link>
            ))}

            {!isPro && (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="rounded-full px-3 py-2 text-[15px] font-semibold transition-colors sm:px-5 sm:text-[17px] bg-gradient-to-b from-[#FBBF24] to-[#D97706] text-[#111111] shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_10px_22px_rgba(217,119,6,0.22)] hover:opacity-95"
                aria-label="Upgrade to Pro"
                title="Upgrade to Pro"
              >
                Upgrade to Pro
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full p-2 text-[color:var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </nav>
        </div>
      </header>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
