"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TechOptions, Technician } from "@/lib/types";
import { Button, Card, cn } from "./ui";

// FR-1 — the onboarding form. Captures EVERY field in the checklist:
// identity & structure, qualifications, schedule & limits. Built to be filled
// fast during the Service Manager session.

interface FormState {
  name: string;
  employee_id: string;
  dms_tech_no: string;
  team: string;
  skill_level: string;
  active: boolean;
  shift_start: string;
  shift_end: string;
  work_days: string[];
  lunch_start: string;
  lunch_end: string;
  max_daily_hours: string;
  overtime_threshold: string;
  efficiency_target: string;
  productivity_target: string;
  certs: { cert_type: string; level: string; expires_on: string }[];
  restrictions: string[];
  specialties: { work_type: string; vehicle_specialty: string }[];
}

function initial(t: Technician | null): FormState {
  return {
    name: t?.name ?? "",
    employee_id: t?.employee_id ?? "",
    dms_tech_no: t?.dms_tech_no ?? "",
    team: t?.team ?? "",
    skill_level: t?.skill_level ?? "",
    active: t?.active ?? true,
    shift_start: t?.shift_start?.slice(0, 5) ?? "",
    shift_end: t?.shift_end?.slice(0, 5) ?? "",
    work_days: t?.work_days ?? [],
    lunch_start: t?.lunch_start?.slice(0, 5) ?? "",
    lunch_end: t?.lunch_end?.slice(0, 5) ?? "",
    max_daily_hours: t?.max_daily_hours?.toString() ?? "",
    overtime_threshold: t?.overtime_threshold?.toString() ?? "",
    efficiency_target: t?.efficiency_target?.toString() ?? "",
    productivity_target: t?.productivity_target?.toString() ?? "",
    certs: t?.certs.map((c) => ({
      cert_type: c.cert_type,
      level: c.level ?? "",
      expires_on: c.expires_on ?? "",
    })) ?? [],
    restrictions: t?.restrictions ?? [],
    specialties: t?.specialties.map((s) => ({
      work_type: s.work_type ?? "",
      vehicle_specialty: s.vehicle_specialty ?? "",
    })) ?? [],
  };
}

export function TechnicianForm({
  technician,
  options,
  onCancel,
  onSaved,
}: {
  technician: Technician | null;
  options: TechOptions;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(initial(technician));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function toggleDay(d: string) {
    set("work_days", f.work_days.includes(d) ? f.work_days.filter((x) => x !== d) : [...f.work_days, d]);
  }

  function toggleRestriction(w: string) {
    set(
      "restrictions",
      f.restrictions.includes(w) ? f.restrictions.filter((x) => x !== w) : [...f.restrictions, w],
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const payload = {
      name: f.name,
      employee_id: f.employee_id || null,
      dms_tech_no: f.dms_tech_no || null,
      team: f.team || null,
      skill_level: f.skill_level || null,
      active: f.active,
      shift_start: f.shift_start || null,
      shift_end: f.shift_end || null,
      work_days: f.work_days,
      lunch_start: f.lunch_start || null,
      lunch_end: f.lunch_end || null,
      max_daily_hours: num(f.max_daily_hours),
      overtime_threshold: num(f.overtime_threshold),
      efficiency_target: num(f.efficiency_target),
      productivity_target: num(f.productivity_target),
      certs: f.certs
        .filter((c) => c.cert_type)
        .map((c) => ({
          cert_type: c.cert_type,
          level: c.level || null,
          expires_on: c.expires_on || null,
        })),
      restrictions: f.restrictions,
      specialties: f.specialties.filter((s) => s.work_type || s.vehicle_specialty),
    };
    try {
      if (technician) await api.put(`/technicians/${technician.id}`, payload);
      else await api.post("/technicians", payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {technician ? `Edit ${technician.name}` : "Add Technician"}
        </h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active
        </label>
      </div>

      {/* Identity & structure */}
      <Section title="Identity & structure">
        <Field label="Name" required>
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Employee ID">
          <input className={inputCls} value={f.employee_id} onChange={(e) => set("employee_id", e.target.value)} />
        </Field>
        <Field label="DMS tech #" required>
          <input className={inputCls} value={f.dms_tech_no} onChange={(e) => set("dms_tech_no", e.target.value)} />
        </Field>
        <Field label="Team" required>
          <select className={inputCls} value={f.team} onChange={(e) => set("team", e.target.value)}>
            <option value="">—</option>
            {options.teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Skill level" required>
          <select className={inputCls} value={f.skill_level} onChange={(e) => set("skill_level", e.target.value)}>
            <option value="">—</option>
            {options.skill_levels.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Schedule & limits */}
      <Section title="Schedule & limits">
        <Field label="Shift start" required>
          <input type="time" className={inputCls} value={f.shift_start} onChange={(e) => set("shift_start", e.target.value)} />
        </Field>
        <Field label="Shift end" required>
          <input type="time" className={inputCls} value={f.shift_end} onChange={(e) => set("shift_end", e.target.value)} />
        </Field>
        <Field label="Lunch start">
          <input type="time" className={inputCls} value={f.lunch_start} onChange={(e) => set("lunch_start", e.target.value)} />
        </Field>
        <Field label="Lunch end">
          <input type="time" className={inputCls} value={f.lunch_end} onChange={(e) => set("lunch_end", e.target.value)} />
        </Field>
        <Field label="Max daily hours" required>
          <input type="number" step="0.5" className={inputCls} value={f.max_daily_hours} onChange={(e) => set("max_daily_hours", e.target.value)} />
        </Field>
        <Field label="Overtime threshold">
          <input type="number" step="0.5" className={inputCls} value={f.overtime_threshold} onChange={(e) => set("overtime_threshold", e.target.value)} />
        </Field>
        <Field label="Efficiency target %">
          <input type="number" className={inputCls} value={f.efficiency_target} onChange={(e) => set("efficiency_target", e.target.value)} />
        </Field>
        <Field label="Productivity target %">
          <input type="number" className={inputCls} value={f.productivity_target} onChange={(e) => set("productivity_target", e.target.value)} />
        </Field>
        <div className="col-span-2">
          <div className="mb-1 text-xs text-[var(--text-muted)]">Work days</div>
          <div className="flex flex-wrap gap-1.5">
            {options.work_days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs",
                  f.work_days.includes(d)
                    ? "border-[var(--brand)] bg-[var(--brand)]/20 text-[var(--text)]"
                    : "border-[var(--border-strong)] text-[var(--text-muted)]",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Qualifications */}
      <Section title="Qualifications">
        <div className="col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">Certifications</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set("certs", [...f.certs, { cert_type: "", level: "", expires_on: "" }])}
            >
              + Add cert
            </Button>
          </div>
          <div className="space-y-1.5">
            {f.certs.map((c, i) => (
              <div key={i} className="flex gap-1.5">
                <select
                  className={cn(inputCls, "flex-1")}
                  value={c.cert_type}
                  onChange={(e) => {
                    const next = [...f.certs];
                    next[i] = { ...c, cert_type: e.target.value };
                    set("certs", next);
                  }}
                >
                  <option value="">Select cert…</option>
                  {options.cert_types.map((ct) => (
                    <option key={ct}>{ct}</option>
                  ))}
                </select>
                <input
                  placeholder="level"
                  className={cn(inputCls, "w-28")}
                  value={c.level}
                  onChange={(e) => {
                    const next = [...f.certs];
                    next[i] = { ...c, level: e.target.value };
                    set("certs", next);
                  }}
                />
                <button
                  type="button"
                  className="px-2 text-[var(--danger)]"
                  onClick={() => set("certs", f.certs.filter((_, k) => k !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <div className="mb-1 text-xs text-[var(--text-muted)]">
            Restricted work types (hard block — excluded from the Match Score)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.work_types.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleRestriction(w)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs",
                  f.restrictions.includes(w)
                    ? "border-[var(--danger)] bg-[var(--danger)]/20 text-[var(--danger)]"
                    : "border-[var(--border-strong)] text-[var(--text-muted)]",
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Preferred work types & vehicle specialties (soft bonus)
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                set("specialties", [...f.specialties, { work_type: "", vehicle_specialty: "" }])
              }
            >
              + Add specialty
            </Button>
          </div>
          <div className="space-y-1.5">
            {f.specialties.map((s, i) => (
              <div key={i} className="flex gap-1.5">
                <select
                  className={cn(inputCls, "flex-1")}
                  value={s.work_type}
                  onChange={(e) => {
                    const next = [...f.specialties];
                    next[i] = { ...s, work_type: e.target.value };
                    set("specialties", next);
                  }}
                >
                  <option value="">Work type…</option>
                  {options.work_types.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
                <input
                  placeholder="vehicle (e.g. Odyssey)"
                  className={cn(inputCls, "flex-1")}
                  value={s.vehicle_specialty}
                  onChange={(e) => {
                    const next = [...f.specialties];
                    next[i] = { ...s, vehicle_specialty: e.target.value };
                    set("specialties", next);
                  }}
                />
                <button
                  type="button"
                  className="px-2 text-[var(--danger)]"
                  onClick={() => set("specialties", f.specialties.filter((_, k) => k !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={busy || !f.name}>
          {busy ? "Saving…" : "Save technician"}
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--brand)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-[var(--text-muted)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </div>
      {children}
    </label>
  );
}
