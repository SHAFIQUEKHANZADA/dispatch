"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TechOptions, Technician } from "@/lib/types";
import { Button, Card, Spinner, cn } from "@/components/ui";
import { TechnicianForm } from "@/components/technician-form";

export default function TechniciansSettingsPage() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [options, setOptions] = useState<TechOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Technician | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, o] = await Promise.all([
        api.get<{ technicians: Technician[] }>("/technicians"),
        api.get<TechOptions>("/technicians/options"),
      ]);
      setTechs(t.technicians);
      setOptions(o);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner label="Loading technicians…" />;
  if (error)
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
        {error}
      </div>
    );

  if (editing && options) {
    return (
      <TechnicianForm
        technician={editing === "new" ? null : editing}
        options={options}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Technician Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">
            The system of record for tech capability — the 60–90 minute onboarding session. This
            data fuels the Match Score; a red completeness bar means a tech can&apos;t be dispatched yet.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>
          + Add Technician
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-faint)]">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Team</th>
              <th className="px-3 py-2.5 font-medium">Level</th>
              <th className="px-3 py-2.5 font-medium">DMS #</th>
              <th className="px-3 py-2.5 font-medium">Certs</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Setup</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)]">
                <td className="px-3 py-2.5 font-medium">{t.name}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)]">{t.team ?? "—"}</td>
                <td className="px-3 py-2.5 text-[var(--text-muted)]">{t.skill_level ?? "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                  {t.dms_tech_no ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">{t.certs.length}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      t.active
                        ? "bg-[var(--surface-3)] text-[var(--good)]"
                        : "bg-[var(--surface-3)] text-[var(--text-faint)]",
                    )}
                  >
                    {t.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Completeness pct={t.completeness_pct} missing={t.missing_fields} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Completeness({ pct, missing }: { pct: number; missing: string[] }) {
  const color = pct === 100 ? "var(--good)" : pct >= 60 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="flex items-center gap-2" title={missing.length ? `Missing: ${missing.join(", ")}` : "Complete"}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
