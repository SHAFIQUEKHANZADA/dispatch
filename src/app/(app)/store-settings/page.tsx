"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";
import { MyKaarmaStatus } from "@/components/mykaarma-status";

// ------- types mirroring GET /dealer -------
interface TechLevel { name: string; set: string; bio_points: number; floor: number; cap: number }
interface Team { name: string; color: string }
interface StoreConfig {
  hours: { open: string; close: string };
  days_open: boolean[];
  bays: number;
  tech_levels: TechLevel[];
  teams: Team[];
  dashboard: {
    tech_sort: string;
    time_window: string;
    finishing_soon_min: number;
    group_by_team: boolean;
    show_off_shift: boolean;
  };
}
interface Weights {
  bio_baseline: number; tech_quality: number; job_fit: number;
  availability: number; pay_pacing: number; cost_efficiency: number;
}
interface DealerData {
  name: string;
  store_config: StoreConfig;
  team_counts: Record<string, number>;
  weights: Weights;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEIGHT_ROWS: { key: keyof Weights; label: string }[] = [
  { key: "bio_baseline", label: "Bio Baseline" },
  { key: "tech_quality", label: "Tech Quality" },
  { key: "job_fit", label: "Job Fit" },
  { key: "availability", label: "Availability" },
  { key: "pay_pacing", label: "Pay Pacing" },
  { key: "cost_efficiency", label: "Cost-Efficiency" },
];
const TEAM_DOT: Record<string, string> = { blue: "bg-blue-500", amber: "bg-amber-400", green: "bg-emerald-500" };

export default function StoreSettingsPage() {
  const [data, setData] = useState<DealerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.get<DealerData>("/dealer");
      setData({ name: d.name, store_config: d.store_config, team_counts: d.team_counts, weights: d.weights });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // update nested state immutably
  function patch(fn: (d: DealerData) => DealerData) {
    setData((prev) => (prev ? fn(structuredClone(prev)) : prev));
    setSavedAt(null);
  }
  const sc = (fn: (s: StoreConfig) => void) => patch((d) => { fn(d.store_config); return d; });

  const weightTotal = data ? WEIGHT_ROWS.reduce((s, r) => s + (data.weights[r.key] || 0), 0) : 0;
  const canSave = !!data && !saving && Math.abs(weightTotal - 100) < 0.01;

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      await api.put("/dealer/store-settings", {
        name: data.name,
        store_config: data.store_config,
        weights: data.weights,
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
      {/* header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Store Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Per-shop configuration — hours, teams, scoring weights, and display preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-[var(--good)]">Saved {savedAt}</span>}
          <button
            onClick={save}
            disabled={!canSave}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
              canSave ? "bg-[var(--good)] hover:brightness-110" : "cursor-not-allowed bg-[var(--surface-3)] text-[var(--text-faint)]",
            )}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {loading && <div className="pt-8"><Spinner label="Loading settings…" /></div>}
      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* ROW 1: shop profile + teams */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* SHOP PROFILE */}
            <Section title="Shop Profile">
              <Field label="Store Name">
                <input
                  className="input"
                  value={data.name}
                  onChange={(e) => patch((d) => { d.name = e.target.value; return d; })}
                />
              </Field>
              <Field label="Service Open">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="time" className="input w-32" value={data.store_config.hours.open}
                    onChange={(e) => sc((s) => { s.hours.open = e.target.value; })} />
                  <span className="text-sm text-[var(--text-muted)]">to</span>
                  <input type="time" className="input w-32" value={data.store_config.hours.close}
                    onChange={(e) => sc((s) => { s.hours.close = e.target.value; })} />
                  <span className="text-xs text-[var(--text-faint)]">drives the dashboard time scale</span>
                </div>
              </Field>
              <Field label="Days Open">
                <div className="flex gap-1.5">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => sc((s) => { s.days_open[i] = !s.days_open[i]; })}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold transition",
                        data.store_config.days_open[i]
                          ? "bg-[var(--brand)] text-white"
                          : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-faint)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Bays / Stalls">
                <input type="number" min={0} className="input w-24" value={data.store_config.bays}
                  onChange={(e) => sc((s) => { s.bays = Number(e.target.value); })} />
              </Field>
            </Section>

            {/* TEAMS */}
            <Section title="Teams" hint="routing groups for dispatch">
              <div className="space-y-3">
                {data.store_config.teams.map((t, i) => {
                  const count = teamCount(data.team_counts, t.name);
                  return (
                    <div key={i} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("h-2.5 w-2.5 rounded-full", TEAM_DOT[t.color] ?? "bg-[var(--text-faint)]")} />
                        <span className="font-semibold text-[var(--text)]">{t.name}</span>
                        <span className="text-sm text-[var(--text-muted)]">· {count} tech{count === 1 ? "" : "s"}</span>
                      </div>
                      <button
                        onClick={() => { const n = prompt("Team name", t.name); if (n) sc((s) => { s.teams[i].name = n; }); }}
                        className="text-sm font-semibold text-[var(--brand)] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => sc((s) => { s.teams.push({ name: "Team " + String.fromCharCode(65 + s.teams.length), color: "green" }); })}
                  className="pt-1 text-sm font-semibold text-[var(--brand)] hover:underline"
                >
                  + Add Team (for true team systems — Team A / B / C)
                </button>
              </div>
            </Section>
          </div>

          {/* TECHNICIAN LEVELS */}
          <Section title="Technician Levels" hint="labels & the bio specialty points each level earns">
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Higher levels get more <b>specialty points</b> to spend on their bio wheel, a higher <b>cap</b> per
              category (deeper mastery is allowed), and a <b>floor</b> so no area reads as zero. Lube techs use their
              own category set. These drive the specialty wheel on the Tech Bio page.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                    <th className="py-2 pr-3">Level Name</th>
                    <th className="px-3 py-2">Category Set</th>
                    <th className="px-3 py-2">Bio Points</th>
                    <th className="px-3 py-2">Floor</th>
                    <th className="px-3 py-2">Cap</th>
                    <th className="w-8 py-2 pl-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.store_config.tech_levels.map((lv, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-3">
                        <input className="input" value={lv.name}
                          onChange={(e) => sc((s) => { s.tech_levels[i].name = e.target.value; })} />
                      </td>
                      <td className="px-3 py-2">
                        <select className="input" value={lv.set}
                          onChange={(e) => sc((s) => { s.tech_levels[i].set = e.target.value; })}>
                          <option>Main Shop</option>
                          <option>Lube</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <NumCell value={lv.bio_points} onChange={(v) => sc((s) => { s.tech_levels[i].bio_points = v; })} />
                      </td>
                      <td className="px-3 py-2">
                        <NumCell value={lv.floor} onChange={(v) => sc((s) => { s.tech_levels[i].floor = v; })} />
                      </td>
                      <td className="px-3 py-2">
                        <NumCell value={lv.cap} onChange={(v) => sc((s) => { s.tech_levels[i].cap = v; })} />
                      </td>
                      <td className="py-2 pl-3 text-center">
                        <button
                          onClick={() => sc((s) => { s.tech_levels.splice(i, 1); })}
                          className="text-[var(--danger)] hover:brightness-110"
                          aria-label="Remove level"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4">
              <button className="text-sm font-semibold text-[var(--brand)] hover:underline"
                onClick={() => sc((s) => { s.tech_levels.push({ name: "New Level", set: "Main Shop", bio_points: 400, floor: 30, cap: 85 }); })}>
                + Add Main Shop level
              </button>
              <button className="text-sm font-semibold text-[var(--brand)] hover:underline"
                onClick={() => sc((s) => { s.tech_levels.push({ name: "New Lube Level", set: "Lube", bio_points: 400, floor: 35, cap: 88 }); })}>
                + Add Lube level
              </button>
            </div>
          </Section>

          {/* MATCH SCORE WEIGHTS */}
          <Section title="Match Score Weights" hint="how the engine ranks techs for each RO · must total 100">
            <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
              {WEIGHT_ROWS.map((r) => (
                <div key={r.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-[var(--text)]">{r.label}</span>
                  <input
                    type="range" min={0} max={40} value={data.weights[r.key]}
                    onChange={(e) => patch((d) => { d.weights[r.key] = Number(e.target.value); return d; })}
                    className="flex-1 accent-[var(--brand)]"
                  />
                  <span className="w-7 text-right font-mono text-sm font-bold tabular-nums text-[var(--text)]">
                    {data.weights[r.key]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3">
              <span className="font-bold text-[var(--text)]">Total</span>
              <span className={cn("ml-auto font-mono text-2xl font-extrabold tabular-nums",
                Math.abs(weightTotal - 100) < 0.01 ? "text-[var(--good)]" : "text-[var(--danger)]")}>
                {weightTotal}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Bio carries extra weight automatically for new hires (decays as RO history builds). Adjust during beta as results come in.
            </p>
            {Math.abs(weightTotal - 100) > 0.01 && (
              <p className="mt-1 text-xs font-medium text-[var(--danger)]">Weights must total 100 to save (currently {weightTotal}).</p>
            )}
          </Section>

          {/* DASHBOARD PREFERENCES */}
          <Section title="Dashboard Preferences">
            <div className="max-w-xl space-y-4">
              <Field label="Tech sort" inline>
                <select className="input w-64" value={data.store_config.dashboard.tech_sort}
                  onChange={(e) => sc((s) => { s.dashboard.tech_sort = e.target.value; })}>
                  <option value="priority_team">Priority within team (default)</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="availability">Soonest available</option>
                  <option value="workload">Lightest workload</option>
                </select>
              </Field>
              <Field label="Default time window" inline>
                <select className="input w-64" value={data.store_config.dashboard.time_window}
                  onChange={(e) => sc((s) => { s.dashboard.time_window = e.target.value; })}>
                  <option value="full_day">Full Day (7a–7p)</option>
                  <option value="morning">Morning (7a–12p)</option>
                  <option value="afternoon">Afternoon (12p–7p)</option>
                  <option value="next_4h">Next 4 hours</option>
                </select>
              </Field>
              <Field label="&quot;Finishing soon&quot; alert" inline>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} className="input w-20" value={data.store_config.dashboard.finishing_soon_min}
                    onChange={(e) => sc((s) => { s.dashboard.finishing_soon_min = Number(e.target.value); })} />
                  <span className="text-xs text-[var(--text-muted)]">minutes before an RO ends (no next queued)</span>
                </div>
              </Field>
              <Toggle label="Group techs by team" checked={data.store_config.dashboard.group_by_team}
                onChange={(v) => sc((s) => { s.dashboard.group_by_team = v; })} />
              <Toggle label="Show off-shift techs by default" checked={data.store_config.dashboard.show_off_shift}
                onChange={(v) => sc((s) => { s.dashboard.show_off_shift = v; })} />
            </div>
            <p className="mt-4 text-xs text-[var(--text-faint)]">
              Scoreboard display, goals, and manual data entry now live under <b className="text-[var(--text-muted)]">Scoreboard Settings</b>.
            </p>
          </Section>

          {/* DMS CONNECTION (real myKaarma link — kept from the live connector) */}
          <Section title="DMS Connection" hint="live data source">
            <MyKaarmaStatus />
          </Section>
        </div>
      )}
    </div>
  );
}

// ---------- small building blocks ----------
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

function Field({ label, children, inline }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <div className={cn("mb-4 last:mb-0", inline ? "flex items-center gap-4" : "grid gap-1.5 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4")}>
      <label className="text-sm font-medium text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: label }} />
      <div>{children}</div>
    </div>
  );
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" className="input w-24 text-center" value={value}
      onChange={(e) => onChange(Number(e.target.value))} />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-[var(--good)]" : "bg-[var(--surface-3)]")}
        role="switch"
        aria-checked={checked}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

// team headcount: the config name ("Lube Team") may differ from the tech.team
// value ("Lube"), so match on a normalized prefix.
function teamCount(counts: Record<string, number>, teamName: string): number {
  if (counts[teamName] != null) return counts[teamName];
  const norm = teamName.toLowerCase().replace(/\s*team\s*/g, "").trim();
  for (const [k, v] of Object.entries(counts)) {
    const kn = k.toLowerCase().replace(/\s*team\s*/g, "").trim();
    if (kn === norm || kn.startsWith(norm) || norm.startsWith(kn)) return v;
  }
  return 0;
}
