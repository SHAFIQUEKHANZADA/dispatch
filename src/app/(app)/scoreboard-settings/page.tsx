"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

interface Metric { name: string; source: string; goal: string; show: boolean }
interface Display {
  rotate_every_sec: number;
  pause_resume_min: number;
  rows_per_page: number;
  default_rank_advisors: string;
  default_rank_techs: string;
  facility_utilization_goal: number;
}
interface Config { display: Display; advisor_metrics: Metric[]; tech_metrics: Metric[] }
interface ManualAdvisor {
  advisor_id: string;
  name: string;
  csi_out_of_5: number | null;
  survey_responses: number | null;
  survey_response_pct: number | null;
}
interface Data {
  config: Config;
  manual: ManualAdvisor[];
  period_label: string;
  period_options: string[];
  max_per_board: number;
}

const SOURCE_STYLE: Record<string, string> = {
  MANUAL: "bg-amber-50 text-amber-700",
  MYKAARMA: "bg-emerald-50 text-emerald-700",
  DMS: "bg-emerald-50 text-emerald-700",
  "3D MATCH": "bg-emerald-50 text-emerald-700",
};

export default function ScoreboardSettingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Data>("/scoreboard/settings"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(fn: (d: Data) => Data) {
    setData((prev) => (prev ? fn(structuredClone(prev)) : prev));
    setSavedAt(null);
  }

  const advisorShown = data?.config.advisor_metrics.filter((m) => m.show).length ?? 0;
  const techShown = data?.config.tech_metrics.filter((m) => m.show).length ?? 0;

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      await api.put("/scoreboard/settings", {
        display: data.config.display,
        advisor_metrics: data.config.advisor_metrics,
        tech_metrics: data.config.tech_metrics,
      });
      await api.put("/scoreboard/manual", {
        period: data.period_label,
        advisors: data.manual.map((a) => ({
          advisor_id: a.advisor_id,
          csi_out_of_5: a.csi_out_of_5,
          survey_responses: a.survey_responses,
          survey_response_pct: a.survey_response_pct,
        })),
      });
      setSavedAt(new Date().toLocaleTimeString());
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Scoreboard Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Choose which metrics show, set goals, and enter data that can&apos;t be pulled from a feed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-[var(--good)]">Saved {savedAt}</span>}
          <button
            onClick={save}
            disabled={saving || !data}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
              saving || !data ? "cursor-not-allowed bg-[var(--surface-3)] text-[var(--text-faint)]" : "bg-[var(--good)] hover:brightness-110",
            )}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {loading && <div className="pt-8"><Spinner label="Loading scoreboard settings…" /></div>}
      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>
      )}

      {data && (
        <div className="space-y-5">
          {/* DISPLAY & ROTATION */}
          <Section title="Display & Rotation">
            <div className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
              <NumRow label="Rotate every" suffix="seconds (TV burn-in mitigation)" value={data.config.display.rotate_every_sec}
                onChange={(v) => patch((d) => { d.config.display.rotate_every_sec = v; return d; })} />
              <SelectRow label="Default rank — Advisors" value={data.config.display.default_rank_advisors}
                options={data.config.advisor_metrics.map((m) => m.name)}
                onChange={(v) => patch((d) => { d.config.display.default_rank_advisors = v; return d; })} />
              <NumRow label="Pause auto-resume" suffix="minutes" value={data.config.display.pause_resume_min}
                onChange={(v) => patch((d) => { d.config.display.pause_resume_min = v; return d; })} />
              <SelectRow label="Default rank — Techs" value={data.config.display.default_rank_techs}
                options={data.config.tech_metrics.map((m) => m.name)}
                onChange={(v) => patch((d) => { d.config.display.default_rank_techs = v; return d; })} />
              <NumRow label="Rows per page" suffix="overflow rolls to extra pages" value={data.config.display.rows_per_page}
                onChange={(v) => patch((d) => { d.config.display.rows_per_page = v; return d; })} />
              <NumRow label="Facility Utilization goal" suffix="% (formula pending)" value={data.config.display.facility_utilization_goal}
                onChange={(v) => patch((d) => { d.config.display.facility_utilization_goal = v; return d; })} />
            </div>
          </Section>

          <div className="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 px-4 py-2.5 text-sm text-[var(--text-muted)]">
            Pick up to <b className="text-[var(--text)]">{data.max_per_board} metrics per board</b> so the TV stays readable. Column choices save on Save Changes and reorder by dragging headers on the scoreboard.
          </div>

          {/* METRIC BOARDS */}
          <div className="grid gap-5 xl:grid-cols-2">
            <MetricBoard
              title="Advisor Board Metrics" accent="text-[var(--brand)]"
              shown={advisorShown} max={data.max_per_board}
              metrics={data.config.advisor_metrics}
              onToggle={(i) => patch((d) => {
                const m = d.config.advisor_metrics[i];
                if (!m.show && advisorShown >= data.max_per_board) return d; // cap
                m.show = !m.show; return d;
              })}
              onGoal={(i, g) => patch((d) => { d.config.advisor_metrics[i].goal = g; return d; })}
            />
            <MetricBoard
              title="Technician Board Metrics" accent="text-emerald-600"
              shown={techShown} max={data.max_per_board}
              metrics={data.config.tech_metrics}
              onToggle={(i) => patch((d) => {
                const m = d.config.tech_metrics[i];
                if (!m.show && techShown >= data.max_per_board) return d;
                m.show = !m.show; return d;
              })}
              onGoal={(i, g) => patch((d) => { d.config.tech_metrics[i].goal = g; return d; })}
            />
          </div>

          {/* MANUAL DATA ENTRY */}
          <Section title="Manual Data Entry" hint="metrics with no feed yet">
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span aria-hidden>✎</span>
              <span>
                <b>For metrics an API can&apos;t deliver.</b> CSI comes from the manufacturer survey portal (not DMS/MyKaarma), so
                enter it here each period. As feeds come online, these fields auto-fill and this section hides itself. Saved
                values flow into the scoreboard and the Match Score.
              </span>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--text-muted)]">Period:</span>
              <select className="input w-56" value={data.period_label} disabled>
                {data.period_options.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                    <th className="py-2 pr-3">Advisor</th>
                    <th className="px-3 py-2">CSI (out of 5)</th>
                    <th className="px-3 py-2">Survey Responses</th>
                    <th className="px-3 py-2">Survey Response %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manual.map((a, i) => (
                    <tr key={a.advisor_id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: hue(a.name) }}>
                            {initials(a.name)}
                          </span>
                          <span className="font-semibold text-[var(--text)]">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" step="0.01" min={0} max={5} className="input w-28 text-center"
                          value={a.csi_out_of_5 ?? ""} placeholder="—"
                          onChange={(e) => patch((d) => { d.manual[i].csi_out_of_5 = e.target.value === "" ? null : Number(e.target.value); return d; })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={0} className="input w-28 text-center"
                          value={a.survey_responses ?? ""} placeholder="—"
                          onChange={(e) => patch((d) => { d.manual[i].survey_responses = e.target.value === "" ? null : Number(e.target.value); return d; })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="relative w-28">
                          <input type="number" min={0} max={100} className="input text-center"
                            value={a.survey_response_pct ?? ""} placeholder="—"
                            onChange={(e) => patch((d) => { d.manual[i].survey_response_pct = e.target.value === "" ? null : Number(e.target.value); return d; })} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function MetricBoard({ title, accent, shown, max, metrics, onToggle, onGoal }: {
  title: string; accent: string; shown: number; max: number; metrics: Metric[];
  onToggle: (i: number) => void; onGoal: (i: number, g: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-baseline justify-between border-b border-[var(--border)] pb-2.5">
        <h2 className={cn("text-sm font-bold uppercase tracking-wide", accent)}>{title}</h2>
        <span className="text-xs text-[var(--text-faint)]">{shown} of {max} shown</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
            <th className="py-2 pr-3">Metric</th>
            <th className="px-3 py-2 text-center">Show</th>
            <th className="px-3 py-2">Goal</th>
            <th className="px-3 py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={m.name} className={cn("border-t border-[var(--border)]", m.show && "bg-emerald-50/30")}>
              <td className="py-2.5 pr-3 font-semibold text-[var(--text)]">{m.name}</td>
              <td className="px-3 py-2.5 text-center">
                <Toggle checked={m.show} onChange={() => onToggle(i)} disabled={!m.show && shown >= max} />
              </td>
              <td className="px-3 py-2.5">
                <input className="input w-24" value={m.goal}
                  onChange={(e) => onGoal(i, e.target.value)} />
              </td>
              <td className="px-3 py-2.5">
                <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", SOURCE_STYLE[m.source] ?? "bg-[var(--surface-3)] text-[var(--text-muted)]")}>
                  {m.source}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- building blocks ----------
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-baseline justify-between border-b border-[var(--border)] pb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text)]">{title}</h2>
        {hint && <span className="text-xs text-[var(--text-faint)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumRow({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-52 shrink-0 text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <input type="number" className="input w-24" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="text-xs text-[var(--text-faint)]">{suffix}</span>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-52 shrink-0 text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <select className="input w-48" value={value} onChange={(e) => onChange(e.target.value)}>
        {[...new Set([value, ...options])].map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn("relative inline-block h-6 w-11 rounded-full align-middle transition",
        checked ? "bg-[var(--good)]" : disabled ? "cursor-not-allowed bg-[var(--surface-3)] opacity-60" : "bg-[var(--surface-3)]")}
      role="switch" aria-checked={checked}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
