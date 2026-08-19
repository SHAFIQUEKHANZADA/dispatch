"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

interface LoanerAppt {
  appointment_uuid: string;
  start_time: string | null;
  customer_name: string;
  vehicle: string;
  transport: string | null;
  service_requested: string | null;
  is_today: boolean;
  position: number | null;
  status: "demand" | "within_fleet" | "over_fleet";
}
interface Board {
  available: boolean;
  reason?: string;
  tsd_connected: boolean;
  fleet_size: number;
  fleet_is_default: boolean;
  stats: { loaner_today: number; loaner_window: number; fleet_size: number; overbooked_today: number };
  appointments: LoanerAppt[];
}

function fmtT(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtShortD(s: string | null) {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function LoanersPage() {
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Board>("/loaners/board?days=7"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const appts = data?.appointments ?? [];
  const short = data?.stats.overbooked_today ?? 0;

  return (
    <div className="px-5 py-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[var(--text)]">Loaners</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Who&apos;s coming in expecting a loaner — so no one arrives to find none available.
        </p>
      </div>

      {loading && <div className="pt-8"><Spinner label="Reading loaner appointments from myKaarma…" /></div>}
      {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
      {data && !data.available && (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          Loaners aren&apos;t available — {data.reason ?? "myKaarma appointment scope not granted."}
        </div>
      )}

      {data?.available && (
        <>
          {/* stat cards */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Stat n={data.stats.loaner_today} label="Loaner appts today" color="text-[var(--text)]" />
            <Stat n={short} label="Short today" color={short > 0 ? "text-rose-600" : "text-emerald-600"} />
            <Stat n={data.stats.fleet_size} label={data.fleet_is_default ? "Fleet size (default)" : "Fleet size"} color="text-[var(--text)]" />
            <Stat n={data.stats.loaner_window} label="Loaner appts · 7 days" color="text-[var(--text)]" />
          </div>

          {/* shortfall / capacity banner */}
          {short > 0 ? (
            <div className="mb-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <b>{short} customer{short > 1 ? "s" : ""} today will arrive without a loaner</b> — {data.stats.loaner_today} loaner
              appointments vs a {data.stats.fleet_size}-car fleet. Trigger the Enterprise backup for {short} now, before they show up.
            </div>
          ) : (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Today&apos;s {data.stats.loaner_today} loaner appointments are within the {data.stats.fleet_size}-car fleet.
            </div>
          )}

          {/* TSD pending note */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 px-4 py-2.5 text-sm text-[var(--text-muted)]">
            <span>
              This shows loaner <b className="text-[var(--text)]">demand</b> live from myKaarma. Live availability (which loaners are
              physically out) turns on once the <b className="text-[var(--text)]">TSD</b> checkout feed is connected.
            </span>
            <a href="/store-settings" className="shrink-0 font-semibold text-[var(--brand)] hover:underline">Set fleet size →</a>
          </div>

          {/* table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  <Th className="w-24">Time</Th>
                  <Th className="w-52">Customer / Vehicle</Th>
                  <Th>Service</Th>
                  <Th className="w-28">Transport</Th>
                  <Th className="w-32 text-center">Coverage</Th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr key={a.appointment_uuid} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[var(--text)]">{fmtT(a.start_time)}</div>
                      <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">{fmtShortD(a.start_time)}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[var(--text)]">{a.customer_name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{a.vehicle}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-[var(--text)]">{a.service_requested || "—"}</td>
                    <td className="px-3 py-3 align-top">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{a.transport || "Loaner"}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      <Coverage a={a} />
                    </td>
                  </tr>
                ))}
                {appts.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">No loaner appointments in myKaarma for this window.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            Time · customer · vehicle · transport come live from myKaarma. &quot;Short today&quot; is a guaranteed shortfall
            (more loaner appointments than the fleet can cover). Exact live availability needs the TSD checkout feed.
          </p>
        </>
      )}
    </div>
  );
}

function Coverage({ a }: { a: LoanerAppt }) {
  if (!a.is_today) return <span className="text-xs text-[var(--text-faint)]">upcoming</span>;
  if (a.status === "over_fleet") {
    return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">over fleet</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">within fleet</span>;
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="w-[150px] shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className={cn("text-2xl font-extrabold tabular-nums", color)}>{n}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2.5 font-bold", className)}>{children}</th>;
}
