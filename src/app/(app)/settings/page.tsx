"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TechOptions, Technician } from "@/lib/types";
import { Button, Spinner, cn } from "@/components/ui";
import { TechnicianForm } from "@/components/technician-form";

interface AseAdded { code: string; label: string; attachment?: string }
interface Training { label: string; attachment?: string }
interface SelfRating { label: string; from: number; to: number }
interface Bio {
  kind: string;
  submitted_label: string;
  ase_current: string[];
  ase_added: AseAdded[];
  honda_training?: Training | null;
  self_ratings: SelfRating[];
  career_goal?: string;
  impact?: string;
  cert_proof?: string;
}
interface BioUpdate { id: string; name: string; role_label: string; submitted_label: string; bio: Bio }
interface RosterTech {
  id: string;
  name: string;
  role_label: string;
  team_label: string;
  hourly_rate: number | null;
  cert_badges: string[];
  bio_status: string;
  bio_reviewed_label: string | null;
  has_pending_bio: boolean;
}

export default function TechSettingsPage() {
  const [updates, setUpdates] = useState<BioUpdate[]>([]);
  const [roster, setRoster] = useState<RosterTech[]>([]);
  const [options, setOptions] = useState<TechOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Technician | "new" | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bu, r, o] = await Promise.all([
        api.get<{ pending: number; updates: BioUpdate[] }>("/technicians/bio-updates"),
        api.get<{ technicians: RosterTech[] }>("/technicians"),
        api.get<TechOptions>("/technicians/options"),
      ]);
      setUpdates(bu.updates);
      setRoster(r.technicians.filter((t) => t.hourly_rate !== null || t.bio_status));
      setOptions(o);
      // the newest submission opens expanded, like the mockup
      setExpanded(new Set(bu.updates.slice(0, 1).map((u) => u.id)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "request-changes") {
    setActing(id + action);
    try {
      await api.post(`/technicians/${id}/bio/${action}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setActing(null);
    }
  }

  if (editing && options) {
    return (
      <div className="px-5 py-5">
        <TechnicianForm
          technician={editing === "new" ? null : editing}
          options={options}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      </div>
    );
  }

  const teams = new Set(roster.map((t) => t.team_label));

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Tech Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage technician profiles, certifications, schedules — and approve bio updates.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing("new")}>+ Add Technician</Button>
      </div>

      {loading && <div className="pt-8"><Spinner label="Loading technicians…" /></div>}
      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* BIO UPDATES AWAITING APPROVAL */}
          {updates.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text)]">Bio Updates Awaiting Your Approval</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">{updates.length} Pending</span>
              </div>
              <div className="space-y-3">
                {updates.map((u) => (
                  <BioUpdateCard
                    key={u.id}
                    u={u}
                    open={expanded.has(u.id)}
                    onToggle={() => setExpanded((prev) => { const n = new Set(prev); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })}
                    onAct={(a) => act(u.id, a)}
                    busy={acting?.startsWith(u.id) ?? false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* TECHNICIAN ROSTER */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text)]">Technician Roster</h2>
              <span className="text-xs text-[var(--text-faint)]">{roster.length} techs · {teams.size} teams</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-strong)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Team</th>
                    <th className="px-3 py-3 text-right">$ / Hr</th>
                    <th className="px-3 py-3">Certifications</th>
                    <th className="px-3 py-3">Bio Status</th>
                    <th className="px-3 py-3">Last Reviewed</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: hue(t.name) }}>{initials(t.name)}</span>
                          <span className="font-semibold text-[var(--text)]">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">{t.role_label}</td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">{t.team_label}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{t.hourly_rate != null ? `$${t.hourly_rate}` : "—"}</td>
                      <td className="px-3 py-3">
                        {t.cert_badges.length === 0 ? (
                          <span className="text-[var(--text-faint)]">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {t.cert_badges.map((c) => <CertBadge key={c} label={c} />)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase", t.bio_status === "pending" ? "bg-amber-100 text-amber-700" : t.bio_status === "changes_requested" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                          {t.bio_status === "pending" ? "Pending" : t.bio_status === "changes_requested" ? "Changes Req." : "Approved"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">{t.bio_reviewed_label ?? (t.bio_status === "pending" ? "Pending" : "—")}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setEditing(t as unknown as Technician)} className="text-sm font-semibold text-[var(--brand)] hover:underline">View Bio</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function BioUpdateCard({ u, open, onToggle, onAct, busy }: {
  u: BioUpdate; open: boolean; onToggle: () => void;
  onAct: (a: "approve" | "reject" | "request-changes") => void; busy: boolean;
}) {
  const b = u.bio;
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-[var(--surface)]", open ? "border-[var(--border)] border-l-4 border-l-amber-400" : "border-[var(--border)]")}>
      {/* header row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: hue(u.name) }}>{initials(u.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[var(--text)]">{u.name}</span>
            <span className="text-sm text-[var(--text-muted)]">· {u.role_label}</span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">{b.kind} · submitted {b.submitted_label}</div>
        </div>
        {open ? (
          <span className="rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Needs Approval</span>
        ) : (
          <Button variant="good" size="sm" onClick={onToggle}>Review</Button>
        )}
      </div>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-4">
          <dl className="space-y-3">
            <BioRow label="ASE Certifications">
              <span className="font-semibold text-[var(--text)]">{b.ase_current.join(", ")}</span>
              {b.ase_added.map((a) => (
                <span key={a.code} className="ml-2 inline-flex items-center gap-2">
                  <span className="text-[var(--text-faint)]">+</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-700">{a.code} — {a.label}</span>
                  {a.attachment && <Attachment name={a.attachment} />}
                </span>
              ))}
            </BioRow>
            {b.honda_training && (
              <BioRow label="Honda Training">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-700">{b.honda_training.label}</span>
                {b.honda_training.attachment && <span className="ml-2 inline-block align-middle"><Attachment name={b.honda_training.attachment} /></span>}
              </BioRow>
            )}
            {b.self_ratings.map((r) => (
              <BioRow key={r.label} label={`Self-Rated: ${r.label}`}>
                <span className="inline-flex items-center gap-2">
                  <Stars n={r.from} muted />
                  <span className="text-[var(--text-faint)]">→</span>
                  <Stars n={r.to} />
                </span>
              </BioRow>
            ))}
            {b.career_goal && (
              <BioRow label="Career Goal">
                <span className="rounded bg-emerald-50 px-2 py-1 text-sm font-medium italic text-emerald-800">&quot;{b.career_goal}&quot;</span>
              </BioRow>
            )}
            {b.impact && (
              <BioRow label="Impact on scoring">
                <span className="text-sm text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: b.impact.replace(/Bio Baseline|HV jobs|Job-fit/g, (m) => `<b class='text-[var(--text)]'>${m}</b>`) }} />
              </BioRow>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="good" onClick={() => onAct("approve")} disabled={busy}>✓ Approve All</Button>
            <button onClick={() => onAct("request-changes")} disabled={busy} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">Request Changes</button>
            <button onClick={() => onAct("reject")} disabled={busy} className="rounded-lg border border-[var(--danger)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-red-50 disabled:opacity-50">Reject</button>
            <button onClick={onToggle} className="text-sm font-semibold text-[var(--brand)] hover:underline">View full bio →</button>
            {b.cert_proof && (
              <span className="ml-auto text-xs text-[var(--text-faint)]">Approved changes apply to scoring tonight. Cert proof attached for {b.cert_proof} items.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BioRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-3">
      <dt className="text-sm font-medium text-[var(--text-muted)]">{label}</dt>
      <dd className="text-sm text-[var(--text)]">{children}</dd>
    </div>
  );
}

function Attachment({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 align-middle text-xs text-[var(--brand)]">
      <span aria-hidden>📎</span>{name}
    </span>
  );
}

function Stars({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <span className={cn("tracking-tight", muted ? "text-[var(--text-faint)]" : "text-amber-500")}>
      {"★".repeat(n)}<span className="text-[var(--border-strong)]">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

function CertBadge({ label }: { label: string }) {
  const hv = label === "HV";
  const adas = label === "ADAS";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold",
      hv ? "bg-emerald-50 text-emerald-700" : adas ? "bg-violet-50 text-violet-700" : "bg-[var(--surface-3)] text-[var(--text-muted)]")}>
      {label}
    </span>
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
