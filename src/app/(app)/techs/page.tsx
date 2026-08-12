"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, Spinner, cn } from "@/components/ui";

interface Reason { factor: string; text: string; points: number }
interface RecRO {
  ro_id: string;
  ro_number: string;
  vehicle: string;
  concern: string | null;
  concern_short: string | null;
  priority_rank: number | null;
  score: number;
  reasons: Reason[];
  warnings: string[];
  technician_id: string;
}
interface TechRec {
  id: string;
  name: string;
  initials: string;
  level: string;
  status: { kind: string; text: string };
  cert_badge: string | null;
  insight: string | null;
  ros: RecRO[];
}
interface Data {
  counters: { available_freeing: number; unassigned_ros: number };
  techs: TechRec[];
}

const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-500 text-white",
  freeing: "bg-amber-400 text-[#3a2c0a]",
  idle: "bg-[var(--danger)] text-white",
};
const BAR_COLOR = ["#16a34a", "#2563eb", "#f59e0b"];

export default function AvailableTechsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Data>("/technicians/recommendations"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(ro_id: string, technician_id: string) {
    setAssigning(ro_id + technician_id);
    try {
      await api.post("/dispatch/assign", { ro_id, technician_id });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Available Techs</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Tech is free — ROs are ranked by Match for that tech, not just by priority. Hover an RO to see why.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-5 text-sm">
            <span className="text-[var(--text-muted)]">
              Available / Freeing: <b className="text-[var(--good)]">{data.counters.available_freeing}</b>
            </span>
            <span className="text-[var(--text-muted)]">
              Unassigned ROs: <b className="text-[var(--warn)]">{data.counters.unassigned_ros}</b>
            </span>
          </div>
        )}
      </div>

      {loading && <div className="pt-8"><Spinner label="Loading technicians…" /></div>}
      {error && (
        <div className="mt-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {data?.techs.map((t) => (
          <div key={t.id} className="card-elev overflow-visible rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            {/* tech header */}
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: hue(t.name) }}>
                {t.initials}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-[var(--text)]">{t.name}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_STYLE[t.status.kind] ?? "bg-[var(--surface-3)]")}>
                    {t.status.text}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">{t.level}</div>
              </div>
              {t.cert_badge && (
                <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">
                  {t.cert_badge}
                </span>
              )}
            </div>

            {/* insight banner */}
            {t.insight && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--brand)]/8 px-3 py-2 text-sm text-[var(--text-muted)]">
                <span aria-hidden>💡</span>
                <span>{t.insight}</span>
              </div>
            )}

            {/* recommended ROs */}
            <div className="mt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                Recommended ROs for {t.name.split(" ")[0]} {t.name.split(" ")[1]?.[0] ?? ""}.
              </div>
              {t.ros.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-3 text-center text-sm text-[var(--text-muted)]">
                  No eligible ROs for this tech right now.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {t.ros.map((ro, i) => (
                    <RecRow
                      key={ro.ro_id}
                      ro={ro}
                      rank={i + 1}
                      busy={assigning === ro.ro_id + t.id}
                      onAssign={() => assign(ro.ro_id, t.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecRow({ ro, rank, busy, onAssign }: { ro: RecRO; rank: number; busy: boolean; onAssign: () => void }) {
  const color = BAR_COLOR[Math.min(rank - 1, 2)];
  return (
    <div className={cn("group relative flex items-center gap-3 rounded-lg border px-3 py-2", rank === 1 ? "border-[var(--good)]/40 bg-emerald-50/40" : "border-transparent hover:bg-[var(--surface-2)]")}>
      <span className="w-4 text-center text-sm font-bold text-[var(--text-muted)]">{rank}</span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] text-[var(--text)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      </span>
      <div className="w-48 min-w-0">
        <div className="truncate text-base font-bold text-[var(--brand)]">RO #{ro.ro_number}</div>
        <div className="truncate text-xs font-medium text-[var(--text-muted)]">
          {ro.vehicle} · {ro.concern_short}
        </div>
      </div>
      {ro.priority_rank != null && (
        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
          Priority #{ro.priority_rank}
        </span>
      )}
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full" style={{ width: `${ro.score}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-mono text-lg font-bold tabular-nums" style={{ color }}>
        {ro.score}
      </span>
      <Button size="sm" variant="primary" disabled={busy} onClick={onAssign}>
        {busy ? "…" : "Assign"}
      </Button>

      {/* hover WHY tooltip */}
      <div className="pointer-events-none absolute bottom-full left-10 z-40 mb-2 hidden w-[340px] group-hover:block">
        <div className="relative rounded-2xl bg-[#111c2e] p-4 shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center gap-4">
            <div className="shrink-0 border-r border-white/10 pr-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#60a5fa]">Why?</div>
              <div className="my-0.5 font-mono text-3xl font-extrabold leading-none text-[#4ade80]">{ro.score}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Match</div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-[12px] leading-snug">
              {ro.reasons.slice(0, 6).map((r, k) => (
                <li key={k} className="flex gap-2"><span className="mt-px text-emerald-400">✓</span><span className="text-white/90">{r.text}</span></li>
              ))}
              {ro.warnings.map((w, k) => (
                <li key={`w${k}`} className="flex gap-2"><span className="mt-px font-bold text-amber-400">!</span><span className="text-amber-200">{w}</span></li>
              ))}
            </ul>
          </div>
          <span className="absolute left-6 top-full border-[9px] border-transparent border-t-[#111c2e]" />
        </div>
      </div>
    </div>
  );
}

function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 45%)`;
}
