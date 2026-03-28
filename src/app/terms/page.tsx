"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Head from "next/head";

export default function TermsPage() {
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
      
      <div className="text-gray-800">
        <h1 className="text-4xl font-bold text-[color:var(--text-primary)] mb-4">Terms of Service</h1>
        <p className="mb-8 text-sm text-gray-500">Last Updated: December 26, 2025</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p className="text-base leading-relaxed">
              By accessing and using MyCalendarStats, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">2. Description of Service</h2>
            <p className="text-base leading-relaxed">
              MyCalendarStats provides a visualization dashboard for your personal Google Calendar data. 
              The service is provided "as is" and is for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">3. User Data & Privacy</h2>
            <p className="text-base leading-relaxed">
              We do not store your calendar data on our servers. All analysis happens locally in your browser 
              or in temporary memory. By using this service, you also agree to our{" "}
              <Link href="/privacy" className="text-[color:var(--primary)] underline hover:opacity-80">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">4. Google API Services</h2>
            <p className="text-base leading-relaxed">
              Our use of information received from Google APIs will adhere to the Google API Services User Data Policy, 
              including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)] mb-3">5. Disclaimer</h2>
            <p className="text-base leading-relaxed">
              MyCalendarStats is not affiliated with Google. We make no warranties about the accuracy of the 
              statistics generated.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

