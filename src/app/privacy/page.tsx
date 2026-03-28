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
            MyCalendarStats runs entirely in your web browser. Calendar data comes from iCal (.ics) files you choose
            to load or from demo data you generate in the app. We do not collect calendar data on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">2. Data Storage</h2>
          <p className="text-base leading-relaxed">
            Data you process is stored locally in your browser (for example in localStorage) so the app can show
            statistics and charts. All processing is client-side. We do not store your calendar data on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">3. Data Sharing</h2>
          <p className="text-base leading-relaxed">
            We do not sell or share your calendar data with third parties. Data you load stays on your device unless
            you export or copy it yourself.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">4. Data Protection</h2>
          <p className="text-base leading-relaxed">
            Local browser storage is subject to your browser&apos;s security model. Clear site data in your browser
            to remove stored information for this app.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">5. Data Retention</h2>
          <p className="text-base leading-relaxed">
            Stored data persists until you clear it using the app controls or your browser&apos;s settings. We do not
            retain copies on our servers.
          </p>
        </section>
      </div>
      
      <div className="mt-12 text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </main>
  );
}
