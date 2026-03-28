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

      // Store new calendars temporarily for processing
      // We'll save to permanent storage after user processes the data
      const processingData = {
        newCalendars,
        events: allEvents,
        uploadedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('processingCalendars', JSON.stringify(processingData));
      
      // Show warning if some files failed
      if (errors.length > 0) {
        // Store errors in sessionStorage too
        sessionStorage.setItem('uploadErrors', JSON.stringify(errors));
      }
      
      // Navigate to process page
      router.push('/process');
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

  const handleCalendarSelection = async (selectedCalendarIds: string[]) => {
    setShowCalendarSelector(false);
    setIsConnectingGoogle(true);
    setError(null);

    try {
      // Fetch events from selected calendars only
      const allEvents: CalendarEvent[] = [];
      const newCalendars: any[] = [];

      for (const calendarId of selectedCalendarIds) {
        const calendar = availableCalendars.find(cal => cal.id === calendarId);
        if (!calendar) continue;

        try {
          // Fetch events from this calendar
          const events = await fetchAllGoogleCalendarEvents(
            googleAccessToken,
            calendar.id
          );

          if (events.length > 0) {
            allEvents.push(...events);
            
            // Store calendar info
            newCalendars.push({
              id: `google-${calendar.id}`,
              name: calendar.summary || 'Untitled Calendar',
              source: 'google',
              googleCalendarId: calendar.id,
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

      // Store for processing
      const processingData = {
        newCalendars,
        events: allEvents,
        uploadedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('processingCalendars', JSON.stringify(processingData));
      
      // Navigate to process page
      router.push('/process');
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

