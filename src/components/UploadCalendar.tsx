"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseIcsToEventsBrowser } from "@/lib/calculations/parse-ics-browser";
import { CalendarEvent } from "@/lib/calculations/stats";
import { useEvents } from "@/contexts/EventsContext";
import { initiateGoogleOAuth, fetchGoogleCalendars } from "@/lib/google-auth";
import { fetchAllGoogleCalendarEvents } from "@/lib/calculations/parse-google-calendar";
import { GoogleCalendarSelector } from "@/components/GoogleCalendarSelector";

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

  return (
    <>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
        
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className="bg-[color:var(--primary)] text-white px-8 py-4 rounded-full text-body-24 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          {isUploading ? "Uploading..." : "Upload iCal"}
        </button>
        
        {error && (
          <p className="text-[color:var(--color-error)] text-sm text-center">{error}</p>
        )}
        
        <button
          onClick={handleGoogleConnect}
          disabled={isConnectingGoogle}
          className="bg-white text-[color:var(--text-primary)] px-8 py-4 rounded-full text-body-24 font-semibold border-2 border-gray-300 hover:border-[color:var(--primary)] hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          {isConnectingGoogle ? "Connecting..." : "Connect to Google Calendar"}
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

