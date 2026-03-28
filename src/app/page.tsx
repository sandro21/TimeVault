"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadCalendar } from "@/components/UploadCalendar";
import { CalendarEvent } from "@/lib/calculations/stats";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if calendars already exist in localStorage
    if (typeof window !== 'undefined') {
      const storedCalendars = localStorage.getItem('uploadedCalendars');
      if (storedCalendars) {
        try {
          const calendars = JSON.parse(storedCalendars);
          // If there are any calendars, redirect to dashboard
          if (calendars.length > 0) {
            router.replace('/all-activity');
          }
        } catch (error) {
          // If parsing fails, allow access (might be corrupted data)
          console.error('Error parsing stored calendars:', error);
        }
      }
    }
  }, [router]);

  const handleUploadComplete = (newEvents: CalendarEvent[]) => {
    // Events are now stored in localStorage and will be loaded by EventsContext
    // Navigation happens in UploadCalendar component
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-18">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-5xl font-bold text-[color:var(--text-primary)] mb-4 text-center">
          Upload Your Calendar(s)
        </h1>
        <p className="text-2xl text-[color:var(--gray)] mb-8 text-center">
          Import calendars to get started
        </p>
        
        <UploadCalendar onUploadComplete={handleUploadComplete} />

        {/* Google OAuth Verification Requirements - Subtle Information Section */}
        <div className="mt-12 w-full max-w-xl text-center space-y-3">
          <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
            <strong className="text-[color:var(--text-primary)]">MyCalendarStats</strong> is a calendar analytics tool that helps you visualize and understand how you spend your time. 
            We analyze your calendar events to generate statistics, charts, and insights about your activities, habits, and time patterns.
          </p>
          <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
            When you connect your Google Calendar, we request read-only access to your calendar events solely to generate these personalized statistics and visualizations. 
            All data processing happens locally in your browser—we do not store your calendar data on our servers.
          </p>
          <p className="text-sm text-[color:var(--text-secondary)]">
            <Link href="/privacy" className="text-[color:var(--primary)] hover:underline">
              View our Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}



