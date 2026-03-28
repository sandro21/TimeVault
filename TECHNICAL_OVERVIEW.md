# MyCalendarStats - Technical Documentation

**Project Type:** Full-Stack Web Application (Client-Side Processing)  
**Live URL:** https://mycalendarstats.com  
**Domain:** Calendar Analytics, Data Visualization, Privacy-First SaaS

---

## Section 1: Project Description

**MyCalendarStats** is a privacy-focused calendar analytics web application that transforms raw calendar data (iCal files and Google Calendar) into actionable insights about time usage patterns. Unlike traditional analytics platforms, MyCalendarStats processes all data locally in the browser using advanced client-side parsing and computation algorithms, ensuring complete user privacy while delivering enterprise-level analytics including time tracking, activity pattern recognition, streak analysis, and AI-powered merge suggestions using Levenshtein distance.

**Core Problem Solved:** Users lack visibility into how they spend time across calendar events. Most calendar apps don't provide analytics, and existing solutions require uploading sensitive data to third-party servers. MyCalendarStats provides GitHub Contributions-style visualizations, activity trend analysis, and data quality management—all while keeping data completely private through local browser processing.

---

## Section 2: Technologies Used

### Backend & Core

**TypeScript 5.x**  
- **Specific Implementation:** 100% TypeScript codebase with strict type checking. Created custom type definitions for calendar events, statistics interfaces (`GlobalStats`, `ActivityStats`, `TopActivity`), and chart data structures with complex generic types for filtering functions.
- **Key Modules:** `src/lib/calculations/stats.ts` (426 lines - core types and algorithms)

**Next.js 16.0.10 (App Router)**  
- **Specific Implementation:** Leveraged App Router for 7 distinct pages with server/client component split. Server components handle metadata/SEO with JSON-LD structured data. Configured React Compiler (`reactCompiler: true`) for automatic optimizations. Custom dev server binding to `0.0.0.0` for network access.
- **Key Modules:** `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts`

**React 19.2.0 with React Compiler**  
- **Specific Implementation:** Used Context API for dual-state management (FilterContext for time ranges, EventsContext for calendar data). Leveraged `useMemo` extensively for expensive computations (chart data generation, statistics calculations). React Compiler enables automatic optimizations without manual memoization.
- **Key Modules:** `src/contexts/FilterContext.tsx`, `src/contexts/EventsContext.tsx`, 26 components

### Data Processing & Parsing

**Custom Browser ICS Parser**  
- **Specific Implementation:** Built from scratch to parse iCal files client-side without dependencies. Handles RFC 5545 iCalendar format with regex-based VEVENT extraction, DTSTART/DTEND/DURATION parsing, all-day event detection, UTC/local time zones, and ISO 8601 duration parsing (PT1H30M format).
- **Key Modules:** `src/lib/calculations/parse-ics-browser.ts` (132 lines)

**Google Calendar API v3 Integration**  
- **Specific Implementation:** Custom OAuth2 implicit flow with popup-based authentication. Fetches calendar list and events with pagination support (maxResults: 2500). Implements origin verification for security. Stores events in LocalStorage with Date object serialization/deserialization.
- **Key Modules:** `src/lib/google-auth.ts`, `src/lib/calculations/parse-google-calendar.ts`, `src/app/oauth-callback/page.tsx`

### UI & Visualization

**Tailwind CSS 4 + Custom Design System**  
- **Specific Implementation:** Implemented 70+ CSS custom properties for design tokens organized into 8 categories. Created utility classes for glassmorphic card styles (`.card-soft` with backdrop-blur: 54px), typography scales (6 custom classes), and complex mobile-first responsive layouts with grid-to-flex transformations at 768px breakpoint.
- **Key Modules:** `src/app/globals.css` (750+ lines), `figma-design-tokens.json`

**Recharts 3.5.1**  
- **Specific Implementation:** Built 10+ distinct chart types with custom tooltips using absolute positioning and backdrop blur. Implemented dynamic interval switching (Daily/Every 4 days/Weekly/Monthly) based on filter selection. Created custom tick formatters for month labels. Used `ResponsiveContainer` with explicit 320px height management on mobile.
- **Key Modules:** `src/components/TimeLoggedChart.tsx` (517 lines), `src/components/TopActivitiesChart.tsx`, plus 8 other chart components

**React Activity Calendar 3.0.1**  
- **Specific Implementation:** GitHub-style contribution calendar with custom color scheme matching brand colors using CSS variables.
- **Key Modules:** `src/components/ContributionsCalendar.tsx`

### State Management

**React Context API + LocalStorage**  
- **Specific Implementation:** Dual-context architecture: FilterContext manages time range state with automatic date clamping using `useEffect`; EventsContext loads calendar data from LocalStorage on mount, applies title mappings, filters removed events. Custom data schema with 6 keys: `uploadedCalendars`, `googleCalendarEvents`, `activityTitleMappings`, `removedEventIds`, `hiddenCalendarIds`, `hiddenActivityNames`.
- **Key Modules:** `src/contexts/FilterContext.tsx` (84 lines), `src/contexts/EventsContext.tsx` (122 lines)

### Authentication & Security

**Google OAuth 2.0 (Implicit Flow)**  
- **Specific Implementation:** Popup-based OAuth with `response_type=token`. PostMessage communication between popup and parent window with origin verification (`event.origin !== window.location.origin` check). Token stored in memory only (not persisted). Read-only scope (`calendar.readonly`).
- **Key Modules:** `src/lib/google-auth.ts`

### DevOps

**Vercel Deployment**  
- Automatic deployments from Git, environment variables (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`), custom domain (mycalendarstats.com), edge network optimization, automatic HTTPS.

---

## Section 2.5: Frontend & Design Engineering

### Styling System
- **Custom Design Tokens:** 70+ CSS custom properties in `globals.css` organized into 8 categories (page colors, text, timeline, brand, status, charts)
- **Color System:** Primary brand (`--primary: #D63821`) with 5 opacity variants (`--primary-10` through `--primary-30`). Chart palette: 10 distinct colors plus "Other" category
- **Typography Scale:** 6 custom classes (`.text-section-header` 40px, `.text-card-title` 32px, `.text-number-large` 55px, etc.) with mobile overrides
- **Card System:** Glassmorphic effects with 54px backdrop blur, 50px border radius, custom shadows

### Interactive Elements
1. **Interval Selector Dropdown** - Custom dropdown with chevron animation, backdrop overlay, active state highlighting (`TimeLoggedChart.tsx`)
2. **Dynamic Chart Intervals** - Real-time chart regeneration when switching Daily/Every 4 days/Weekly/Monthly
3. **Custom Chart Tooltips** - Absolute positioning, backdrop blur, dynamic formatting based on interval type
4. **Filter Navigation** - Arrow navigation with intelligent date boundary checking and clamping
5. **OAuth Popup Flow** - Popup management with postMessage, origin verification, automatic closure
6. **Search Autocomplete** - Real-time substring matching with immediate results
7. **Breadcrumb Navigation** - Clickable activity navigation with dropdown

### Responsiveness
**Mobile-First Design (768px breakpoint):**
- Desktop 3-column grid → Mobile single column flex (special case: first section maintains 2-column grid)
- Chart heights fixed at 320px on mobile with explicit `ResponsiveContainer` dimensions
- Font size reductions: 40px→28px, 32px→20px, 55px→32px
- Component hiding: Event Timeline, Pie Chart, Interval selector
- Padding: 72px→16px, Section gaps: 90px→60px

---

## Section 3: System Architecture & Patterns

### Design Patterns

1. **Context API Pattern** - Dual contexts to avoid unnecessary re-renders: FilterContext (time range), EventsContext (calendar data)
2. **Factory Pattern** - `createCalendarEvent()` derives properties (durationMinutes, dayOfWeek, dayString) from input
3. **Strategy Pattern** - `getIntervalStart()` uses different strategies for Daily/Weekly/Monthly/Every 4 days grouping
4. **Memoization Pattern** - Extensive `useMemo` for chartData, availableIntervals, topActivities calculations
5. **Separation of Concerns** - Clean architecture with layers: `app/` (UI), `components/` (Presentation), `contexts/` (State), `lib/calculations/` (Domain)
6. **Client/Server Split** - Server components for metadata/SEO, client components for interactivity

### Key Algorithms

**1. Longest Streak Detection (O(n log n))**
```typescript
// src/lib/calculations/stats.ts (lines 203-250)
- Extract unique days from events (sorted chronologically)
- Iterate through days, comparing with previous
- If daysDiff === 1, increment current streak
- If daysDiff > 1, check if current streak > longest, reset
- Track {days, from, to} for longest streak
```

**2. Levenshtein Distance (O(m×n) Dynamic Programming)**
```typescript
// src/lib/calculations/activity-suggestions.ts (lines 21-49)
- Build DP matrix[len1+1][len2+1]
- For each cell: min of deletion, insertion, substitution costs
- Similarity = 1 - (distance / maxLength)
- Used for merge suggestions with 0.7 threshold
```

**3. Time Interval Grouping with Zero-Filling (O(n + k))**
```typescript
// src/components/TimeLoggedChart.tsx (lines 115-156)
- Map events to interval keys (YYYY-MM-DD of interval start)
- Accumulate durationMinutes per interval in Map
- Generate all intervals in date range (including empty ones)
- Return array with 0 for missing intervals
- Special case: Year filter generates 12 months/52 weeks upfront
```

**4. Data Quality Detection**
```typescript
// src/lib/calculations/activity-suggestions.ts
- Multi-pass analysis: future events, suspicious durations (≤0 or >24hrs)
- Duplicate detection using Map key = title|timestamp|duration
- Birthday keyword matching (multi-language)
- Recurring holiday detection (appears once/year for 2+ years)
- O(n²) for duplicates, O(n) for others
```

---

## Section 4: Implemented Features (Factual Only)

### Core User Features
1. **Calendar Import** - Upload multiple .ics files, connect Google Calendar (OAuth2), generate demo data
2. **Time Filtering** - Month/Year/LifeTime views with arrow navigation, smart date clamping, future date prevention
3. **Global Dashboard** (`/all-activity`) - Total/unique activities, time logged, 10+ chart types (area, bar, pie, line, heatmap, scatter, histogram, GitHub-style calendar)
4. **Activity Analytics** (`/activity`) - Individual activity deep-dive with stats (count, duration, first/last session, longest streak, biggest break) and activity-specific charts
5. **Data Cleaning** (`/process`) - AI-powered merge suggestions (Levenshtein distance, 0.7 threshold), data quality detection (6 categories), bulk operations
6. **Filter Management** - Hide activities/calendars, un-hide, LocalStorage persistence, version-based re-rendering

### Background Processes
1. Event loading on mount with transformations (title mappings, removed events filter, hidden items filter)
2. Date clamping effect with automatic boundary adjustment
3. Mobile responsiveness detection with resize listener
4. OAuth token validation with origin verification

---

## Section 5: Code Metrics

- **0 Database Tables** - Client-side architecture using LocalStorage (6-key schema)
- **0 API Routes** - No backend server (uses Google Calendar API v3)
- **8 Calculation Services** - `stats.ts` (426 lines), `activity-suggestions.ts` (319 lines), `parse-ics-browser.ts` (132 lines), `filter-events.ts`, `parse-google-calendar.ts`, etc.
- **2 Context Providers** - FilterContext (84 lines), EventsContext (122 lines)
- **26 React Components** - 5 page/dashboard, 11 charts, 3 filters, 4 search, 3 management
- **750+ Lines Custom CSS** - Design system with 70+ CSS variables, responsive breakpoints

---

## Section 6: Resume-Ready Descriptions

### One-Liner
Privacy-focused calendar analytics tool with client-side processing and visualization

### Short
Built a privacy-first calendar analytics web application using Next.js 16, React 19, and TypeScript that processes iCal files and Google Calendar data entirely in the browser. Implemented 10+ custom data visualizations with Recharts, OAuth2 authentication flow, and AI-powered merge suggestions using Levenshtein distance algorithm. Achieved 100% client-side architecture with zero server-side data storage.

### Medium
Developed MyCalendarStats, a full-stack web application that transforms calendar data into actionable insights through advanced client-side analytics. Built with Next.js 16 App Router, React 19, and TypeScript, featuring OAuth2 Google Calendar integration, custom browser-based ICS parser, and 10+ interactive charts. Implemented complex algorithms including Levenshtein distance for merge suggestions (0.7 threshold), consecutive streak detection, and dynamic interval grouping for time-series visualization. Designed complete privacy-first architecture with React Context API for state management and LocalStorage for persistence.

### Detailed
Built MyCalendarStats, a sophisticated privacy-focused calendar analytics SaaS platform that processes calendar data entirely in the browser to deliver enterprise-level insights while maintaining complete user privacy. Architected using Next.js 16 App Router with React 19 and TypeScript 5, implementing dual-context state management and custom business logic layer with 8 calculation modules totaling 1,100+ lines. Developed custom browser-compatible ICS parser using regex-based VEVENT extraction and ISO 8601 duration parsing. Integrated Google Calendar API with OAuth2 implicit flow using popup-based authentication and origin verification. Built 10+ interactive visualizations using Recharts with 4 dynamic interval types, custom tooltips, and responsive design. Implemented advanced algorithms: Levenshtein distance string similarity (O(m×n), 0.7 threshold), consecutive streak detection (O(n log n)), and interval bucketing with zero-filling. Designed comprehensive mobile-responsive UI with 70+ CSS variables and complex grid-to-flex transformations.

---

## Section 7: Quantifiable Achievements

- **Architected zero-backend analytics platform** processing 100% of calendar data client-side, eliminating server costs and ensuring complete privacy
- **Built custom browser ICS parser** handling RFC 5545 format with VEVENT extraction, date parsing (UTC/local), and duration calculation without external dependencies (132 lines)
- **Implemented 10+ interactive data visualizations** using Recharts: area charts with 4 dynamic intervals, multi-line trends, heatmaps, histograms, pie charts, scatter plots
- **Developed AI-powered merge suggestion system** using Levenshtein distance algorithm (O(m×n)) with 0.7 similarity threshold
- **Created 5-category data quality detection** identifying zero-duration events, duplicates, suspicious events (>24hrs), birthday patterns, and recurring holidays
- **Integrated OAuth2 Google Calendar authentication** with popup-based implicit flow, postMessage communication, and origin verification
- **Built dual-context state management** (FilterContext + EventsContext) with custom hooks and version-based re-rendering
- **Designed mobile-responsive UI with 750+ lines of custom CSS** including 70+ CSS variables, complex grid-to-flex transformations, and 320px chart heights on mobile
- **Implemented 4 time-filtering modes** (Month/Year/LifeTime/Custom) with smart date clamping and boundary enforcement
- **Optimized performance with React 19 Compiler** enabling automatic memoization across 26 components
- **Created 8-module calculation service layer** totaling 1,100+ lines of business logic with O(n log n) sorting algorithms
- **Achieved 100% TypeScript coverage** across 40+ files with strict type checking and custom interfaces
- **Built 6 distinct chart customizations**: custom tooltips with backdrop blur, dynamic interval switching, month label formatting, responsive containers, custom tick formatters
- **Implemented comprehensive SEO optimization** with JSON-LD structured data (SoftwareApplication + FAQPage schemas), Open Graph tags, Twitter Cards

---

## Section 8: "The Hardest Code"

### 1. TimeLoggedChart.tsx (517 lines)

**What it does:** Generates dynamic time-series area chart with 4 configurable interval types (Daily, Every 4 days, Weekly, Monthly). Handles complex event grouping, zero-filling missing intervals, month label generation, and mobile/desktop interval selection.

**Why it is complex:**
- **Multi-Interval Strategy**: 4 different bucketing strategies. "Every 4 days" requires epoch-based calculation (fixed reference date: 2020-01-01) to ensure consistent 4-day windows across years
- **Year Filter Special Case**: Generates all 12 months (or 52 weeks, 365 days) upfront, even with no events. Must cap at current month if viewing current year
- **Zero-Filling Algorithm**: Generates all possible intervals in date range and fills missing ones with 0. Different increment strategies per interval type
- **Custom Month Labels**: Renders labels only when month changes, requiring look-back to previous interval to detect boundaries
- **Date Edge Cases**: Handles current month (partial data), year boundaries, leap years, always caps at "today"

### 2. activity-suggestions.ts (319 lines)

**What it does:** Implements AI-powered activity merge suggestions using Levenshtein distance and comprehensive data quality detection (6 categories).

**Why it is complex:**
- **Dynamic Programming**: Full Levenshtein distance with O(m×n) matrix calculation handling edge cases (empty strings, substrings, identical strings)
- **Multi-Stage Similarity**: Combines exact match after normalization, substring containment (with length ratio), and Levenshtein distance. Returns 0-1 similarity score
- **Merge Grouping**: Groups similar activities avoiding duplicates. Uses Set for tracking with nested loops O(n²) for all pair comparisons
- **Confidence Calculation**: Average similarity across all pairs in group: `Σ similarity(a,b) / comparisons`
- **Recurring Holiday Detection**: Two-pass algorithm grouping by normalized title and year, detecting patterns appearing once/year for 2+ years with keyword matching

### 3. stats.ts (426 lines)

**What it does:** Core statistics computation with functions for global stats, activity stats, top activities, streak detection, biggest break calculation, and time formatting. Contains all TypeScript interfaces.

**Why it is complex:**
- **Longest Streak Algorithm**: Detects consecutive days with activity. Requires sorting unique days, iterating with day difference calculation, tracking current vs longest streak, handling final streak check. Edge cases: single-day activities, 1-day gaps, timezone boundaries
- **Biggest Break Algorithm**: Finds maximum gap between events. Iterates through sorted events calculating time differences
- **Top Activities Ranking**: Map-reduce with grouping by title. Aggregates count, totalMinutes, longestSession, averageSession. Supports sorting by count OR time with top N limit
- **Interface Design**: Defines 8 TypeScript interfaces with proper relationships: `CalendarEvent` (9 properties), `GlobalStats`, `ActivityStats` (8 properties with nested objects), `TopActivity`, `TimeBreakdown`, `TimelineBookends`

---

## Section 9: Technical Implementations (Snippets)

### Snippet 1: OAuth Popup Security with Origin Verification

**File:** `src/lib/google-auth.ts`

```typescript
const messageHandler = (event: MessageEvent) => {
  // Verify origin for security - prevents XSS attacks
  if (event.origin !== window.location.origin) {
    return; // Silently ignore messages from other origins
  }

  if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
    window.removeEventListener('message', messageHandler);
    popup.close();
    resolve(event.data.token);
  } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
    window.removeEventListener('message', messageHandler);
    popup.close();
    reject(new Error(event.data.error || 'Authentication failed'));
  }
};
```

**Why it's impressive:** Origin verification prevents XSS, proper resource cleanup (removes listeners), explicit type checking on message data.

### Snippet 2: Type-Safe Context with Error Boundary

**File:** `src/contexts/EventsContext.tsx`

```typescript
interface EventsContextType {
  events: CalendarEvent[];
  refreshEvents: () => void;
  hiddenStateVersion: number;
  refreshHiddenState: () => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
```

**Why it's impressive:** Full TypeScript interface, custom hook with error boundary throws descriptive error if used outside provider (catches bugs early), clean API pattern.

### Snippet 3: Memoized Chart Data with Zero-Filling

**File:** `src/components/TimeLoggedChart.tsx`

```typescript
const chartData = useMemo(() => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const filteredEvents = events.filter(event => event.start <= today);
  
  // Group events by interval
  const eventsByInterval = new Map<string, number>();
  filteredEvents.forEach((event) => {
    const intervalKey = getIntervalKey(event.start, effectiveInterval);
    eventsByInterval.set(intervalKey, (eventsByInterval.get(intervalKey) || 0) + event.durationMinutes);
  });

  // Generate all intervals including missing ones (zero-fill)
  return allIntervals.map((intervalKey) => ({
    date: intervalKey,
    minutes: eventsByInterval.get(intervalKey) || 0, // Zero-fill missing
    dateObj: parseIntervalKey(intervalKey),
    monthLabel: calculateMonthLabel(intervalKey, index),
  }));
}, [events, effectiveInterval, selectedFilter, currentYear]);
```

**Why it's impressive:** Performance optimization with `useMemo`, zero-filling shows gaps in data (better UX), explicit dependency management, modular helper functions, handles current year partial data.

---

**Summary:** This project demonstrates expertise in modern React patterns, algorithm design (dynamic programming, streak detection, interval grouping), browser APIs, security (origin verification, OAuth2), performance optimization, responsive design, type safety, data visualization, and clean architecture.
