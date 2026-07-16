"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AvailableTech } from "@/lib/types";
import { Avatar, Card, Spinner, cn } from "@/components/ui";
import { fmtTimeShort, pct } from "@/lib/format";

export default function AvailableTechsPage() {
  const [techs, setTechs] = useState<AvailableTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ technicians: AvailableTech[] }>("/technicians/available")
      .then((d) => setTechs(d.technicians))
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading technicians…" />;
  if (error)
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
        {error}
      </div>
    );

  const onShift = techs.filter((t) => t.on_shift);
  const off = techs.filter((t) => !t.on_shift);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Available Technicians</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Who&apos;s on shift, what they&apos;re holding, who&apos;s idle. Idle techs are highlighted.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {onShift.map((t) => (
          <TechCard key={t.id} t={t} />
        ))}
      </div>

      {off.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Off shift
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {off.map((t) => (
              <TechCard key={t.id} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TechCard({ t }: { t: AvailableTech }) {
  const loadPct = t.capacity_hours > 0 ? (t.assigned_hours / t.capacity_hours) * 100 : 0;
  const barColor = t.overloaded
    ? "var(--danger)"
    : loadPct > 85
      ? "var(--warn)"
      : "var(--good)";

  return (
    <Card
      className={cn(
        "p-4",
        t.idle && "ring-1 ring-[var(--warn)]/50",
        !t.on_shift && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={t.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{t.name}</span>
            {t.idle && (
              <span className="rounded bg-[var(--warn)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#1a1204]">
                Idle
              </span>
            )}
            {t.overloaded && (
              <span className="rounded bg-[var(--danger)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Overloaded
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {t.level_label} · {t.team}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>Assigned today</span>
          <span className="font-mono text-[var(--text)]">
            {t.assigned_hours} / {t.capacity_hours} hrs
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, loadPct)}%`, background: barColor }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Row k="On shift" v={t.on_shift ? `${fmtTimeShort(t.shift_start)}–${fmtTimeShort(t.shift_end)}` : "No"} />
        <Row k="Free at" v={fmtTimeShort(t.free_at)} />
        <Row
          k="Efficiency (T90)"
          v={t.efficiency_t90 !== null ? pct(t.efficiency_t90, 0) : "—"}
        />
        <Row k="Target" v={t.efficiency_target ? pct(t.efficiency_target, 0) : "—"} />
      </div>

      <div className="mt-2">
        <div className="text-xs text-[var(--text-muted)]">
          Current RO:{" "}
          {t.current_ro ? (
            <span className="font-mono text-[var(--text)]">
              #{t.current_ro.ro_number} ({t.current_ro.concern_category})
            </span>
          ) : (
            <span className="text-[var(--text-faint)]">none</span>
          )}
        </div>
      </div>

      {t.certs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {t.certs.map((c) => (
            <span
              key={c}
              className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
            >
              {c.replace(/_/g, "/")}
            </span>
          ))}
        </div>
      )}

      {t.data_issues.length > 0 && (
        <div className="mt-2 text-[11px] text-[var(--warn)]">⚠ {t.data_issues[0]}</div>
      )}
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-faint)]">{k}</span>
      <span className="text-[var(--text)]">{v}</span>
    </div>
  );
}
