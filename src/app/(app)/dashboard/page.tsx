"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

/* ---------------- types (match /api/timeline) ---------------- */
interface Block {
  kind: string;
  start_min: number;
  end_min: number;
  label: string;
  ro_number: string | null;
  hours: number | null;
}
interface TechRow {
  id: string;
  name: string;
  initials: string;
  level: string;
  team: string;
  shift_start_min: number | null;
  shift_end_min: number | null;
  on_shift: boolean;
  status_chip: { kind: string; text: string } | null;
  blocks: Block[];
  totals: { base: number; up: number; down: number };
}
interface Group {
  team: string;
  label: string;
  count: number;
  techs: TechRow[];
}
interface Timeline {
  date: string;
  date_label: string;
  view_start_min: number;
  view_end_min: number;
  now_min: number | null;
  counters: {
    idle: number;
    unplanned: number;
    back_soon: number;
    assigned: number;
    available: number;
    unassigned: number;
  };
  groups: Group[];
  legend: { kind: string; label: string }[];
}

/* ---------------- block styling ---------------- */
const BLOCK_STYLE: Record<string, string> = {
  completed: "bg-[#3b82f6] text-white",
  in_progress: "bg-[#16a34a] text-white",
  queued: "bg-[#86efac] text-[#14532d]",
  idle_needs: "bg-[repeating-linear-gradient(45deg,#fecaca,#fecaca_6px,#fee2e2_6px,#fee2e2_12px)] text-[#991b1b] ring-1 ring-inset ring-[#ef4444]",
  idle_lost: "bg-[repeating-linear-gradient(45deg,#fce7f3,#fce7f3_5px,#fbcfe8_5px,#fbcfe8_10px)] text-[#9d174d] ring-1 ring-inset ring-dashed ring-[#ec4899]",
  lunch: "bg-[var(--surface-3)] text-[var(--text-muted)]",
  unallocated: "bg-[#f59e0b]/85 text-white",
  off_shift: "bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_6px,#f3f4f6_6px,#f3f4f6_12px)] text-[var(--text-faint)]",
};
const LEGEND_SWATCH: Record<string, string> = {
  completed: "bg-[#3b82f6]",
  in_progress: "bg-[#16a34a]",
  queued: "bg-[#86efac]",
  idle_needs: "bg-[repeating-linear-gradient(45deg,#fecaca,#fecaca_4px,#fee2e2_4px,#fee2e2_8px)] ring-1 ring-inset ring-[#ef4444]",
  idle_lost: "bg-[repeating-linear-gradient(45deg,#fce7f3,#fce7f3_4px,#fbcfe8_4px,#fbcfe8_8px)]",
  lunch: "bg-[var(--surface-3)]",
  unallocated: "bg-[#f59e0b]",
  off_shift: "bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_4px,#f3f4f6_4px,#f3f4f6_8px)]",
};
const CHIP_STYLE: Record<string, string> = {
  no_plan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lunch: "bg-amber-50 text-amber-700 border-amber-200",
  idle: "bg-red-50 text-red-700 border-red-200",
  back_soon: "bg-amber-50 text-amber-700 border-amber-200",
};

function fmtHour(min: number): string {
  const h = Math.floor(min / 60);
  const ampm = h < 12 ? "a" : "p";
  const h12 = h % 12 || 12;
  return `${h12}:00${ampm}`;
}

export default function DashboardTimelinePage() {
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOff, setShowOff] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (showOff) params.set("include_off", "true");
      setData(await api.get<Timeline>(`/timeline?${params.toString()}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [showOff]);

  useEffect(() => {
    load();
  }, [load]);

  const span = data ? data.view_end_min - data.view_start_min : 1;
  const pctOf = (min: number) => ((min - (data?.view_start_min ?? 0)) / span) * 100;

  // hour gridlines
  const hours: number[] = [];
  if (data) {
    for (let m = Math.ceil(data.view_start_min / 60) * 60; m <= data.view_end_min; m += 60) hours.push(m);
  }

  return (
    <div className="flex h-screen flex-col">
      {/* ---------- top bar ---------- */}
      <header className="flex min-h-[57px] items-center border-b border-[var(--border)] bg-[var(--surface)] px-5 py-2">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[var(--text)]">Dispatcher Dashboard</h1>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-sm">
              <button onClick={() => setDayOffset((d) => d - 1)} className="px-2 py-1.5 text-[var(--text-faint)] hover:text-[var(--text)]">‹</button>
              <span className="px-2 py-1.5 font-medium text-[var(--text)]">{data?.date_label ?? "—"}</span>
              <button onClick={() => setDayOffset((d) => d + 1)} className="px-2 py-1.5 text-[var(--text-faint)] hover:text-[var(--text)]">›</button>
            </div>
            <button
              onClick={() => { setDayOffset(0); load(); }}
              className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"
            >
              Today
            </button>
            <select className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none">
              <option>Full Day (7a–7p)</option>
              <option>Morning (7a–12p)</option>
              <option>Afternoon (12p–7p)</option>
            </select>
          </div>

          {/* status pills + counters */}
          <div className="flex flex-wrap items-center gap-2">
            {data && (
              <>
                <Pill tone="red" text={`${data.counters.idle} idle`} on={data.counters.idle > 0} />
                <Pill tone="green" text={`${data.counters.unplanned} unplanned`} on={data.counters.unplanned > 0} />
                <Pill tone="amber" text={`${data.counters.back_soon} back soon`} on={data.counters.back_soon > 0} />
                <span className="ml-2 text-sm text-[var(--text-muted)]">
                  Assigned: <b className="text-[var(--text)]">{data.counters.assigned}</b>
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  Available: <b className="text-[var(--good)]">{data.counters.available}</b>
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  Unassigned: <b className="text-[var(--warn)]">{data.counters.unassigned}</b>
                </span>
              </>
            )}
            <a href="/dispatch" className="ml-1 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">
              + Upcoming ROs
            </a>
          </div>
        </div>
      </header>

      {/* ---------- board ---------- */}
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        {loading && <div className="pt-10"><Spinner label="Loading dispatcher board…" /></div>}
        {error && (
          <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="min-w-[900px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pb-3 card-elev">
            {/* hour header */}
            <div className="flex items-stretch rounded-t-lg bg-[var(--surface-2)] py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              <div className="w-52 shrink-0 pl-2">Technician</div>
              <div className="relative flex-1">
                {hours.map((m) => (
                  <span key={m} className="absolute -translate-x-1/2 font-normal normal-case" style={{ left: `${pctOf(m)}%` }}>
                    {fmtHour(m)}
                  </span>
                ))}
                {/* now-line pill */}
                {data.now_min != null && pctOf(data.now_min) >= 0 && pctOf(data.now_min) <= 100 && (
                  <span
                    className="absolute -top-0.5 z-20 -translate-x-1/2 rounded bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ left: `${pctOf(data.now_min)}%` }}
                  >
                    {fmtClock(data.now_min)}
                  </span>
                )}
              </div>
              <div className="w-24 shrink-0 pr-2 text-right">Day totals</div>
            </div>

            {/* rows, with ONE continuous now-line overlaid across all of them */}
            <div className="relative">
              {data.groups.map((g) => (
                <div key={g.team}>
                  <div className="mt-3 flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <span className={cn("h-2 w-2 rounded-full", g.team === "Lube" ? "bg-[var(--warn)]" : "bg-[var(--brand)]")} />
                    {g.label}
                    <span className="rounded-full bg-[var(--surface-3)] px-1.5 text-[10px]">{g.count}</span>
                    <span className="ml-auto text-[10px] font-normal normal-case text-[var(--text-faint)]">sorted by attention</span>
                  </div>

                  {g.techs.map((t) => (
                    <TechTrack key={t.id} tech={t} pctOf={pctOf} hours={hours} />
                  ))}
                </div>
              ))}

              {/* continuous now-line spanning every row (track region is between the
                  208px tech column and the 96px totals column) */}
              {data.now_min != null && pctOf(data.now_min) >= 0 && pctOf(data.now_min) <= 100 && (
                <span
                  className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-[var(--danger)]"
                  style={{
                    left: `calc(13rem + (100% - 13rem - 6rem) * ${pctOf(data.now_min) / 100})`,
                  }}
                />
              )}
            </div>

            {/* legend */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
              {data.legend.map((l) => (
                <span key={l.kind} className="inline-flex items-center gap-1.5">
                  <span className={cn("inline-block h-3 w-3 rounded-sm", LEGEND_SWATCH[l.kind])} />
                  {l.label}
                </span>
              ))}
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />
                Show techs off today
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TechTrack({
  tech,
  pctOf,
  hours,
}: {
  tech: TechRow;
  pctOf: (m: number) => number;
  hours: number[];
}) {
  const chip = tech.status_chip?.kind;
  const rowTint =
    chip === "idle"
      ? "bg-red-50/60 border-l-2 border-l-[var(--danger)]"
      : chip === "lunch"
        ? "bg-amber-50/50 border-l-2 border-l-[var(--warn)]"
        : chip === "no_plan"
          ? "bg-emerald-50/40 border-l-2 border-l-[var(--good)]"
          : "border-l-2 border-l-transparent";
  return (
    <div className={cn("flex items-center border-b border-[var(--border)]/60 py-2", rowTint)}>
      {/* tech identity */}
      <div className="flex w-52 shrink-0 items-center gap-2 pl-1">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: hue(tech.name) }}>
          {tech.initials}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-[var(--text)]">{tech.name}</span>
            {tech.status_chip && (
              <span className={cn("rounded border px-1 py-0.5 text-[9px] font-bold uppercase", CHIP_STYLE[tech.status_chip.kind] ?? CHIP_STYLE.idle)}>
                {tech.status_chip.text}
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-[var(--text-faint)]">
            {tech.level}
            {tech.shift_start_min != null && tech.shift_end_min != null && (
              <> · {fmtClock(tech.shift_start_min)}–{fmtClock(tech.shift_end_min)}</>
            )}
          </div>
        </div>
      </div>

      {/* track */}
      <div className="relative h-8 flex-1">
        {/* hour gridlines */}
        {hours.map((m) => (
          <span key={m} className="absolute top-0 h-full w-px bg-[var(--border)]/50" style={{ left: `${pctOf(m)}%` }} />
        ))}
        {/* blocks */}
        {tech.blocks.map((b, i) => {
          const left = pctOf(b.start_min);
          const width = pctOf(b.end_min) - left;
          if (width <= 0) return null;
          return (
            <div
              key={i}
              title={`${b.label || b.kind} (${fmtClock(b.start_min)}–${fmtClock(b.end_min)})`}
              className={cn(
                "absolute top-1 flex h-6 items-center justify-center overflow-hidden rounded px-1 text-[11px] font-medium",
                BLOCK_STYLE[b.kind] ?? "bg-[var(--surface-3)]",
                b.kind === "in_progress" && "animate-live",
              )}
              style={{ left: `${left}%`, width: `calc(${width}% - 2px)` }}
            >
              <span className="truncate">{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* totals */}
      <div className="w-24 shrink-0 pr-2 text-right text-[11px] leading-tight">
        <div>
          <span className="text-[var(--text-faint)]">Base </span>
          <span className="font-semibold text-[var(--text)]">{tech.totals.base}h</span>
        </div>
        {tech.totals.up > 0 && (
          <div className="text-[var(--good)]">
            <span className="text-[var(--text-faint)]">Up </span>+{tech.totals.up}
          </div>
        )}
        {tech.totals.down > 0 && (
          <div className="text-[var(--danger)]">
            <span className="text-[var(--text-faint)]">Down </span>{fmtDur(tech.totals.down)}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ tone, text, on }: { tone: "red" | "green" | "amber"; text: string; on: boolean }) {
  const tones: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", on ? tones[tone] : "border-[var(--border)] text-[var(--text-faint)]")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", on && "animate-blink", tone === "red" ? "bg-red-500" : tone === "green" ? "bg-emerald-500" : "bg-amber-500")} />
      {text}
    </span>
  );
}

function fmtClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "a" : "p";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 45%)`;
}

// hours -> "30m" under an hour, else "1.5h" (matches the mockup's day totals)
function fmtDur(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours}h`;
}
