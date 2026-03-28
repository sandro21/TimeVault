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
    <main className="bg-[color:var(--page-bg)] flex flex-col items-center px-6 pt-12 pb-12 relative overflow-hidden">
      {/* Background SVG */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <img 
          src="/mcs landing.svg" 
          alt="Decorative background illustration"
          className="w-full h-full object-cover object-center opacity-20"
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      
      {/* Balloon above mountains */}
      <div className="absolute pointer-events-none z-0" style={{ top: '30%', left: '84%', transform: 'translateX(-20%) rotate(15deg)' }}>
        <img 
          src="/baloon.png" 
          alt="Decorative balloon illustration"
          className="w-auto h-auto opacity-0"
          style={{ maxWidth: '150px', height: 'auto' }}
        />
      </div>

      
      <div className="w-full max-w-3xl flex flex-col items-center relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-[36px] md:text-[56px] leading-[1.1] font-bold text-[color:var(--text-primary)] mb-2">
            MyCalendarStats
          </h1>
          <p className="text-[20px] md:text-[24px] font-semibold text-[color:var(--text-secondary)] max-w-2xl">
            Visualize and understand how you spend your time with powerful calendar analytics
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="w-full max-w-md mb-12">
          <UploadCalendar onUploadComplete={handleUploadComplete} />
        </div>

        {/* Three Feature Cards */}
        <div className="w-full flex flex-col md:flex-row gap-6 justify-center relative z-10 mt-8">
          {/* Secure Card */}
          <div className="landing-feature-card px-6 pt-6 pb-4 flex flex-col flex-shrink-0" style={{ width: '400px', height: '250px' }}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[32px] font-semibold text-[color:var(--text-primary)]">
                Secure
              </h3>
              <img src="/secure.png" alt="Security icon representing data protection" className="w-12 h-12 object-contain opacity-80" />
            </div>
            <p className="text-[16px] font-normal text-[color:var(--text-secondary)] leading-relaxed">
              Whether you upload an iCal file or connect your Google Calendar, we access your data solely to generate these personalized statistics. All processing happens locally in your browser, we do not store your calendar data on our servers.
            </p>
          </div>

          {/* Purpose Card */}
          <div className="landing-feature-card px-6 pt-6 pb-4 flex flex-col flex-shrink-0" style={{ width: '400px', height: '250px' }}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[32px] font-semibold text-[color:var(--text-primary)]">
                Purpose
              </h3>
              <img src="/purpose.png" alt="Purpose icon representing goals and objectives" className="w-12 h-12 object-contain opacity-80" />
            </div>
            <p className="text-[16px] font-normal text-[color:var(--text-secondary)] leading-relaxed">
              Gain insights into how you actually spend your time, make better decisions about your schedule and priorities, and understand your time habits to identify areas for improvement.
            </p>
          </div>

          {/* Features Card */}
          <div className="landing-feature-card px-6 pt-6 pb-4 flex flex-col flex-shrink-0" style={{ width: '400px', height: '250px' }}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[32px] font-semibold text-[color:var(--text-primary)]">
                Features
              </h3>
              <img src="/features.png" alt="Features icon representing app capabilities" className="w-12 h-12 object-contain opacity-80" />
            </div>
            <p className="text-[16px] font-normal text-[color:var(--text-secondary)] leading-relaxed">
              Track time logged over time, analyze top activities, discover peak activity times, compare day-of-week patterns, and visualize your calendar data with interactive charts and detailed statistics.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}



