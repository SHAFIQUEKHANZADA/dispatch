"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

/* ---------------- types (match /technicians/{id}/profile) ---------------- */
interface Metric {
  key: string;
  value: number | null;
  available: boolean;
  issue: string | null;
  unit: string;
}
interface Stats {
  period_label: string;
  ro_count: number;
  flagged_hours: number;
  cp_flagged_hours: number;
  warranty_flagged_hours: number;
  internal_flagged_hours: number;
  qualifies_for_ranking: boolean;
  metrics: Record<string, Metric>;
  data_issues: string[];
}
interface SpecialtyBlock {
  categories: string[];
  total: number;
  floor: number;
  ceiling: number;
  scores: Record<string, number>;
  points_used: number;
  points_remaining: number;
  is_default: boolean;
}
interface Profile {
  id: string;
  name: string;
  role_label: string;
  team_label: string;
  skill_level: string | null;
  dms_tech_no: string | null;
  active: boolean;
  cert_badges: string[];
  certs: { cert_type: string; level: string | null; expires_on: string | null }[];
  specialties: { work_type: string | null; vehicle_specialty: string | null }[];
  restrictions: string[];
  shift_start: string | null;
  shift_end: string | null;
  work_days: string[];
  completeness_pct: number;
  missing_fields: string[];
  specialty: SpecialtyBlock;
}

/* ---------------- helpers ---------------- */
// Stable avatar hue from the name (same idea as the dashboard).
function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hh = Number(h);
  const ampm = hh >= 12 ? "p" : "a";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${m}${ampm}`;
}
const TITLE: Record<string, string> = {
  ENGINE: "Engine", TRANSMISSION: "Transmission", ELECTRICAL: "Electrical",
  HVAC: "HVAC", BRAKES: "Brakes", SUSPENSION: "Suspension", DIAGNOSTIC: "Diagnostics",
  MAINTENANCE: "Maintenance", ALIGNMENT: "Alignment", LUBE: "Lube", EV: "EV / Hybrid",
};
function nice(w: string | null): string {
  if (!w) return "";
  return TITLE[w] ?? w.charAt(0) + w.slice(1).toLowerCase();
}

// The signature-number cards, in display order. `good`: is higher better?
const SIGNATURE: { key: string; label: string; good: boolean }[] = [
  { key: "efficiency", label: "Efficiency", good: true },
  { key: "first_time_fix", label: "Fixed Right First Time", good: true },
  { key: "comeback_rate", label: "Comeback Rate", good: false },
  { key: "productivity", label: "Productivity", good: true },
  { key: "utilization", label: "Utilization", good: true },
  { key: "promise_pct", label: "On-Time Promise", good: true },
];

function metricColor(m: Metric, good: boolean): string {
  if (!m.available || m.value == null) return "var(--text-faint)";
  // Green when the number is on the strong side, plain text otherwise. We keep
  // it simple: efficiency-style metrics are green >=100 / good comebacks <5.
  if (good && m.value >= 90) return "var(--good)";
  if (!good && m.value <= 5) return "var(--good)";
  return "var(--text)";
}

/* ---------------- specialty wheel (rim-and-tire radar) ---------------- */
function SpecialtyWheel({
  categories,
  scores,
}: {
  categories: string[];
  scores: Record<string, number>;
}) {
  const N = categories.length;
  const size = 280;
  const c = size / 2;
  const maxR = c - 42; // room for outside labels

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const at = (i: number, frac: number): [number, number] => [
    c + frac * maxR * Math.cos(angle(i)),
    c + frac * maxR * Math.sin(angle(i)),
  ];
  const dataPt = (i: number, cat: string): [number, number] =>
    at(i, Math.max(0, Math.min(100, scores[cat] ?? 0)) / 100);

  const ring = (frac: number) =>
    categories.map((_, i) => at(i, frac).join(",")).join(" ");
  const dataPoly = categories.map((cat, i) => dataPt(i, cat).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[300px]">
      {/* tire */}
      <circle cx={c} cy={c} r={maxR + 20} fill="#111827" />
      <circle cx={c} cy={c} r={maxR + 20} fill="none" stroke="#374151" strokeWidth={10} />
      <circle cx={c} cy={c} r={maxR + 8} fill="#1f2937" />
      {/* rim grid rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="#4b5563" strokeWidth={1} />
      ))}
      {/* axes */}
      {categories.map((_, i) => {
        const [x, y] = at(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#4b5563" strokeWidth={1} />;
      })}
      {/* data polygon */}
      <polygon points={dataPoly} fill="rgba(59,130,246,0.40)" stroke="#3b82f6" strokeWidth={2} />
      {categories.map((cat, i) => {
        const [x, y] = dataPt(i, cat);
        return <circle key={cat} cx={x} cy={y} r={3.5} fill="#93c5fd" />;
      })}
      {/* labels */}
      {categories.map((cat, i) => {
        const [x, y] = at(i, 1.2);
        const anchor = Math.abs(x - c) < 6 ? "middle" : x > c ? "start" : "end";
        return (
          <text
            key={cat}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-[var(--text-muted)] text-[9px] font-semibold"
          >
            {cat} <tspan className="fill-[#2563eb] font-bold">{scores[cat] ?? 0}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

function SpecialtySection({ techId, initial }: { techId: string; initial: SpecialtyBlock }) {
  const [spec, setSpec] = useState<SpecialtyBlock>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>(initial.scores);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shown = editing ? draft : spec.scores;
  const used = spec.categories.reduce((s, cat) => s + (shown[cat] ?? 0), 0);
  const remaining = spec.total - used;

  function start() {
    setDraft({ ...spec.scores });
    setErr(null);
    setEditing(true);
  }
  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const updated = await api.put<SpecialtyBlock>(`/technicians/${techId}/specialties`, {
        scores: draft,
      });
      setSpec(updated);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Repair specialties
        </h2>
        {!editing ? (
          <button
            onClick={start}
            className="text-xs font-semibold text-[var(--brand,#2563eb)] hover:underline"
          >
            ✎ Adjust
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs font-medium text-[var(--text-muted)] hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || remaining < 0}
              className="rounded-md bg-[var(--brand,#2563eb)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <SpecialtyWheel categories={spec.categories} scores={shown} />
      </div>

      {editing && (
        <>
          <div
            className={cn(
              "mt-3 rounded-lg px-3 py-2 text-xs font-medium",
              remaining < 0
                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                : "bg-[var(--surface-2)] text-[var(--text-muted)]",
            )}
          >
            Specialty points remaining: <span className="font-bold">{remaining}</span> · raise one
            area by lowering another (each stays {spec.floor}–{spec.ceiling}).
          </div>
          <div className="mt-3 space-y-2">
            {spec.categories.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium text-[var(--text)]">{cat}</span>
                <input
                  type="range"
                  min={spec.floor}
                  max={spec.ceiling}
                  step={1}
                  value={draft[cat] ?? spec.floor}
                  onChange={(e) => setDraft((d) => ({ ...d, [cat]: Number(e.target.value) }))}
                  className="h-1.5 flex-1 accent-[#2563eb]"
                />
                <span className="w-8 shrink-0 text-right text-xs font-bold text-[#2563eb]">
                  {draft[cat] ?? spec.floor}
                </span>
              </div>
            ))}
          </div>
          {err && <p className="mt-2 text-xs text-[var(--danger)]">{err}</p>}
          <p className="mt-2 text-[11px] text-[var(--text-faint)]">
            {spec.categories.length}-category budget of {spec.total} points for this level. Changes
            save to the roster and feed dispatch matching.
          </p>
        </>
      )}
      {!editing && spec.is_default && (
        <p className="mt-2 text-[11px] text-[var(--text-faint)]">
          Starter wheel (even split) — click Adjust to set this tech's real strengths.
        </p>
      )}
    </section>
  );
}

export default function TechProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Stats load separately so the page paints instantly and the numbers fill in.
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setStatsLoading(true);
    api
      .get<Profile>(`/technicians/${id}/profile`)
      .then((d) => alive && setP(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    api
      .get<{ stats: Stats | null }>(`/technicians/${id}/stats`)
      .then((d) => alive && setStats(d.stats))
      .catch(() => alive && setStats(null))
      .finally(() => alive && setStatsLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <Spinner />
      </div>
    );
  }
  if (error || !p) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button onClick={() => router.back()} className="mb-4 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          ‹ Back
        </button>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
          {error ?? "Technician not found."}
        </div>
      </div>
    );
  }

  const shift =
    p.shift_start && p.shift_end ? `${fmtTime(p.shift_start)}–${fmtTime(p.shift_end)}` : null;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* breadcrumb / back */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--text)]">
          Dashboard
        </Link>
        <span className="text-[var(--text-faint)]">›</span>
        <span className="text-[var(--text)]">{p.name}</span>
      </div>

      {/* header card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#12233d] to-[#1d3a63] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-bold ring-4 ring-white/20"
            style={{ background: hue(p.name) }}
          >
            {initials(p.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{p.name}</h1>
            <div className="mt-0.5 text-sm font-semibold uppercase tracking-wide text-amber-300">
              {p.role_label}
            </div>
            <div className="mt-1 text-sm text-white/70">
              {p.team_label}
              {shift && <> · {shift}</>}
              {p.dms_tech_no && <> · Tech #{p.dms_tech_no}</>}
              {!p.active && <> · <span className="text-red-300">inactive</span></>}
            </div>
            {p.cert_badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.cert_badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20"
                  >
                    ★ {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* specialty wheel + certs/restrictions */}
        <div className="space-y-5">
          <SpecialtySection techId={p.id} initial={p.specialty} />

          {(p.certs.length > 0 || p.restrictions.length > 0 || p.specialties.length > 0) && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              {p.certs.length > 0 && (
                <>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Certifications
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {p.certs.map((c, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--text)]">
                          {c.cert_type.replace(/_/g, " ")}
                          {c.level && <span className="text-[var(--text-muted)]"> · {c.level}</span>}
                        </span>
                        {c.expires_on && (
                          <span className="text-xs text-[var(--text-faint)]">exp {c.expires_on}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {p.specialties.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Also set up for
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.specialties.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text)]"
                      >
                        {nice(s.work_type)}
                        {s.vehicle_specialty && (
                          <span className="text-[var(--text-muted)]"> · {s.vehicle_specialty}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {p.restrictions.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Cannot be assigned
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.restrictions.map((r) => (
                      <span
                        key={r}
                        className="rounded-full border border-[var(--danger)] px-2.5 py-0.5 text-xs font-semibold text-[var(--danger)]"
                      >
                        {nice(r)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* signature numbers */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Signature numbers
            </h2>
            <span className="text-xs text-[var(--text-faint)]">
              {stats ? stats.period_label : "last 90 days"}
            </span>
          </div>

          {statsLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-faint)]">
              <Spinner /> Loading numbers…
            </div>
          ) : !stats ? (
            <p className="mt-3 text-sm text-[var(--text-faint)]">
              No closed ROs in the last 90 days yet — performance numbers appear here once
              this tech has history in the DMS import.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {/* total hours + RO count are always real (billed/flagged) */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="text-2xl font-bold text-[var(--text)]">{stats.flagged_hours}h</div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">Billed Hours</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                    CP {stats.cp_flagged_hours} · Warr {stats.warranty_flagged_hours} · Int{" "}
                    {stats.internal_flagged_hours}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="text-2xl font-bold text-[var(--text)]">{stats.ro_count}</div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">Repair Orders</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">
                    {stats.qualifies_for_ranking ? "ranks on scoreboard" : "below ranking minimum"}
                  </div>
                </div>

                {SIGNATURE.map(({ key, label, good }) => {
                  const m = stats.metrics[key];
                  if (!m) return null;
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                      title={m.issue ?? undefined}
                    >
                      <div className="text-2xl font-bold" style={{ color: metricColor(m, good) }}>
                        {m.available && m.value != null ? `${m.value}%` : "—"}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
                      {!m.available && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-faint)]">
                          {m.issue ?? "no data"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Link
                href="/scoreboard"
                className="mt-4 inline-block text-xs font-medium text-[var(--text-muted)] underline hover:text-[var(--text)]"
              >
                See full scoreboard →
              </Link>
            </>
          )}
        </section>
      </div>

      {/* roster completeness (honest state, not a fake stat) */}
      {p.missing_fields.length > 0 && (
        <div className="mt-5 rounded-xl border border-[var(--warn)] bg-[var(--surface)] p-4 text-sm">
          <span className="font-semibold text-[var(--warn)]">
            Profile {p.completeness_pct}% complete.
          </span>{" "}
          <span className="text-[var(--text-muted)]">
            Missing for dispatch: {p.missing_fields.join(", ")}.
          </span>{" "}
          <Link href="/techs" className="underline">
            Finish in Tech Settings
          </Link>
        </div>
      )}
    </div>
  );
}
