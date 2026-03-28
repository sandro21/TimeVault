"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Head from "next/head";

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
            We do not store your calendar data on our servers. All processing is done client-side in your browser 
            or temporarily in memory to generate your session's report.
          </p>
        </section>
      </div>
      
      <div className="mt-12 text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </main>
  );
}

