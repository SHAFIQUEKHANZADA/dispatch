"use client";

// A clean placeholder for screens the owner hasn't designed yet, so the sidebar
// is complete and nothing 404s. Not "mock data" — it plainly says the screen is
// pending, rather than faking content.
export function StubPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">{title}</h1>
      <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--text-faint)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="text-base font-semibold text-[var(--text)]">Coming soon</div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{blurb}</p>
        </div>
      </div>
    </div>
  );
}
