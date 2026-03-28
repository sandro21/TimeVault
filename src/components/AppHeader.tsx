"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
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

  if (!isAppShellRoute(pathname)) {
    return null;
  }

  const isCalendar = pathname === "/calendar";
  const isStatistics =
    pathname.startsWith("/all-activity") || pathname.startsWith("/activity");
  const isChat = pathname === "/chat";

  return (
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
          {NAV.map(({ href, label }) => {
            const active =
              href === "/calendar"
                ? isCalendar
                : href === "/all-activity"
                  ? isStatistics
                  : isChat;

            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-2 text-[15px] font-semibold transition-colors sm:px-5 sm:text-[17px] ${
                  active
                    ? "bg-[color:var(--primary-20)] text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-secondary)] hover:bg-black/[0.04]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
