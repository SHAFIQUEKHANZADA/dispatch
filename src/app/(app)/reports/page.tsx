"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

/* ---------------- types (match /reports) ---------------- */
interface Teacher { tech: string; initials: string; job_type: string; efficiency: number }
interface TopRow {
  rank: number; tech: string; initials: string; job_type: string; vehicle: string;
  ro_number: string; guide_h: number; actual_h: number; efficiency: number;
}
interface TopTech { available: boolean; threshold: number; count: number; insight: string | null; teachers: Teacher[]; rows: TopRow[] }
interface MentorRow {
  job_type: string;
  top_hand: { tech: string; initials: string; efficiency: number };
  grow: { tech: string; initials: string; efficiency: number; comeback: boolean };
  gap: number; pairing: string;
}
interface Mentor { available: boolean; insight: string | null; rows: MentorRow[] }
interface Point { tech: string; initials: string; efficiency: number; comebacks: number; jobs: number }
interface SpeedQual { available: boolean; insight: string | null; points: Point[]; elite: number; rushing: number }
interface Grp { label: string; n: number; efficiency: number | null; comeback_rate: number | null }
interface MatchPayoff { available: boolean; insight: string | null; high: Grp; low: Grp; note: string }
interface OverrideRow {
  job_type: string; vehicle: string; ro_number: string; tech: string; initials: string;
  match_score: number | null; rank: number | null; efficiency: number; comeback: boolean; verdict: string;
}
interface Overrides { available: boolean; insight: string | null; counts: { overrides: number; coach: number; learn: number }; rows: OverrideRow[]; note: string }
interface InspRow { tech: string; initials: string; parts_per_job: number; found: number; jobs: number; above: boolean }
interface Inspection { available: boolean; reason?: string; insight?: string; shop_avg?: number; rows?: InspRow[]; note?: string }
interface ReportsData {
  period: string;
  period_label: string;
  job_count: number;
  reports: {
    top_tech_efficiency: TopTech;
    mentor_board: Mentor;
    inspection_upside: Inspection;
    speed_vs_quality: SpeedQual;
    match_payoff: MatchPayoff;
    dispatcher_overrides: Overrides;
  };
}

const TABS = [
  { key: "top_tech_efficiency", label: "Top Tech: Specific Job Efficiency" },
  { key: "mentor_board", label: "The Mentor Board" },
  { key: "inspection_upside", label: "Hidden Money: Inspection Upside" },
  { key: "speed_vs_quality", label: "Speed vs. Quality Quadrant" },
  { key: "match_payoff", label: "Match Payoff" },
  { key: "dispatcher_overrides", label: "Dispatcher Overrides" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PERIODS = [
  { key: "week", label: "This week" },
  { key: "t30", label: "Last 30 days" },
  { key: "quarter", label: "Quarter" },
];

function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
function Avatar({ name, initials, size = 28 }: { name: string; initials: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ background: hue(name), width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
function effColor(v: number): string {
  return v >= 130 ? "var(--good)" : v >= 100 ? "var(--text)" : "var(--danger)";
}
function Banner({ text, tone = "amber" }: { text: string; tone?: "amber" | "green" | "red" }) {
  const bg = tone === "green" ? "#ecfdf5" : tone === "red" ? "#fef2f2" : "#fefce8";
  const bd = tone === "green" ? "#a7f3d0" : tone === "red" ? "#fecaca" : "#fde68a";
  return (
    <div className="mb-4 rounded-lg border px-4 py-3 text-sm text-[var(--text)]" style={{ background: bg, borderColor: bd }}>
      {text}
    </div>
  );
}
function Empty({ reason }: { reason: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-8 text-center text-sm text-[var(--text-muted)]">
      {reason}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("t30");
  const [tab, setTab] = useState<TabKey>("top_tech_efficiency");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<ReportsData>(`/reports?period=${period}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Reports</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Not your standard DMS reports — insights you can act on and teach from.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-strong)] p-1 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1 font-medium",
                period === p.key ? "bg-[var(--brand,#2563eb)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              tab === t.key
                ? "border-transparent bg-[var(--brand,#2563eb)] text-white"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading && <div className="pt-10"><Spinner label="Building reports…" /></div>}
        {error && <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
        {data && !loading && (
          <>
            {tab === "top_tech_efficiency" && <TopTechView r={data.reports.top_tech_efficiency} />}
            {tab === "mentor_board" && <MentorView r={data.reports.mentor_board} />}
            {tab === "inspection_upside" && <InspectionView r={data.reports.inspection_upside} />}
            {tab === "speed_vs_quality" && <SpeedView r={data.reports.speed_vs_quality} />}
            {tab === "match_payoff" && <MatchView r={data.reports.match_payoff} />}
            {tab === "dispatcher_overrides" && <OverridesView r={data.reports.dispatcher_overrides} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- 1. Top Tech ---------------- */
function TopTechView({ r }: { r: TopTech }) {
  if (!r.count) return <Empty reason="No jobs beat the efficiency threshold in this period yet." />;
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Top Tech: Specific Job Efficiency</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">
        Every job where a tech beat {r.threshold}% — which tech crushed which specific job. Turn these into training clips.
      </p>
      {r.insight && <Banner text={r.insight} />}
      <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Fastest hands, by job type — the teachers</div>
        <div className="flex flex-wrap gap-2">
          {r.teachers.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm">
              <Avatar name={t.tech} initials={t.initials} size={22} />
              <b className="text-[var(--text)]">{t.tech}</b>
              <span className="text-[var(--text-muted)]">· {t.job_type}</span>
              <b style={{ color: "var(--good)" }}>{t.efficiency}%</b>
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
              <th className="px-4 py-2">#</th><th className="px-4 py-2">Technician</th><th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">Vehicle</th><th className="px-4 py-2">RO</th>
              <th className="px-4 py-2 text-right">Guide</th><th className="px-4 py-2 text-right">Actual</th><th className="px-4 py-2 text-right">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.rank} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-2 text-[var(--text-faint)]">{row.rank}</td>
                <td className="px-4 py-2"><div className="flex items-center gap-2"><Avatar name={row.tech} initials={row.initials} size={24} /><b className="text-[var(--text)]">{row.tech}</b></div></td>
                <td className="px-4 py-2"><span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--brand,#2563eb)]">{row.job_type}</span></td>
                <td className="px-4 py-2 text-[var(--text-muted)]">{row.vehicle}</td>
                <td className="px-4 py-2 text-[var(--text-faint)]">RO {row.ro_number}</td>
                <td className="px-4 py-2 text-right text-[var(--text-muted)]">{row.guide_h}h</td>
                <td className="px-4 py-2 text-right text-[var(--text-muted)]">{row.actual_h}h</td>
                <td className="px-4 py-2 text-right font-bold" style={{ color: "var(--good)" }}>{row.efficiency}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- 2. Mentor Board ---------------- */
function MentorView({ r }: { r: Mentor }) {
  if (!r.available) return <Empty reason="Need at least two techs on the same job type to build a pairing." />;
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">The Mentor Board</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">For each job type, the shop&apos;s best hands next to the tech with the most room to grow — and the pairing to close the gap.</p>
      {r.insight && <Banner text={r.insight} />}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
              <th className="px-4 py-2">Job type</th><th className="px-4 py-2">Top hand</th><th className="px-4 py-2">Most room to grow</th>
              <th className="px-4 py-2 text-right">Gap</th><th className="px-4 py-2">Suggested pairing</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-2"><span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--brand,#2563eb)]">{row.job_type}</span></td>
                <td className="px-4 py-2"><div className="flex items-center gap-2"><Avatar name={row.top_hand.tech} initials={row.top_hand.initials} size={22} /><b className="text-[var(--text)]">{row.top_hand.tech}</b><b style={{ color: "var(--good)" }}>{row.top_hand.efficiency}%</b></div></td>
                <td className="px-4 py-2"><div className="flex items-center gap-2"><Avatar name={row.grow.tech} initials={row.grow.initials} size={22} /><b className="text-[var(--text)]">{row.grow.tech}</b><b style={{ color: "var(--danger)" }}>{row.grow.efficiency}%</b>{row.grow.comeback && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">comeback</span>}</div></td>
                <td className="px-4 py-2 text-right font-bold text-[var(--text)]">{row.gap} pts</td>
                <td className="px-4 py-2 font-medium text-[var(--brand,#2563eb)]">{row.pairing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- 3. Inspection Upside ---------------- */
function InspectionView({ r }: { r: Inspection }) {
  if (!r.available || !r.rows) return <Empty reason={r.reason ?? "No inspection data yet."} />;
  const max = Math.max(1, ...r.rows.map((x) => x.found));
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Hidden Money: Inspection Upside</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">Sellable work each tech surfaces per job. Not who sells — who <b>finds</b> the work. The gap between your best inspector and the rest is money already on the cars in your bays.</p>
      {r.insight && <Banner text={r.insight} />}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Sellable work found per job — by technician</div>
        <div className="space-y-2">
          {r.rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex w-32 shrink-0 items-center gap-2">
                <Avatar name={row.tech} initials={row.initials} size={22} />
                <span className="truncate text-sm font-medium text-[var(--text)]">{row.tech}</span>
              </div>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full rounded-full" style={{ width: `${(row.found / max) * 100}%`, background: row.above ? "#16a34a" : "#f59e0b" }} />
              </div>
              <span className="w-14 shrink-0 text-right text-sm font-bold" style={{ color: row.above ? "var(--good)" : "var(--warn)" }}>${row.found}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-faint)]">Green = above shop average (${r.shop_avg}/job). Amber = below — the coaching list.</p>
      </div>
      {r.note && <p className="mt-3 text-xs text-[var(--text-faint)]">{r.note}</p>}
    </div>
  );
}

/* ---------------- 4. Speed vs Quality ---------------- */
function SpeedView({ r }: { r: SpeedQual }) {
  if (!r.available) return <Empty reason="No completed, timed jobs in this period yet." />;
  const W = 720, H = 380, pad = 40;
  const effs = r.points.map((p) => p.efficiency);
  const minE = Math.min(80, ...effs), maxE = Math.max(160, ...effs);
  const maxC = Math.max(2, ...r.points.map((p) => p.comebacks));
  const x = (e: number) => pad + ((e - minE) / (maxE - minE)) * (W - 2 * pad);
  const y = (c: number) => H - pad - (c / maxC) * (H - 2 * pad);
  const midX = x(100);
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Speed vs. Quality Quadrant</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">Fast isn&apos;t good if it comes back. Speed (efficiency →) against comebacks (↑), so &quot;elite&quot; and &quot;rushing&quot; stop looking the same.</p>
      {r.insight && <Banner text={r.insight} />}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 560 }}>
          <line x1={midX} y1={pad} x2={midX} y2={H - pad} stroke="var(--border-strong)" strokeDasharray="4 4" />
          <text x={W - pad} y={pad + 4} textAnchor="end" className="fill-[var(--danger)] text-[13px] font-bold">RUSHING · fast + comebacks</text>
          <text x={W - pad} y={H - pad - 6} textAnchor="end" className="fill-[var(--good)] text-[13px] font-bold">ELITE · fast + clean</text>
          <text x={pad} y={pad + 4} className="fill-[var(--text-faint)] text-[11px]">comebacks ↑</text>
          <text x={W - pad} y={H - 8} textAnchor="end" className="fill-[var(--text-faint)] text-[11px]">efficiency →</text>
          {r.points.map((p, i) => {
            const rush = p.efficiency >= 100 && p.comebacks > 0;
            const elite = p.efficiency >= 100 && p.comebacks === 0;
            const c = rush ? "#dc2626" : elite ? "#16a34a" : "#94a3b8";
            return (
              <g key={i}>
                <circle cx={x(p.efficiency)} cy={y(p.comebacks)} r={16} fill={c} opacity={0.9} />
                <text x={x(p.efficiency)} y={y(p.comebacks) + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">{p.initials}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ---------------- 5. Match Payoff ---------------- */
function MatchView({ r }: { r: MatchPayoff }) {
  if (!r.available) return <Empty reason="No dispatched, scored jobs in this period yet." />;
  const Card = ({ g, tone }: { g: Grp; tone: "green" | "amber" }) => (
    <div className="rounded-2xl border-2 bg-[var(--surface)] p-5" style={{ borderColor: tone === "green" ? "#16a34a" : "#f59e0b" }}>
      <div className="text-sm font-bold text-[var(--text)]">{g.label} <span className="text-[var(--text-faint)]">(n={g.n})</span></div>
      <div className="mt-3 flex gap-8">
        <div><div className="text-3xl font-bold text-[var(--text)]">{g.efficiency ?? "—"}%</div><div className="text-[11px] uppercase text-[var(--text-muted)]">Avg efficiency</div></div>
        <div><div className="text-3xl font-bold text-[var(--text)]">{g.comeback_rate ?? "—"}%</div><div className="text-[11px] uppercase text-[var(--text-muted)]">Comeback rate</div></div>
      </div>
    </div>
  );
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Match Payoff</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">Does the dispatch brain pay off? The same jobs split by the 3D Match Score at dispatch — high-match vs low-match. Proof, not vibes.</p>
      {r.insight && <Banner text={r.insight} tone="green" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card g={r.high} tone="green" />
        <Card g={r.low} tone="amber" />
      </div>
      <p className="mt-3 text-xs text-[var(--text-faint)]">{r.note}</p>
    </div>
  );
}

/* ---------------- 6. Dispatcher Overrides ---------------- */
function OverridesView({ r }: { r: Overrides }) {
  if (!r.available) return <Empty reason="No dispatches below the system's top 2 in this period." />;
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-[var(--text)]">Dispatcher Overrides: Coach or Learn</h2>
      <p className="mb-3 text-sm text-[var(--text-muted)]">Every time a dispatcher assigned an RO to a tech the system ranked below its top 2 — and how it turned out.</p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-3xl font-bold text-[var(--text)]">{r.counts.overrides}</div><div className="text-[11px] uppercase text-[var(--text-muted)]">Overrides (below top 2)</div></div>
        <div className="rounded-xl border-2 border-[var(--danger)] bg-[var(--surface)] p-4"><div className="text-3xl font-bold text-[var(--danger)]">{r.counts.coach}</div><div className="text-[11px] uppercase text-[var(--text-muted)]">System would&apos;ve won → coach</div></div>
        <div className="rounded-xl border-2 border-[var(--good)] bg-[var(--surface)] p-4"><div className="text-3xl font-bold text-[var(--good)]">{r.counts.learn}</div><div className="text-[11px] uppercase text-[var(--text-muted)]">Dispatcher was right → learn</div></div>
      </div>
      {r.insight && <Banner text={r.insight} />}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
              <th className="px-4 py-2">RO / Job</th><th className="px-4 py-2">Dispatcher picked</th>
              <th className="px-4 py-2 text-right">Actual</th><th className="px-4 py-2 text-center">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-2"><div className="font-semibold text-[var(--brand,#2563eb)]">{row.job_type}</div><div className="text-[11px] text-[var(--text-faint)]">{row.vehicle} · RO {row.ro_number}</div></td>
                <td className="px-4 py-2"><div className="flex items-center gap-2"><Avatar name={row.tech} initials={row.initials} size={22} /><b className="text-[var(--text)]">{row.tech}</b><span className="text-[11px] text-[var(--text-faint)]">match {row.match_score} · #{row.rank}</span></div></td>
                <td className="px-4 py-2 text-right font-bold" style={{ color: effColor(row.efficiency) }}>{row.efficiency}%{row.comeback && <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">comeback</span>}</td>
                <td className="px-4 py-2 text-center">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", row.verdict === "Good call" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>{row.verdict === "Good call" ? "✓ Good call" : "⚑ Follow system"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--text-faint)]">{r.note}</p>
    </div>
  );
}
