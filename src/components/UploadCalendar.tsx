"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";
import { CalendarEvent } from "@/lib/calculations/stats";
import { useEvents } from "@/contexts/EventsContext";
import { initiateGoogleOAuth, fetchGoogleCalendars } from "@/lib/google-auth";
import { fetchAllGoogleCalendarEvents } from "@/lib/calculations/parse-google-calendar";
import { GoogleCalendarSelector } from "@/components/GoogleCalendarSelector";
import { Upload, Calendar } from "lucide-react";

interface UploadCalendarProps {
  onUploadComplete: (events: CalendarEvent[]) => void;
}

export function UploadCalendar({ onUploadComplete }: UploadCalendarProps) {
  const { refreshEvents } = useEvents();
  const [isUploading, setIsUploading] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string>("");
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

  const handleGoogleConnect = async () => {
    setIsConnectingGoogle(true);
    setError(null);

    try {
      // Step 1: Authenticate with Google
      const tokenResponse = await initiateGoogleOAuth();
      
      // Step 2: Fetch user's calendars
      const calendarsResponse = await fetchGoogleCalendars(tokenResponse.access_token);
      
      if (!calendarsResponse.items || calendarsResponse.items.length === 0) {
        setError("No calendars found in your Google account");
        setIsConnectingGoogle(false);
        return;
      }

      // Step 3: Store calendars and token, then show selection modal
      setAvailableCalendars(calendarsResponse.items);
      setGoogleAccessToken(tokenResponse.access_token);
      setShowCalendarSelector(true);
      setIsConnectingGoogle(false);
    } catch (err: any) {
      console.error('Error connecting to Google Calendar:', err);
      setError(err.message || "Failed to connect to Google Calendar. Please try again.");
      setIsConnectingGoogle(false);
    }
  };

  const handleCalendarSelection = async (allCalendars: any[]) => {
    setShowCalendarSelector(false);
    setIsConnectingGoogle(true);
    setError(null);

    try {
      // Load hidden calendar IDs to determine which ones to fetch events for
      const hiddenCalendarIds = new Set(JSON.parse(localStorage.getItem('hiddenCalendarIds') || '[]'));
      
      // Fetch events from all calendars (both visible and hidden)
      // Hidden ones will be stored but not shown in the UI
      const allEvents: CalendarEvent[] = [];
      const newCalendars: any[] = [];

      for (const calendar of allCalendars) {
        if (!calendar) continue;

        try {
          // Fetch events from this calendar (even if hidden)
          const events = await fetchAllGoogleCalendarEvents(
            googleAccessToken,
            calendar.id
          );

          if (events.length > 0) {
            allEvents.push(...events);
            
            // Store calendar info (for both visible and hidden calendars)
            newCalendars.push({
              id: `google-${calendar.id}`,
              name: calendar.summary || 'Untitled Calendar',
              source: 'google',
              googleCalendarId: calendar.id,
              accessRole: calendar.accessRole, // Store access role to identify read-only calendars
              uploadedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error(`Error fetching calendar ${calendar.summary}:`, err);
          // Continue with other calendars
        }
      }

      if (allEvents.length === 0) {
        setError("No events found in the selected calendars");
        setIsConnectingGoogle(false);
        return;
      }

      // Save ALL calendars to localStorage (hidden ones are already marked in GoogleCalendarSelector)
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      storedCalendars.push(...newCalendars);
      localStorage.setItem('uploadedCalendars', JSON.stringify(storedCalendars));

      // For Google calendars, store events separately
      const googleEvents = JSON.parse(localStorage.getItem('googleCalendarEvents') || '{}');
      newCalendars.forEach((calendar: any) => {
        if (calendar.source === 'google') {
          // Store events for this Google calendar
          const calendarEvents = allEvents.filter(
            (event) => event.calendarId === calendar.id
          );
          googleEvents[calendar.id] = calendarEvents;
        }
      });
      localStorage.setItem('googleCalendarEvents', JSON.stringify(googleEvents));

      // Refresh events context
      refreshEvents();
      
      // Navigate to dashboard and open filter modal
      router.push('/all-activity');
    } catch (err: any) {
      console.error('Error importing calendars:', err);
      setError(err.message || "Failed to import calendars. Please try again.");
      setIsConnectingGoogle(false);
    }
  };

  const handleCalendarSelectionCancel = () => {
    setShowCalendarSelector(false);
    setAvailableCalendars([]);
    setGoogleAccessToken("");
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
    <>
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
        
        {/* Connect Google Calendar Button */}
        <div
          className="relative w-full md:w-[400px]"
          style={{
            borderRadius: '9999px',
            padding: '2px',
            background: 'linear-gradient(to right, #EA4335, #FBBC05, #34A853, #4285F4)',
          }}
        >
          <button
            onClick={handleGoogleConnect}
            disabled={isConnectingGoogle}
            className="flex items-center justify-center px-8 py-3 md:py-4 text-[16px] md:text-[20px] font-semibold text-[color:var(--text-primary)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
            type="button"
            style={{
              backgroundColor: 'var(--inverse-color)',
              borderRadius: '9999px',
            }}
          >
            {isConnectingGoogle ? "Connecting..." : "Connect to Google Calendars"}
          </button>
        </div>

        {/* View Demo Statistics Button */}
        <button
          onClick={generateDemoData}
          className="flex items-center justify-center text-[18px] md:text-[20px] font-semibold text-[color:var(--text-secondary)] hover:opacity-80 transition-all"
          type="button"
        >
          Or click here to try with demo data first
        </button>
      </div>

      {/* Calendar Selection Modal */}
      {showCalendarSelector && (
        <GoogleCalendarSelector
          calendars={availableCalendars}
          onConfirm={handleCalendarSelection}
          onCancel={handleCalendarSelectionCancel}
        />
      )}
    </>
  );
}

