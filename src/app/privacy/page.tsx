"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className="max-w-3xl mx-auto px-8 py-12">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[color:var(--primary)] hover:opacity-80 transition-opacity mb-6"
      >
        <ArrowLeft size={20} />
        <span className="text-base font-medium">Back</span>
      </button>
      
      <h1 className="text-4xl font-bold text-[color:var(--text-primary)] mb-8">Privacy Policy for MyCalendarStats</h1>
      
      <div className="space-y-6 text-gray-800">
        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">1. Data Access & Collection</h2>
          <p className="text-base leading-relaxed">
            MyCalendarStats accesses your Google Calendar data (specifically events) via the Google Calendar API. 
            We access this data strictly to generate statistical charts and insights for you within the application.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">2. Limited Use Disclosure</h2>
          <p className="text-base leading-relaxed">
            MyCalendarStats' use and transfer to any other app of information received from Google APIs will adhere 
            to the Google API Services User Data Policy, including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">3. Data Storage</h2>
          <p className="text-base leading-relaxed">
            Google Calendar data is stored locally in your browser's localStorage for the purpose of generating statistics and insights. All processing is done client-side in your browser. We do not store your calendar data on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">4. Data Sharing, Transfer, and Disclosure</h2>
          <p className="text-base leading-relaxed">
            We do not share, transfer, or disclose your Google user data to any third parties. All Google Calendar data remains on your device and is never transmitted to external servers or shared with other parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">5. Data Protection Mechanisms</h2>
          <p className="text-base leading-relaxed">
            Your Google Calendar data is protected through client-side storage in your browser's localStorage, which is subject to your browser's built-in security mechanisms. Data is encrypted in transit when accessing the Google Calendar API using HTTPS. All data processing occurs locally on your device and is never transmitted to our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">6. Data Retention and Deletion</h2>
          <p className="text-base leading-relaxed">
            Google Calendar data is stored in your browser's localStorage and will persist until you clear your browser's local storage data. You can delete your Google Calendar data at any time by clearing your browser's localStorage for this application. We do not retain any copies of your Google Calendar data on our servers, and all data is automatically removed when you clear your browser storage.
          </p>
        </section>
      </div>
      
      <div className="mt-12 text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </main>
  );
}

