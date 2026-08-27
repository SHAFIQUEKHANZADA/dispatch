"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

/* The technician's own screen — open it on a phone/tablet in the bay. When the
   dispatcher assigns you in 3D Dispatch, the job appears here within seconds
   (with a chime), so an assignment reaches the tech with no DMS write-back. */

interface Job {
  assignment_id: string;
  ro_id: string;
  ro_number: string;
  vehicle: string;
  concern: string;
  concern_short: string;
  est_hours: number;
  promise_at: string | null;
  assigned_at: string | null;
  state: "assigned" | "working";
}
interface Roster { id: string; name: string; active: boolean }

const LS_KEY = "myWorkTechId";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch { /* audio not available — visual banner still shows */ }
}

function fmtPromise(s: string | null) {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function MyWorkPage() {
  const [roster, setRoster] = useState<Roster[]>([]);
  const [techId, setTechId] = useState<string | null>(null);
  const [techName, setTechName] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  // load roster + restore saved tech
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ technicians: Roster[] }>("/technicians");
        setRoster(r.technicians.filter((t) => t.active));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : String(e));
      }
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) setTechId(saved);
      } catch { /* no storage */ }
    })();
  }, []);

  const poll = useCallback(async (id: string, announce: boolean) => {
    try {
      const d = await api.get<{ technician_name: string; jobs: Job[] }>(`/technicians/${id}/my-work`);
      setTechName(d.technician_name);
      const fresh = d.jobs.filter((j) => !seen.current.has(j.assignment_id));
      d.jobs.forEach((j) => seen.current.add(j.assignment_id));
      if (announce && fresh.length > 0) { beep(); setFlash(true); setTimeout(() => setFlash(false), 4000); }
      setJobs(d.jobs);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }, []);

  // poll every 12s while a tech is selected
  useEffect(() => {
    if (!techId) return;
    seen.current = new Set();
    poll(techId, false);           // first load: don't chime
    const t = setInterval(() => poll(techId, true), 12000);
    return () => clearInterval(t);
  }, [techId, poll]);

  function pick(id: string) {
    try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
    setTechId(id);
  }
  function switchTech() {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setTechId(null); setJobs([]); setTechName("");
  }
  async function act(a: Job, action: "start" | "done") {
    try {
      await api.post(`/technicians/assignment/${a.assignment_id}/${action}`, {});
      if (techId) poll(techId, false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  // ---- tech picker ----
  if (!techId) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-[var(--bg)] px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold text-[var(--text)]">My Work</h1>
        <p className="mb-6 text-sm text-[var(--text-muted)]">Tap your name to see your jobs.</p>
        {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          {roster.map((t) => (
            <button key={t.id} onClick={() => pick(t.id)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-left text-sm font-semibold text-[var(--text)] shadow-sm active:scale-[0.98]">
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- worklist ----
  return (
    <div className={`min-h-screen ${flash ? "bg-emerald-50" : "bg-[var(--bg)]"} transition-colors`}>
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--text-faint)]">My Work</div>
            <div className="text-xl font-extrabold text-[var(--text)]">{techName}</div>
          </div>
          <button onClick={switchTech} className="text-sm font-semibold text-[var(--brand)]">Not you?</button>
        </div>

        {flash && (
          <div className="mb-3 animate-pulse rounded-xl bg-emerald-600 px-4 py-3 text-center text-base font-bold text-white">
            🔔 New job assigned to you!
          </div>
        )}
        {error && <div className="mb-3 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}

        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-16 text-center text-[var(--text-muted)]">
            No jobs assigned to you right now.<br /><span className="text-sm text-[var(--text-faint)]">This updates automatically.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.assignment_id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-extrabold text-[var(--text)]">RO #{j.ro_number}</div>
                    <div className="text-sm text-[var(--text-muted)]">{j.vehicle || "Vehicle"}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${j.state === "working" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"}`}>
                    {j.state === "working" ? "Working" : "New"}
                  </span>
                </div>
                <div className="mt-2 text-[15px] font-medium text-[var(--text)]">{j.concern_short}</div>
                <div className="mt-1 flex gap-4 text-xs text-[var(--text-muted)]">
                  <span>Est {j.est_hours} hr</span>
                  {fmtPromise(j.promise_at) && <span>Promise {fmtPromise(j.promise_at)}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {j.state === "assigned" ? (
                    <button onClick={() => act(j, "start")} className="flex-1 rounded-xl bg-[var(--brand)] py-3 text-sm font-bold text-white active:scale-[0.98]">Start job</button>
                  ) : (
                    <button onClick={() => act(j, "done")} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:scale-[0.98]">Mark done</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 text-center text-[11px] text-[var(--text-faint)]">Updates every few seconds · keep this open in the bay</p>
      </div>
    </div>
  );
}
