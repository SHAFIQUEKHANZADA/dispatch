"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

const RANK_LABEL: Record<string, string> = {
  efficiency: "Efficiency",
  total_hours: "Billed Hours",
  ro_count: "RO Volume",
  csi: "CSI",
  sales_ro: "Sales / RO",
};

interface Column {
  key: string;
  header: string;
  kind: "percent" | "number" | "hours" | "money";
  higher: boolean;
  goal: number | null;
}
interface Row {
  rank: number;
  technician_id?: string;
  advisor_id?: string;
  name: string;
  team?: string | null;
  level?: string | null;
  qualifies: boolean;
  data_issues?: string[];
  values: Record<string, number | null> & {
    sales_breakdown?: { yest: number | null; lmo: number | null; pmo: number | null };
  };
}
interface Board {
  view: string;
  available: boolean;
  message?: string;
  period_label?: string;
  rank_key?: string;
  columns: Column[];
  rows: Row[];
  goals?: Record<string, number | null>;
  store?: Record<string, number | null>;
  facility_utilization?: number;
}

function fmtVal(v: number | null | undefined, kind: string): string {
  if (v === null || v === undefined) return "—";
  if (kind === "percent") return `${v}%`;
  if (kind === "money") return `$${v}`;
  return `${v}`;
}

// green if meeting goal, red if below — the leaderboard's whole language
function cellTone(v: number | null, col: Column): "good" | "bad" | "neutral" {
  if (v === null || col.goal === null) return "neutral";
  const meets = col.higher ? v >= col.goal : v <= col.goal;
  return meets ? "good" : "bad";
}

export default function ScoreboardPage() {
  const [view, setView] = useState<"technicians" | "advisors">("technicians");
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto-rotate: the bar fills over ROTATE_SECONDS, then flips the board and
  // starts over — Technician -> Advisor -> Technician -> ... forever.
  const ROTATE_SECONDS = 12;
  useEffect(() => {
    if (paused) return;
    const step = 100 / (ROTATE_SECONDS * 20); // tick every 50ms
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          // defer the board switch out of the state updater
          window.setTimeout(
            () => setView((v) => (v === "technicians" ? "advisors" : "technicians")),
            0,
          );
          return 0;
        }
        return p + step;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [paused]);

  // reset the bar whenever the board changes (auto-rotate or a manual tap)
  useEffect(() => {
    setProgress(0);
  }, [view]);

  function toggleView() {
    setView((v) => (v === "technicians" ? "advisors" : "technicians"));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Board>(`/scoreboard/board?view=${view}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex h-screen flex-col">
      {/* header */}
      <header className="flex min-h-[57px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-2">
        <h1 className="text-lg font-semibold text-[var(--text)]">Service Scoreboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {paused ? "▶ Resume" : "❚❚ Pause"}
          </button>
          {/* ADVISORS / TECHNICIANS toggle badge */}
          <button
            onClick={toggleView}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0b1b3f] px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide text-white"
            title="Tap to switch board"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-blink" />
            {view === "technicians" ? "Technicians" : "Advisors"}
          </button>
          <div className="text-right text-xs leading-tight">
            <div className="font-semibold text-[var(--text)]">
              {data?.period_label ?? "Last 90 Days"}
            </div>
            <div className="text-[var(--text-faint)]">
              {paused ? "Paused · tap badge to switch" : "Auto-rotates · tap badge to switch"}
            </div>
          </div>
        </div>
      </header>

      {/* auto-rotate progress bar */}
      <div className="h-1 w-full bg-[var(--surface-3)]">
        <div
          className="h-full bg-gradient-to-r from-[#0b1b3f] to-[#3b82f6]"
          style={{ width: `${progress}%`, transition: paused ? "none" : "width 50ms linear" }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[var(--bg)] px-5 py-4">
        {loading && <div className="pt-8"><Spinner label="Loading scoreboard…" /></div>}
        {error && (
          <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {data && !loading && !data.available && (
          <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-14 text-center">
            <div className="text-base font-semibold text-[var(--text)]">No data yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">{data.message}</p>
          </div>
        )}

        {data && !loading && data.available && <Leaderboard data={data} />}
      </div>
    </div>
  );
}

function Leaderboard({ data }: { data: Board }) {
  const isAdvisor = data.view === "advisors";
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className={cn("text-xl font-extrabold tracking-tight", isAdvisor ? "text-[var(--brand)]" : "text-[var(--good)]")}>
          {isAdvisor ? "ADVISOR PERFORMANCE" : "TECHNICIAN PERFORMANCE"}
        </h2>
        <span className="text-xs text-[var(--text-faint)]">
          Ranked by {isAdvisor ? "CSI" : RANK_LABEL[data.rank_key ?? "efficiency"] ?? "Efficiency"} · {data.period_label}
        </span>
        <span className="ml-auto text-xs text-[var(--text-faint)]">
          {data.rows.length} {isAdvisor ? "advisors" : "technicians"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] card-elev">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
              <th className="px-4 py-3 font-medium">{isAdvisor ? "Advisor" : "Technician"}</th>
              {data.columns.map((c) => (
                <th key={c.key} className="px-3 py-3 text-center font-medium">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <ScoreRow key={r.technician_id ?? r.advisor_id} row={r} columns={data.columns} />
            ))}

            {/* GOAL row */}
            <tr className="border-t-2 border-[var(--border)]">
              <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Goal</td>
              {data.columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 text-center">
                  {c.goal !== null && (
                    <span className="inline-block rounded-md bg-[#0b1b3f] px-2.5 py-1 text-xs font-bold text-white">
                      {fmtVal(c.goal, c.kind)}
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* STORE AVG / TOTAL row */}
            <tr className="bg-[var(--surface-2)]">
              <td className="px-4 py-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Store Avg / Total
              </td>
              {data.columns.map((c) => {
                const v = data.store?.[c.key] ?? null;
                const tone = cellTone(v, c);
                return (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-3 text-center font-mono text-base font-bold",
                      tone === "good" ? "text-[var(--good)]" : tone === "bad" ? "text-[var(--danger)]" : "text-[var(--text)]",
                    )}
                  >
                    {fmtVal(v, c.kind)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* facility utilization (advisor board) */}
      {isAdvisor && data.facility_utilization != null && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 card-elev">
          <span className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Facility Utilization
          </span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full bg-[var(--good)]" style={{ width: `${data.facility_utilization}%` }} />
          </div>
          <span className="font-mono text-lg font-bold text-[var(--good)]">{data.facility_utilization}%</span>
          <span className="max-w-[220px] text-[10px] text-[var(--text-faint)]">
            Placeholder — confirm exact formula (sold/flagged hrs ÷ available capacity).
          </span>
        </div>
      )}
    </div>
  );
}

function ScoreRow({ row, columns }: { row: Row; columns: Column[] }) {
  const rankStyle =
    row.rank === 1
      ? "bg-amber-400 text-white"
      : row.rank === 2
        ? "bg-slate-300 text-slate-700"
        : row.rank === 3
          ? "bg-orange-400 text-white"
          : "bg-[var(--surface-3)] text-[var(--text-muted)]";
  return (
    <tr
      className={cn(
        "border-t border-[var(--border)]",
        row.rank === 1 && "ring-2 ring-inset ring-amber-300",
        !row.qualifies && "opacity-60",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", rankStyle)}>
            {row.rank}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: hue(row.name) }}>
            {initials(row.name)}
          </span>
          <div>
            <div className="font-semibold text-[var(--text)]">{row.name}</div>
            {!row.qualifies && (
              <div className="text-[10px] font-medium uppercase text-[var(--warn)]" title={(row.data_issues ?? []).join(" · ")}>
                Building sample
              </div>
            )}
          </div>
        </div>
      </td>
      {columns.map((c) => {
        const v = (row.values[c.key] as number | null) ?? null;
        const tone = cellTone(v, c);
        const sb = c.key === "sales_ro" ? row.values.sales_breakdown : undefined;
        return (
          <td key={c.key} className="px-3 py-3 text-center">
            <span
              className={cn(
                "inline-block min-w-[52px] rounded-md px-2.5 py-1.5 text-sm font-semibold",
                tone === "good"
                  ? "bg-emerald-50 text-emerald-700"
                  : tone === "bad"
                    ? "bg-red-50 text-red-600"
                    : "bg-[var(--surface-2)] text-[var(--text-muted)]",
              )}
            >
              {fmtVal(v, c.kind)}
            </span>
            {sb && (
              <div className="mt-1 flex justify-center gap-2 text-[9px] text-[var(--text-faint)]">
                <span>YEST ${sb.yest}</span>
                <span>L.MO ${sb.lmo}</span>
                <span>P.MO ${sb.pmo}</span>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 45%)`;
}
