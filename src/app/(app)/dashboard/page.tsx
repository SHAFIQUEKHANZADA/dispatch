"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import { Card, GuardianBanner, Spinner, cn } from "@/components/ui";
import { fmtTimeShort } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dashboard>("/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  if (error)
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
        {error}
      </div>
    );
  if (!data) return null;

  const soldPct =
    data.capacity_hours_today > 0
      ? Math.round((data.hours_sold_today / data.capacity_hours_today) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Service Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Who&apos;s idle, who&apos;s overloaded, which ROs are at risk — right now.
          </p>
        </div>
        <Link
          href="/dispatch"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-hover)]"
        >
          Go to Dispatch Board <span aria-hidden>→</span>
        </Link>
      </div>

      <GuardianBanner
        stale={data.guardian.stale}
        ageHours={data.guardian.source_data_age_hours}
        thresholdHours={data.guardian.staleness_threshold_hours}
      />

      {/* KPI row — each tile links to where you'd act on it */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Unassigned" value={data.unassigned} tone="warn" href="/dispatch" icon={<IconInbox />} />
        <Kpi label="Waiting customers" value={data.waiting_customers} tone="info" href="/dispatch" icon={<IconClock />} />
        <Kpi label="Heat cases" value={data.heat_cases} tone={data.heat_cases ? "danger" : "good"} href="/dispatch" icon={<IconFlame />} />
        <Kpi label="Techs idle" value={data.techs_idle} tone={data.techs_idle ? "warn" : "good"} href="/techs" icon={<IconUser />} />
        <Kpi label="Techs overloaded" value={data.techs_overloaded} tone={data.techs_overloaded ? "danger" : "good"} href="/techs" icon={<IconLayers />} />
        <Kpi label="ROs at risk" value={data.ros_at_risk.length} tone={data.ros_at_risk.length ? "danger" : "good"} href="/dispatch" icon={<IconAlert />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* hours sold vs capacity */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Hours sold vs capacity today
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                soldPct >= 90
                  ? "bg-emerald-50 text-emerald-700"
                  : soldPct >= 60
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700",
              )}
            >
              {soldPct}%
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tracking-tight text-[var(--text)]">
              {data.hours_sold_today}
            </span>
            <span className="text-sm text-[var(--text-muted)]">/ {data.capacity_hours_today} hrs</span>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all"
              style={{ width: `${Math.min(100, soldPct)}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-[var(--text-faint)]">
            {soldPct}% of today&apos;s bench capacity is booked
          </div>
        </Card>

        {/* at-risk ROs */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              ROs at risk — no eligible tech can still make the promise
            </div>
            {data.ros_at_risk.length > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
                {data.ros_at_risk.length}
              </span>
            )}
          </div>
          {data.ros_at_risk.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-6 text-sm font-medium text-emerald-700">
              <IconCheck /> No ROs are at risk of blowing their promise time.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.ros_at_risk.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="font-mono font-semibold text-[var(--brand)]">RO #{r.ro_number}</span>
                  <span className="flex-1 text-xs text-[var(--text-muted)]">{r.reason}</span>
                  <span className="whitespace-nowrap rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-[var(--danger)]">
                    promise {fmtTimeShort(r.promise_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* idle / overloaded lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Idle technicians
            </div>
            <Link href="/techs" className="text-xs font-medium text-[var(--brand)] hover:underline">
              View all →
            </Link>
          </div>
          {data.idle_technicians.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">Nobody idle — full bench.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.idle_technicians.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t.name} · {t.team}
                </span>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Overloaded technicians
          </div>
          {data.overloaded_technicians.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <IconCheck /> Nobody over capacity.
            </div>
          ) : (
            <div className="space-y-2">
              {data.overloaded_technicians.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--text)]">{t.name}</span>
                  <span className="rounded-md bg-red-50 px-2 py-0.5 font-mono text-xs font-medium text-[var(--danger)]">
                    {t.assigned_hours} / {t.capacity_hours} hrs
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

function Kpi({
  label,
  value,
  tone,
  href,
  icon,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "danger" | "info";
  href: string;
  icon: React.ReactNode;
}) {
  const tones: Record<string, { text: string; chip: string }> = {
    good: { text: "text-[var(--good)]", chip: "bg-emerald-50 text-emerald-600" },
    warn: { text: "text-[var(--warn)]", chip: "bg-amber-50 text-amber-600" },
    danger: { text: "text-[var(--danger)]", chip: "bg-red-50 text-red-600" },
    info: { text: "text-[var(--info)]", chip: "bg-sky-50 text-sky-600" },
  };
  const t = tones[tone];
  return (
    <Link
      href={href}
      className="card-elev card-hover group flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
          {label}
        </span>
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", t.chip)}>{icon}</span>
      </div>
      <span className={cn("font-mono text-3xl font-bold tracking-tight", t.text)}>{value}</span>
    </Link>
  );
}

/* inline icons */
const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
function IconInbox() {
  return (
    <svg {...iconProps}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconFlame() {
  return (
    <svg {...iconProps}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.7 0 3-1.2 3-3 0-2-2-3.5-1.5-6C10 9 8.5 12 8.5 14.5z" />
      <path d="M12 2c2 3 6 5 6 10a6 6 0 1 1-12 0c0-2 1-4 2-5" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg {...iconProps}>
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg {...iconProps}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg {...iconProps} width={18} height={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}
