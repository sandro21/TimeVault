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

  return (
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
        className="bg-[color:var(--red-1)] text-white px-8 py-4 rounded-full text-body-24 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        {isUploading ? "Uploading..." : "Upload iCal"}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}
      
      <button
        className="bg-white text-black px-8 py-4 rounded-full text-body-24 font-semibold border-2 border-gray-300 cursor-not-allowed opacity-60"
        type="button"
        disabled
      >
        Connect to your calendar
        <span className="ml-2 text-sm text-[color:var(--gray)]">(Soon)</span>
      </button>
    </div>
  );
}

