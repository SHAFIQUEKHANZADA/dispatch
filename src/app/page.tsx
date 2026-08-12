import Link from "next/link";

/* eslint-disable @next/next/no-img-element */

// Marketing landing page (the public "/" route). The operational app lives
// behind it under the (app) route group. "Log In" and the demo CTAs are the
// doors into the product.

const NAV = ["Product", "Features", "Resources", "Pricing", "About Us"];

const TRUST = [
  {
    icon: <IconStopwatch />,
    title: "More Efficiency",
    body: "Increase technician productivity",
  },
  {
    icon: <IconCheck />,
    title: "Fewer Comebacks",
    body: "Better quality, first time, every time",
  },
  {
    icon: <IconSmile />,
    title: "Happier Customers",
    body: "On-time service and clear communication",
  },
  {
    icon: <IconChart />,
    title: "More Profit",
    body: "Capture every opportunity",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070d1c] text-white">
      {/* ================================================================= */}
      {/* HERO — full-bleed background image with the content overlaid       */}
      {/* ================================================================= */}
      <section className="relative isolate">
        {/* the dashboard art fills the whole hero background */}
        <img
          src="/hero.png"
          alt="3D Dispatch dispatcher dashboard and mobile Available ROs view"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-right"
          draggable={false}
        />
        {/* subtle left-side scrim — dark only behind the headline, clears well
            before the dashboard so the art stays bright */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#070d1c] from-0% via-[#070d1c]/60 via-22% to-transparent to-48%" />
        {/* soft fade into the sections below */}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#070d1c]" />

        <div className="mx-auto max-w-[1400px] px-6">
          {/* ---------------- header --------------------------------------- */}
          <header className="flex items-center justify-between py-6">
            <img src="/dispatchlogo.png" alt="3D Dispatch" className="h-10 w-auto sm:h-12" />

            <nav className="hidden items-center gap-8 lg:flex">
              {NAV.map((item) => (
                <a
                  key={item}
                  href="#features"
                  className="text-sm font-medium text-white/80 transition hover:text-white"
                >
                  {item}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden text-sm font-medium text-white/90 transition hover:text-white sm:block"
              >
                Log In
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563eb]/20 transition hover:bg-[#1d4ed8]"
              >
                Request Demo <span aria-hidden>→</span>
              </Link>
            </div>
          </header>

          {/* ---------------- hero copy ------------------------------------ */}
          <div className="max-w-xl py-16 sm:py-24 lg:py-32">
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Smarter Dispatch.
              <br />
              Happier Customers.
              <br />
              <span className="text-[#3b82f6]">Stronger Results.</span>
            </h1>

            <div className="mt-6 h-1 w-16 rounded-full bg-[#3b82f6]" />

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              3D Dispatch™ is the intelligent operating system for fixed
              operations that puts the right work, on the right tech, at the
              right time.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563eb]/25 transition hover:bg-[#1d4ed8]"
              >
                Request a Demo <span aria-hidden>→</span>
              </Link>
              <Link
                href="/dispatch"
                className="inline-flex items-center gap-2.5 rounded-lg border border-white/20 bg-black/20 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/5"
              >
                <PlayIcon />
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-[1400px] px-6">
        {/* ---------------------------------------------------------------- */}
        {/* trust strip                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-white">
            Dealers trust 3D Dispatch to drive results
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="flex flex-col gap-3">
                <div className="text-[#3b82f6]">{t.icon}</div>
                <div className="font-semibold text-white">{t.title}</div>
                <div className="text-sm leading-relaxed text-white/60">{t.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* bottom band                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="demo"
          className="my-10 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0c1a38] to-[#0a1730] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8"
        >
          <div className="text-[#3b82f6]">
            <IconTeam />
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold tracking-wide text-white">
              BUILT FOR DEALERSHIPS. BACKED BY RESULTS.
            </div>
            <div className="mt-1 text-white/60">
              Trusted by forward-thinking dealerships focused on performance,
              retention, and results.
            </div>
          </div>
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Explore the Board <span aria-hidden>→</span>
          </Link>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} Zenvyk · 3D Dispatch™</span>
          <div className="flex items-center gap-5">
            <a
              href="https://www.mcgrathhonda.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              McGrath Honda ↗
            </a>
            <span>Data Driven Decisions</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* inline icons (self-contained, no external deps)                             */
/* --------------------------------------------------------------------------- */

function PlayIcon() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full border border-white/40">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <path d="M2 1l6 4-6 4z" />
      </svg>
    </span>
  );
}

function IconStopwatch() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M9 2h6M12 5v-3" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSmile() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14c.9 1.2 2.1 2 3.5 2s2.6-.8 3.5-2" strokeLinecap="round" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 20V10M9 20V5M14 20v-7M19 20V8" strokeLinecap="round" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15.5 19c0-2.2 1.5-3.6 3.5-3.6" strokeLinecap="round" />
    </svg>
  );
}
