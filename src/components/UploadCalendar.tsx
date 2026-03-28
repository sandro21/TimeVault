"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";
import { CalendarEvent } from "@/lib/calculations/stats";
import { useEvents } from "@/contexts/EventsContext";

interface UploadCalendarProps {
  onUploadComplete: (events: CalendarEvent[]) => void;
}

export function UploadCalendar({ onUploadComplete }: UploadCalendarProps) {
  const { refreshEvents } = useEvents();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const allEvents: CalendarEvent[] = [];
      const newCalendars: any[] = [];
      const errors: string[] = [];

      // Process all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.name.endsWith('.ics') && !file.type.includes('calendar')) {
          errors.push(`${file.name} is not a valid .ics file`);
          continue;
        }

        try {
          // Read file as text
          const icsText = await file.text();
          
          // Generate a unique calendar ID from filename and timestamp
          const calendarId = `uploaded-${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
          
          // Parse ICS to events (browser-compatible)
          const events = parseIcsToEventsBrowser(icsText, calendarId);
          
          if (events.length === 0) {
            errors.push(`${file.name} contains no events`);
            continue;
          }

          // Store calendar info
          newCalendars.push({
            id: calendarId,
            name: file.name,
            icsText,
            uploadedAt: new Date().toISOString(),
          });

          allEvents.push(...events);
        } catch (err) {
          console.error(`Error parsing ${file.name}:`, err);
          errors.push(`Failed to parse ${file.name}`);
        }
      }

      if (allEvents.length === 0) {
        setError(errors.length > 0 ? errors.join(', ') : "No events found in the selected files");
        setIsUploading(false);
        return;
      }

      // Save calendars directly to localStorage
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      storedCalendars.push(...newCalendars);
      localStorage.setItem('uploadedCalendars', JSON.stringify(storedCalendars));

      // For ICS files, events are already in the calendar's icsText, so no need to store separately
      // (EventsContext will parse them when loading)

      // Refresh events context
      refreshEvents();
      
      // Navigate to dashboard and open filter modal
      router.push('/all-activity');
    } catch (err) {
      console.error('Error processing files:', err);
      setError("Failed to process calendar files. Please ensure they are valid .ics files.");
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const generateDemoData = () => {
    const demoCalendars = [
      { name: 'Work Calendar', activities: ['Team Meeting', 'Client Call', 'Project Review', 'Lunch Break', 'Code Review', 'Standup', 'Design Session', 'Planning', 'Interview', 'Workshop'] },
      { name: 'Personal Calendar', activities: ['Gym Workout', 'Grocery Shopping', 'Doctor Appointment', 'Dinner with Friends', 'Movie Night', 'Reading Time', 'Cooking Class', 'Haircut', 'Birthday Party', 'Weekend Trip'] },
      { name: 'Study Calendar', activities: ['Math Homework', 'History Reading', 'Science Project', 'Essay Writing', 'Group Study', 'Online Course', 'Exam Prep', 'Research', 'Library Visit', 'Tutoring'] },
    ];

    const newCalendars: any[] = [];
    const yearStart = new Date(2025, 0, 1); // January 1, 2025
    const yearEnd = new Date(2025, 11, 31); // December 31, 2025
    const yearRange = yearEnd.getTime() - yearStart.getTime();

    demoCalendars.forEach((demoCal, calIndex) => {
      const calendarId = `demo-${Date.now()}-${calIndex}`;
      let icsText = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Demo Calendar//EN\n';
      
      // Generate 10 events for this calendar, scattered throughout 2025
      for (let i = 0; i < 10; i++) {
        // Spread events evenly across the year with some randomness
        const randomOffset = (i / 10) * yearRange + (Math.random() * yearRange / 10);
        const eventDate = new Date(yearStart.getTime() + randomOffset);
        
        const startHour = 9 + (i % 8); // Vary start times between 9 AM and 5 PM
        const duration = 30 + (i % 3) * 30; // 30, 60, or 90 minutes
        
        const start = new Date(eventDate);
        start.setHours(startHour, 0, 0, 0);
        
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + duration);
        
        const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const uid = `${calendarId}-event-${i}`;
        
        icsText += `BEGIN:VEVENT\n`;
        icsText += `UID:${uid}\n`;
        icsText += `DTSTART:${startStr}\n`;
        icsText += `DTEND:${endStr}\n`;
        icsText += `SUMMARY:${demoCal.activities[i]}\n`;
        icsText += `DESCRIPTION:Demo event\n`;
        icsText += `END:VEVENT\n`;
      }
      
      icsText += 'END:VCALENDAR';
      
      newCalendars.push({
        id: calendarId,
        name: demoCal.name,
        icsText,
        uploadedAt: new Date().toISOString(),
      });
    });

    // Save calendars to localStorage
    const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
    storedCalendars.push(...newCalendars);
    localStorage.setItem('uploadedCalendars', JSON.stringify(storedCalendars));

    // Refresh events context
    refreshEvents();
    
    // Navigate to dashboard
    router.push('/all-activity');
  };

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />
      
      {/* Upload iCal Button */}
      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className="flex items-center justify-center px-8 py-3 md:py-4 text-[16px] md:text-[20px] font-semibold text-[color:var(--inverse-color)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-[400px]"
        type="button"
        style={{
          backgroundColor: 'var(--primary)',
          borderRadius: '9999px',
        }}
      >
        {isUploading ? "Uploading..." : "Upload .ICS File"}
      </button>
      
      {error && (
        <p className="text-body-18 text-[color:var(--color-error)] text-center py-2">{error}</p>
      )}
      
      <button
        onClick={generateDemoData}
        className="flex items-center justify-center px-8 py-3 md:py-4 text-[16px] md:text-[20px] font-semibold text-[color:var(--text-primary)] hover:opacity-90 transition-all w-full md:w-[400px]"
        type="button"
        style={{
          backgroundColor: 'var(--inverse-color)',
          borderRadius: '9999px',
        }}
      >
        Try Demo Data
      </button>
    </div>
  );
}
