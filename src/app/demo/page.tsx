"use client";

import Link from "next/link";
import { useEffect } from "react";

/* eslint-disable @next/next/no-img-element */

// Public "Book a demo" page. The "Request a Demo" CTAs on the landing page
// point here. It embeds the Zenvyk (GoHighLevel) booking widget and loads its
// resize script so the calendar sizes itself to its content.

const BOOKING_SRC = "https://link.zenvyk.com/widget/booking/lYaOe1l451yhFwZZqbhh";
const BOOKING_IFRAME_ID = "lYaOe1l451yhFwZZqbhh_demo";

const WHAT_YOU_GET = [
  {
    title: "The dispatcher board, live",
    body: "See how the right work lands on the right tech at the right time — with a Match Score that explains every recommendation.",
  },
  {
    title: "Your numbers, your techs",
    body: "We walk your real fixed-ops flow: open ROs, technician scorecards, and the service scoreboard.",
  },
  {
    title: "Built for your stores",
    body: "One deployment across every rooftop, each store with its own board, credentials, and data.",
  },
];

export default function DemoPage() {
  // Load the booking widget's resize script once, client-side.
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://link.zenvyk.com/js/form_embed.js"]',
    );
    if (existing) return;
    const s = document.createElement("script");
    s.src = "https://link.zenvyk.com/js/form_embed.js";
    s.type = "text/javascript";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070d1c] text-white">
      {/* soft brand glow behind the content */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563eb]/20 blur-[120px]" />

      <div className="mx-auto max-w-[1200px] px-6">
        {/* ---------------- header ---------------------------------------- */}
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/dispatchlogo.png" alt="3D Dispatch" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:block"
            >
              ← Back to home
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/90 transition hover:text-white"
            >
              Log In
            </Link>
          </div>
        </header>

        {/* ---------------- two-column body -------------------------------- */}
        <div className="grid items-start gap-10 py-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:py-14">
          {/* left — the pitch */}
          <div className="lg:pt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
              Book a live demo
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              See 3D Dispatch
              <br />
              on <span className="text-[#3b82f6]">your</span> fixed ops.
            </h1>

            <div className="mt-5 h-1 w-16 rounded-full bg-[#3b82f6]" />

            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
              Pick a time that works for you. We&apos;ll walk you through the board
              with your own service lane in mind — no slides, just the product.
            </p>

            <ul className="mt-8 space-y-5">
              {WHAT_YOU_GET.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1 text-[#3b82f6]">
                    <CheckIcon />
                  </span>
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm leading-relaxed text-white/60">{item.body}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
              <ClockIcon />
              30 minutes · Screen share · No commitment
            </div>
          </div>

          {/* right — the booking widget */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-3">
            <div className="overflow-hidden rounded-xl bg-white">
              <iframe
                src={BOOKING_SRC}
                id={BOOKING_IFRAME_ID}
                title="Book a 3D Dispatch demo"
                allow="payment"
                scrolling="no"
                className="w-full"
                style={{ border: "none", minHeight: 760, width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* ---------------- footer ---------------------------------------- */}
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
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[#3b82f6]">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
