import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { GlobalFilterBar } from "@/components/GlobalFilterBar";
import { Footer } from "@/components/Footer";
import { FilterProvider } from "@/contexts/FilterContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { Suspense } from "react";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MyCalendarStats - Visualize Your Time",
  description: "Transform your Google Calendar and iCal data into beautiful insights. Track activities, analyze habits, and discover how you spend your time with detailed statistics and interactive charts.",
  keywords: ["calendar stats", "calendar statistics", "iCal stats", "ical analyzer", "iCal trends", "calendar analytics", "Google Calendar stats", "iCal statistics", "calendar insights", "calendar data analysis", "calendar dashboard", "time tracking", "time analysis", "calendar metrics", "schedule analysis", "productivity tracker", "time management", "calendar visualization", "activity tracking", "calendar patterns", "productivity analytics", "time spent analysis", "calendar trends", "Google Calendar dashboard", "calendar reporting", "how I spend my time", "calendar history"],
  authors: [{ name: "MyCalendarStats" }],
  metadataBase: new URL('https://mycalendarstats.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "MyCalendarStats - Visualize Your Time",
    description: "Transform your calendar data into beautiful insights and discover how you spend your time.",
    type: "website",
    url: "https://mycalendarstats.com",
    siteName: "MyCalendarStats",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyCalendarStats - Visualize Your Time",
    description: "Transform your calendar data into beautiful insights and discover how you spend your time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MyCalendarStats",
    "applicationCategory": "ProductivityApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "operatingSystem": "Web Browser",
    "description": "Transform your Google Calendar and iCal data into beautiful insights. Track activities, analyze habits, and discover how you spend your time.",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${urbanist.className} antialiased`}>
        <FilterProvider>
          <EventsProvider>
            <div className="min-h-screen bg-[color:var(--page-bg)] flex flex-col">
              {/* Scattered hearts */}
              {/* <div className="heart heart-1">♥</div>
              <div className="heart heart-2">♥</div>
              <div className="heart heart-3">♥</div>
              <div className="heart heart-4">♥</div>
              <div className="heart heart-5">♥</div> */}


              
              <Suspense fallback={null}>
                <GlobalFilterBar />
              </Suspense>
              <div className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
                {children}
              </div>
              <Footer />
            </div>
          </EventsProvider>
        </FilterProvider>
      </body>
    </html>
  );
}
