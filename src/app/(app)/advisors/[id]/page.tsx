"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Spinner } from "@/components/ui";

/* ---------------- types (match /scoreboard/advisor/{id}) ---------------- */
interface Column {
  key: string;
  header: string;
  kind: "percent" | "number" | "hours" | "money";
  higher: boolean;
  goal: number | null;
}
interface AdvisorRow {
  advisor_id: string;
  name: string;
  rank: number;
  qualifies: boolean;
  values: {
    csi: number | null;
    cp_ros: number | null;
    sales_ro: number | null;
    sales_breakdown: { yest: number | null; lmo: number | null; pmo: number | null };
    recs_ro: number | null;
    hrs_vs_rec: number | null;
    video_sent: number | null;
  };
}
interface Detail {
  advisor: AdvisorRow;
  total: number;
  rank_key: string;
  columns: Column[];
  goals: Record<string, number | null>;
  store: Record<string, number | null>;
}

function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function fmt(v: number | null, kind: string): string {
  if (v == null) return "—";
  if (kind === "percent") return `${v}%`;
  if (kind === "money") return `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}`;
  return `${v}`;
}

export default function AdvisorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<Detail>(`/scoreboard/advisor/${id}`)
      .then((r) => alive && setD(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
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
  if (error || !d) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button onClick={() => router.back()} className="mb-4 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          ‹ Back
        </button>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--danger)]">
          {error ?? "Advisor not found."}
        </div>
      </div>
    );
  }

  const a = d.advisor;
  const v = a.values;
  const csiScore = v.csi != null ? (v.csi / 20).toFixed(2) : null; // % -> out of 5
  const trend = [
    { label: "Prior mo", val: v.sales_breakdown.pmo },
    { label: "Last mo", val: v.sales_breakdown.lmo },
    { label: "Yesterday", val: v.sales_breakdown.yest },
  ].filter((t) => t.val != null) as { label: string; val: number }[];
  const trendMax = Math.max(1, ...trend.map((t) => t.val));

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/scoreboard" className="hover:text-[var(--text)]">
          Scoreboard
        </Link>
        <span className="text-[var(--text-faint)]">›</span>
        <span className="text-[var(--text)]">Advisor review · {a.name}</span>
      </div>

      {/* header */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#12233d] to-[#1d3a63] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold ring-4 ring-white/20"
            style={{ background: hue(a.name) }}
          >
            {initials(a.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{a.name}</h1>
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[#3a2c0a]">
                #{a.rank} of {d.total} · {d.rank_key === "csi" ? "CSI" : "Sales/RO"}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-white/70">Service Advisor</div>
          </div>
          {csiScore && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-white/60">CSI score</div>
              <div className="text-3xl font-bold">
                {csiScore}
                <span className="text-lg text-white/60">/5</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {d.columns.map((c) => {
          const val = (v as unknown as Record<string, number | null>)[c.key];
          return (
            <div key={c.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="text-xl font-bold text-[var(--text)]">{fmt(val ?? null, c.kind)}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {c.header}
              </div>
              {c.goal != null && (
                <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">goal {fmt(c.goal, c.kind)}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* performance vs goal */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Performance vs goal
          </h2>
          <div className="mt-3 space-y-3">
            {d.columns
              .filter((c) => c.goal != null && (v as unknown as Record<string, number | null>)[c.key] != null)
              .map((c) => {
                const val = (v as unknown as Record<string, number | null>)[c.key] as number;
                const pct = Math.round((val / (c.goal as number)) * 100);
                const good = c.higher ? pct >= 100 : pct <= 100;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text)]">{c.header}</span>
                      <span className={good ? "font-bold text-[var(--good)]" : "font-bold text-[var(--danger)]"}>
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* sales trend */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Sales / RO trend
          </h2>
          {trend.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-faint)]">No sales history yet.</p>
          ) : (
            <div className="mt-4 flex items-end gap-4" style={{ height: 160 }}>
              {trend.map((t) => (
                <div key={t.label} className="flex flex-1 flex-col items-center justify-end">
                  <div className="text-xs font-bold text-[var(--text)]">${Math.round(t.val)}</div>
                  <div
                    className="mt-1 w-full rounded-t bg-[#2563eb]"
                    style={{ height: `${(t.val / trendMax) * 120}px` }}
                  />
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">{t.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
