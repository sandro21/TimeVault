"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if calendars exist in localStorage
      const storedCalendars = localStorage.getItem('uploadedCalendars');
      if (storedCalendars) {
        try {
          const calendars = JSON.parse(storedCalendars);
          // If calendars exist, go to dashboard
          if (calendars.length > 0) {
            router.replace('/all-activity');
            return;
          }
        } catch (error) {
          // If parsing fails, go to upload page
          console.error('Error parsing stored calendars:', error);
        }
      }
      // If no calendars exist, go to upload page
      router.replace('/upload');
    }
  }, [router]);

  // Show nothing while redirecting
  return null;
}



