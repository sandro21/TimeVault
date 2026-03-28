"use client";

export function ChatPageClient() {
  return (
    <main className="page-container page-container--no-time-filter">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-section-header text-[color:var(--text-primary)]">
          AI Chat
        </h1>
        <div className="card-soft flex min-h-[320px] flex-col items-center justify-center gap-4 px-8 py-12 text-center">
          <p className="text-body-24 text-[color:var(--text-secondary)]">
            Ask questions about your schedule and stats. This space is ready for
            your AI assistant.
          </p>
          <p className="text-[16px] text-[color:var(--text-secondary)]/80">
            Coming soon.
          </p>
        </div>
      </div>
    </main>
  );
}
