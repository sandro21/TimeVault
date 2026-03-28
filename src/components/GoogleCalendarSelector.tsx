"use client";

import { useState } from "react";

interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string; // owner, writer, reader, freeBusyReader
}

interface GoogleCalendarSelectorProps {
  calendars: GoogleCalendarItem[];
  onConfirm: (selectedCalendars: GoogleCalendarItem[]) => void;
  onCancel: () => void;
}

export function GoogleCalendarSelector({
  calendars,
  onConfirm,
  onCancel,
}: GoogleCalendarSelectorProps) {
  // Separate calendars into "Your Calendars" (owner/writer) and "Others" (read-only)
  const yourCalendars = calendars.filter(cal => 
    cal.accessRole === 'owner' || 
    cal.accessRole === 'writer' ||
    !cal.accessRole // If accessRole is not set, assume it's owned
  );
  
  const otherCalendars = calendars.filter(cal => 
    cal.accessRole === 'reader' || 
    cal.accessRole === 'freeBusyReader'
  );

  // Sort "Your Calendars": primary first, then by name
  const sortedYourCalendars = [...yourCalendars].sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return (a.summary || '').localeCompare(b.summary || '');
  });

  // Sort "Others": by name
  const sortedOtherCalendars = [...otherCalendars].sort((a, b) => {
    return (a.summary || '').localeCompare(b.summary || '');
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    // Pre-select all "Your Calendars" by default, but not "Others"
    new Set(sortedYourCalendars.map(cal => cal.id))
  );

  const toggleCalendar = (calendarId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set([...yourCalendars, ...otherCalendars].map(cal => cal.id)));
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one calendar");
      return;
    }
    // Pass ALL calendars (both selected and unselected)
    // Unselected ones will be marked as hidden
    const allCalendars = [...yourCalendars, ...otherCalendars];
    // Use the same ID format as UploadCalendar: google-${calendar.id}
    const unselectedIds = allCalendars
      .filter(cal => !selectedIds.has(cal.id))
      .map(cal => `google-${cal.id}`);
    
    // Save hidden calendar IDs to localStorage
    if (typeof window !== 'undefined') {
      const existingHidden = JSON.parse(localStorage.getItem('hiddenCalendarIds') || '[]');
      const mergedHidden = [...new Set([...existingHidden, ...unselectedIds])];
      localStorage.setItem('hiddenCalendarIds', JSON.stringify(mergedHidden));
    }
    
    // Pass all calendars (selected ones will be imported, unselected will be hidden)
    onConfirm(allCalendars);
  };

  // Get calendar color (default to a color based on index if not set)
  const getCalendarColor = (calendar: GoogleCalendarItem, index: number): string => {
    if (calendar.backgroundColor) return calendar.backgroundColor;
    
    // Default colors array
    const defaultColors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#A855F7', // Purple
      '#F97316', // Orange
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F59E0B', // Amber
      '#8B5CF6', // Violet
    ];
    
    return defaultColors[index % defaultColors.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
        onClick={onCancel}
      />
      
      {/* Modal Container - Smaller width */}
      <div className="modal-container pointer-events-auto relative z-10 flex flex-col" style={{ maxWidth: '600px', width: '90%' }}>
        {/* Top Bar - Header */}
        <div className="border-b border-[color:var(--text-secondary)] px-8 py-4">
          <h2 
            className="text-[32px] leading-[1.1] font-semibold"
            style={{ color: 'var(--text-primary)', margin: 0 }}
          >
            Choose Calendars to consider
          </h2>
          <p 
            className="text-[18px] font-medium mt-2"
            style={{ color: 'var(--text-secondary)', margin: 0 }}
          >
            You can change this later 
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-8 py-6 space-y-6">
            {/* Your Calendars Section */}
            {sortedYourCalendars.length > 0 && (
              <div>
                <h3 className="text-[24px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Your Calendars
                </h3>
                
                {/* Calendar List */}
                <div className="space-y-4">
                  {sortedYourCalendars.map((calendar, index) => {
                    const isSelected = selectedIds.has(calendar.id);
                    const calendarColor = getCalendarColor(calendar, index);
                    
                    return (
                      <div key={calendar.id} className="flex items-center gap-4">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => toggleCalendar(calendar.id)}
                          className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                          style={{
                            backgroundColor: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          <span
                            className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                            style={{
                              left: isSelected ? 'calc(100% - 1rem - 4px)' : '4px',
                            }}
                          />
                        </button>
                        
                        {/* Calendar Info */}
                        <div className="flex-1 flex flex-col min-w-0" style={{ lineHeight: '1.2' }}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span 
                              className="text-[24px] font-medium truncate max-w-[300px]" 
                              style={{ color: 'var(--text-primary)' }}
                              title={calendar.summary}
                            >
                              {calendar.summary}
                            </span>
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: calendarColor }}
                            />
                          </div>
                          {calendar.primary && (
                            <p className="text-[18px] font-medium" style={{ color: 'var(--primary)', margin: 0 }}>
                              Primary Calendar
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Others Section (Read-only calendars) */}
            {sortedOtherCalendars.length > 0 && (
              <div>
                <h3 className="text-[24px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Others
                </h3>
                
                {/* Calendar List */}
                <div className="space-y-4">
                  {sortedOtherCalendars.map((calendar, index) => {
                    const isSelected = selectedIds.has(calendar.id);
                    // Use index offset for color calculation
                    const calendarColor = getCalendarColor(calendar, sortedYourCalendars.length + index);
                    
                    return (
                      <div key={calendar.id} className="flex items-center gap-4">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => toggleCalendar(calendar.id)}
                          className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                          style={{
                            backgroundColor: isSelected ? 'var(--primary)' : 'rgba(0, 0, 0, 0.2)',
                          }}
                        >
                          <span
                            className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                            style={{
                              left: isSelected ? 'calc(100% - 1rem - 4px)' : '4px',
                            }}
                          />
                        </button>
                        
                        {/* Calendar Info */}
                        <div className="flex-1 flex flex-col min-w-0" style={{ lineHeight: '1.2' }}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span 
                              className="text-[24px] font-medium truncate max-w-[300px]" 
                              style={{ color: 'var(--text-primary)' }}
                              title={calendar.summary}
                            >
                              {calendar.summary}
                            </span>
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: calendarColor }}
                            />
                          </div>
                          <p className="text-[18px] font-medium" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {calendar.accessRole === 'reader' ? 'Read Only' : 'Free/Busy Only'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[color:var(--text-secondary)] px-8 py-1.5 flex items-center justify-between">
          {/* Left: Select All/None */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-[18px] font-medium"
              style={{ color: 'var(--primary)' }}
              type="button"
            >
              Select All
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>|</span>
            <button
              onClick={handleSelectNone}
              className="text-[18px] font-medium"
              style={{ color: 'var(--text-secondary)' }}
              type="button"
            >
              Select None
            </button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirm}
              className="px-4 py-1 rounded-full text-[18px] font-semibold"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--inverse-color)',
              }}
              type="button"
            >
              Import {selectedIds.size} {selectedIds.size === 1 ? 'Calendar' : 'Calendars'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

