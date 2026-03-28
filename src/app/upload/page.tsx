"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCalendar } from "@/components/UploadCalendar";
import { CalendarEvent } from "@/lib/calculations/stats";

export default function UploadPage() {
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
    <main className="h-90% flex flex-col items-center justify-center px-18">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-5xl font-bold text-black mb-4 text-center">
          Upload Your Calendar(s)
        </h1>
        <p className="text-2xl text-[color:var(--gray)] mb-8 text-center">
          Import calendars to get started
        </p>
        
        <UploadCalendar onUploadComplete={handleUploadComplete} />
      </div>
    </main>
  );
}

