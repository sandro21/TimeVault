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
  title: "MyCalendarStats - Calendar Analytics & Time Tracking Tool",
  description: "Analyze your Google Calendar and iCal data with powerful insights. Track time spent, discover activity patterns, and visualize your schedule with interactive charts.",
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
    images: [
      {
        url: "https://mycalendarstats.com/icon.png",
        width: 1200,
        height: 630,
        alt: "MyCalendarStats - Calendar Analytics Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyCalendarStats - Visualize Your Time",
    description: "Transform your calendar data into beautiful insights and discover how you spend your time.",
    images: ["https://mycalendarstats.com/icon.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "featureList": [
      "Time tracking and analytics",
      "Activity distribution charts",
      "Calendar pattern analysis",
      "Interactive data visualizations",
      "Privacy-focused local processing"
    ]
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does MyCalendarStats work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "MyCalendarStats analyzes your calendar events by uploading iCal files or connecting to Google Calendar. All data processing happens locally in your browser - we never store your calendar data on our servers. The app generates statistics, charts, and insights about your activities and time patterns."
        }
      },
      {
        "@type": "Question",
        "name": "Is my calendar data secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, your data is completely secure. All processing happens locally in your browser. We request read-only access to your Google Calendar solely to generate statistics, and we do not store any of your calendar data on our servers."
        }
      },
      {
        "@type": "Question",
        "name": "What types of insights can I get?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "MyCalendarStats provides insights including time logged over time, top activities analysis, peak activity times, day-of-week patterns, activity duration charts, and comprehensive calendar visualizations with interactive charts."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to create an account?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No account is required. Simply upload your iCal file or connect your Google Calendar to get started. All data is processed locally in your browser."
        }
      }
    ]
  };

  return (
    <html lang="en" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#e3e8e6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className={`${urbanist.className} antialiased`} style={{ colorScheme: 'light', backgroundColor: 'var(--page-bg)' }} suppressHydrationWarning>
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
