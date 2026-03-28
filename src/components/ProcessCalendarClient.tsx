"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarEvent } from "@/lib/calculations/stats";
import {
  generateMergeSuggestions,
  detectDataQualityIssues,
  MergeSuggestion,
  DataQualityIssue,
} from "@/lib/calculations/activity-suggestions";
import {
  computeGlobalStats,
  formatAsDaysHoursMinutes,
} from "@/lib/calculations/stats";
import { useEvents } from "@/contexts/EventsContext";

type ProcessingStep = "suggestions" | "quality" | "preview";

export function ProcessCalendarClient() {
  const router = useRouter();
  const { refreshEvents } = useEvents();
  const [originalEvents, setOriginalEvents] = useState<CalendarEvent[]>([]);
  const [processedEvents, setProcessedEvents] = useState<CalendarEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("suggestions");
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
  const [appliedMerges, setAppliedMerges] = useState<Map<string, string>>(new Map());
  const [dataQualityIssues, setDataQualityIssues] = useState<DataQualityIssue[]>([]);
  const [removedEventIds, setRemovedEventIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Load events from sessionStorage on mount
  useEffect(() => {
    const processingData = sessionStorage.getItem("processingCalendars");
    if (!processingData) {
      router.push("/upload");
      return;
    }

    try {
      const data = JSON.parse(processingData);
      // Convert date strings back to Date objects
      const events: CalendarEvent[] = data.events.map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
      setOriginalEvents(events);
      setProcessedEvents(events);
    } catch (error) {
      console.error("Error loading processing data:", error);
      router.push("/upload");
    }
  }, [router]);

  // Generate merge suggestions when events are loaded
  useEffect(() => {
    if (originalEvents.length > 0) {
      const suggestions = generateMergeSuggestions(originalEvents, 0.7);
      setMergeSuggestions(suggestions);
      
      const issues = detectDataQualityIssues(originalEvents);
      setDataQualityIssues(issues);
    }
  }, [originalEvents]);

  // Apply merges to events
  const applyMerges = (merges: Map<string, string>, events: CalendarEvent[]): CalendarEvent[] => {
    if (merges.size === 0) return events;
    
    return events.map((event) => {
      const newTitle = merges.get(event.title);
      if (newTitle) {
        return { ...event, title: newTitle };
      }
      return event;
    });
  };

  // Remove events by IDs
  const removeEvents = (ids: Set<string>, events: CalendarEvent[]): CalendarEvent[] => {
    return events.filter((event) => !ids.has(event.id));
  };

  // Update processed events when merges or removals change
  useEffect(() => {
    let events = originalEvents;
    events = applyMerges(appliedMerges, events);
    events = removeEvents(removedEventIds, events);
    setProcessedEvents(events);
  }, [originalEvents, appliedMerges, removedEventIds]);

  const handleApplyMerge = (suggestion: MergeSuggestion, newName: string) => {
    const newMerges = new Map(appliedMerges);
    suggestion.activities.forEach((activity) => {
      newMerges.set(activity, newName);
    });
    setAppliedMerges(newMerges);
  };

  const handleRejectMerge = (suggestion: MergeSuggestion) => {
    // Remove from suggestions
    setMergeSuggestions((prev) =>
      prev.filter((s) => s !== suggestion)
    );
  };

  const handleRemoveIssue = (issue: DataQualityIssue) => {
    setRemovedEventIds((prev) => new Set([...prev, issue.event.id]));
    setDataQualityIssues((prev) => prev.filter((i) => i !== issue));
  };

  const handleKeepIssue = (issue: DataQualityIssue) => {
    setDataQualityIssues((prev) => prev.filter((i) => i !== issue));
  };

  const handleSkip = async () => {
    setIsProcessing(true);
    
    try {
      // Get the new calendars from sessionStorage
      const processingData = sessionStorage.getItem("processingCalendars");
      if (!processingData) {
        throw new Error("Processing data not found");
      }

      const data = JSON.parse(processingData);
      const newCalendars = data.newCalendars;

      // Store new calendars in localStorage without any processing changes
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      storedCalendars.push(...newCalendars);
      localStorage.setItem('uploadedCalendars', JSON.stringify(storedCalendars));

      // Clear session storage
      sessionStorage.removeItem('processingCalendars');
      sessionStorage.removeItem('uploadErrors');

      // Refresh events in context
      refreshEvents();

      // Navigate to dashboard
      router.push('/all-activity');
    } catch (error) {
      console.error('Error skipping processing:', error);
      alert('Failed to skip processing. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setIsProcessing(true);
    
    try {
      // Get the new calendars from sessionStorage
      const processingData = sessionStorage.getItem("processingCalendars");
      if (!processingData) {
        throw new Error("Processing data not found");
      }

      const data = JSON.parse(processingData);
      const newCalendars = data.newCalendars;

      // Store new calendars in localStorage
      const storedCalendars = JSON.parse(localStorage.getItem('uploadedCalendars') || '[]');
      storedCalendars.push(...newCalendars);
      localStorage.setItem('uploadedCalendars', JSON.stringify(storedCalendars));

      // Build title mappings (original -> processed)
      const titleMappings: Record<string, string> = {};
      appliedMerges.forEach((newTitle, originalTitle) => {
        titleMappings[originalTitle] = newTitle;
      });

      // Load existing mappings and merge
      const existingMappings = JSON.parse(localStorage.getItem('activityTitleMappings') || '{}');
      const mergedMappings = { ...existingMappings, ...titleMappings };
      localStorage.setItem('activityTitleMappings', JSON.stringify(mergedMappings));

      // Store removed event IDs
      const existingRemoved = JSON.parse(localStorage.getItem('removedEventIds') || '[]');
      const mergedRemoved = [...existingRemoved, ...Array.from(removedEventIds)];
      localStorage.setItem('removedEventIds', JSON.stringify(mergedRemoved));

      // Clear session storage
      sessionStorage.removeItem('processingCalendars');
      sessionStorage.removeItem('uploadErrors');

      // Refresh events in context
      refreshEvents();

      // Navigate to dashboard
      router.push('/all-activity');
    } catch (error) {
      console.error('Error saving processed data:', error);
      alert('Failed to save processed data. Please try again.');
      setIsProcessing(false);
    }
  };

  const originalStats = useMemo(() => {
    if (originalEvents.length === 0) return null;
    return computeGlobalStats(originalEvents);
  }, [originalEvents]);

  const processedStats = useMemo(() => {
    if (processedEvents.length === 0) return null;
    return computeGlobalStats(processedEvents);
  }, [processedEvents]);

  if (originalEvents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body-24 text-[color:var(--gray)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-black">Clean Your Calendar</h1>
        <p className="text-body-24 text-[color:var(--gray)]">
          We found {originalEvents.length} events. Review and clean up your data before viewing stats.
        </p>
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentStep("suggestions")}
          className={`px-6 py-2 rounded-full text-body-24 ${
            currentStep === "suggestions"
              ? "bg-[color:var(--red-1)] text-white"
              : "bg-gray-200 text-black"
          }`}
        >
          Merge Activities
        </button>
        <button
          onClick={() => setCurrentStep("quality")}
          className={`px-6 py-2 rounded-full text-body-24 ${
            currentStep === "quality"
              ? "bg-[color:var(--red-1)] text-white"
              : "bg-gray-200 text-black"
          }`}
        >
          Data Quality
        </button>
        <button
          onClick={() => setCurrentStep("preview")}
          className={`px-6 py-2 rounded-full text-body-24 ${
            currentStep === "preview"
              ? "bg-[color:var(--red-1)] text-white"
              : "bg-gray-200 text-black"
          }`}
        >
          Preview
        </button>
        <button
          onClick={handleSkip}
          disabled={isProcessing}
          className="px-6 py-2 rounded-full text-body-24 bg-white text-black border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip
        </button>
      </div>

      {/* Step Content */}
      <div className="card-soft p-8">
        {currentStep === "suggestions" && (
          <MergeSuggestionsStep
            suggestions={mergeSuggestions}
            onApply={handleApplyMerge}
            onReject={handleRejectMerge}
            appliedMerges={appliedMerges}
          />
        )}

        {currentStep === "quality" && (
          <DataQualityStep
            issues={dataQualityIssues}
            onRemove={handleRemoveIssue}
            onKeep={handleKeepIssue}
          />
        )}

        {currentStep === "preview" && (
          <PreviewStep
            originalStats={originalStats}
            processedStats={processedStats}
            originalCount={originalEvents.length}
            processedCount={processedEvents.length}
            onSave={handleSaveAndContinue}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </div>
  );
}

// Merge Suggestions Step Component
function MergeSuggestionsStep({
  suggestions,
  onApply,
  onReject,
  appliedMerges,
}: {
  suggestions: MergeSuggestion[];
  onApply: (suggestion: MergeSuggestion, newName: string) => void;
  onReject: (suggestion: MergeSuggestion) => void;
  appliedMerges: Map<string, string>;
}) {
  const [editingSuggestion, setEditingSuggestion] = useState<MergeSuggestion | null>(null);
  const [editName, setEditName] = useState("");

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body-24 text-[color:var(--gray)]">
          No merge suggestions found. Your activity names look good!
        </p>
      </div>
    );
  }

  const handleStartEdit = (suggestion: MergeSuggestion) => {
    setEditingSuggestion(suggestion);
    setEditName(suggestion.suggestedName);
  };

  const handleSaveEdit = (suggestion: MergeSuggestion) => {
    if (editName.trim()) {
      onApply(suggestion, editName.trim());
    }
    setEditingSuggestion(null);
  };

  const isApplied = (suggestion: MergeSuggestion) => {
    return suggestion.activities.every((activity) => appliedMerges.has(activity));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black mb-4">Activity Merge Suggestions</h2>
      <p className="text-body-24 text-[color:var(--gray)] mb-6">
        We found {suggestions.length} groups of similar activities that you might want to merge.
      </p>

      <div className="space-y-4">
        {suggestions.map((suggestion, index) => {
          const applied = isApplied(suggestion);
          
          return (
            <div
              key={index}
              className={`border-2 rounded-lg p-4 ${
                applied ? "border-green-500 bg-green-50" : "border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-[color:var(--gray)]">
                      {suggestion.activities.length} activities
                    </span>
                    <span className="text-sm text-[color:var(--gray)]">
                      • {suggestion.eventCount} events
                    </span>
                    <span className="text-sm text-[color:var(--gray)]">
                      • {Math.round(suggestion.confidence * 100)}% similar
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {suggestion.activities.map((activity, i) => (
                      <div key={i} className="text-body-24 text-black">
                        • {activity}
                      </div>
                    ))}
                  </div>

                  {editingSuggestion === suggestion ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-body-24"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(suggestion)}
                        className="px-4 py-2 bg-[color:var(--red-1)] text-white rounded-lg text-body-24"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSuggestion(null)}
                        className="px-4 py-2 bg-gray-200 text-black rounded-lg text-body-24"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-body-24 font-semibold text-black">
                        → Merge to: "{suggestion.suggestedName}"
                      </span>
                      {!applied && (
                        <>
                          <button
                            onClick={() => handleStartEdit(suggestion)}
                            className="px-4 py-2 bg-gray-200 text-black rounded-lg text-body-24"
                          >
                            Edit Name
                          </button>
                          <button
                            onClick={() => onApply(suggestion, suggestion.suggestedName)}
                            className="px-4 py-2 bg-[color:var(--red-1)] text-white rounded-lg text-body-24"
                          >
                            Apply Merge
                          </button>
                          <button
                            onClick={() => onReject(suggestion)}
                            className="px-4 py-2 bg-gray-200 text-black rounded-lg text-body-24"
                          >
                            Skip
                          </button>
                        </>
                      )}
                      {applied && (
                        <span className="text-sm text-green-600 font-semibold">✓ Applied</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Data Quality Step Component
function DataQualityStep({
  issues,
  onRemove,
  onKeep,
}: {
  issues: DataQualityIssue[];
  onRemove: (issue: DataQualityIssue) => void;
  onKeep: (issue: DataQualityIssue) => void;
}) {
  const groupedIssues = useMemo(() => {
    const groups: Record<string, DataQualityIssue[]> = {
      error: [],
      warning: [],
    };
    issues.forEach((issue) => {
      groups[issue.severity].push(issue);
    });
    return groups;
  }, [issues]);

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body-24 text-[color:var(--gray)]">
          No data quality issues found. Your calendar looks good!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black mb-4">Data Quality Issues</h2>
      <p className="text-body-24 text-[color:var(--gray)] mb-6">
        We found {issues.length} potential issues. Review and decide what to keep or remove.
      </p>

      {groupedIssues.error.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-red-600">Errors ({groupedIssues.error.length})</h3>
          {groupedIssues.error.map((issue, index) => (
            <IssueCard key={index} issue={issue} onRemove={onRemove} onKeep={onKeep} />
          ))}
        </div>
      )}

      {groupedIssues.warning.length > 0 && (
        <div className="space-y-4 mt-6">
          <h3 className="text-xl font-semibold text-orange-600">Warnings ({groupedIssues.warning.length})</h3>
          {groupedIssues.warning.map((issue, index) => (
            <IssueCard key={index} issue={issue} onRemove={onRemove} onKeep={onKeep} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  onRemove,
  onKeep,
}: {
  issue: DataQualityIssue;
  onRemove: (issue: DataQualityIssue) => void;
  onKeep: (issue: DataQualityIssue) => void;
}) {
  return (
    <div className={`border-2 rounded-lg p-4 ${
      issue.severity === "error" ? "border-red-300 bg-red-50" : "border-orange-300 bg-orange-50"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold text-black mb-1">{issue.event.title}</p>
          <p className="text-sm text-[color:var(--gray)] mb-2">{issue.message}</p>
          <p className="text-xs text-[color:var(--gray)]">
            {issue.event.start.toLocaleDateString()} • {Math.round(issue.event.durationMinutes / 60)}h {issue.event.durationMinutes % 60}m
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onKeep(issue)}
            className="px-4 py-2 bg-gray-200 text-black rounded-lg text-sm"
          >
            Keep
          </button>
          <button
            onClick={() => onRemove(issue)}
            className="px-4 py-2 bg-[color:var(--red-1)] text-white rounded-lg text-sm"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview Step Component
function PreviewStep({
  originalStats,
  processedStats,
  originalCount,
  processedCount,
  onSave,
  isProcessing,
}: {
  originalStats: ReturnType<typeof computeGlobalStats> | null;
  processedStats: ReturnType<typeof computeGlobalStats> | null;
  originalCount: number;
  processedCount: number;
  onSave: () => void;
  isProcessing: boolean;
}) {
  if (!originalStats || !processedStats) {
    return <div>Loading preview...</div>;
  }

  const changes = {
    events: processedCount - originalCount,
    activities: processedStats.uniqueActivities - originalStats.uniqueActivities,
    time: processedStats.totalMinutes - originalStats.totalMinutes,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black mb-4">Preview Changes</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-black">Before</h3>
          <div className="space-y-2">
            <p className="text-body-24">
              <span className="font-semibold">Events:</span> {originalCount}
            </p>
            <p className="text-body-24">
              <span className="font-semibold">Activities:</span> {originalStats.uniqueActivities}
            </p>
            <p className="text-body-24">
              <span className="font-semibold">Total Time:</span> {formatAsDaysHoursMinutes(originalStats.totalMinutes)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-black">After</h3>
          <div className="space-y-2">
            <p className="text-body-24">
              <span className="font-semibold">Events:</span> {processedCount}
              {changes.events !== 0 && (
                <span className={`ml-2 ${changes.events < 0 ? "text-red-600" : "text-green-600"}`}>
                  ({changes.events > 0 ? "+" : ""}{changes.events})
                </span>
              )}
            </p>
            <p className="text-body-24">
              <span className="font-semibold">Activities:</span> {processedStats.uniqueActivities}
              {changes.activities !== 0 && (
                <span className={`ml-2 ${changes.activities < 0 ? "text-red-600" : "text-green-600"}`}>
                  ({changes.activities > 0 ? "+" : ""}{changes.activities})
                </span>
              )}
            </p>
            <p className="text-body-24">
              <span className="font-semibold">Total Time:</span> {formatAsDaysHoursMinutes(processedStats.totalMinutes)}
              {changes.time !== 0 && (
                <span className={`ml-2 ${changes.time < 0 ? "text-red-600" : "text-green-600"}`}>
                  ({changes.time > 0 ? "+" : ""}{Math.round(changes.time / 60)}h)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-300">
        <button
          onClick={onSave}
          disabled={isProcessing}
          className="w-full px-8 py-4 bg-[color:var(--red-1)] text-white rounded-full text-body-24 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Saving..." : "Save & Continue to Dashboard"}
        </button>
      </div>
    </div>
  );
}

