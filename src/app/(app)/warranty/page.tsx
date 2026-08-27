"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

type Result = "pass" | "needs_review" | "fail" | "na";
type Status = "pending" | "pass" | "needs_review" | "fail";

interface Finding {
  check: string;
  result: Result;
  dom_section: string;
  reason: string;
}
interface Audit {
  id: string;
  ro_number: string;
  vin: string | null;
  technician_id: string | null;
  job_line_type: string | null;
  source_ro_id: string | null;
  audit_status: Status;
  findings: Finding[];
  reviewer_decision: "not_reviewed" | "confirmed" | "overridden";
  reviewer_notes: string | null;
  submitted: boolean;
  date_submitted: string | null;
  created_at: string | null;
  updated_at: string | null;
}
interface ListResp {
  audits: Audit[];
  counts: Record<string, number>;
  anthropic_configured: boolean;
  ghl_configured: boolean;
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  fail: { label: "Fail", cls: "bg-rose-100 text-rose-700" },
  needs_review: { label: "Needs Review", cls: "bg-amber-100 text-amber-800" },
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
  pass: { label: "Pass", cls: "bg-emerald-100 text-emerald-700" },
};
const RESULT_META: Record<Result, { label: string; cls: string }> = {
  fail: { label: "Fail", cls: "bg-rose-100 text-rose-700" },
  needs_review: { label: "Needs Review", cls: "bg-amber-100 text-amber-800" },
  pass: { label: "Pass", cls: "bg-emerald-100 text-emerald-700" },
  na: { label: "N/A", cls: "bg-slate-100 text-slate-500" },
};

function fmtD(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function WarrantyPage() {
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<Audit | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<ListResp>("/warranty/audits"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function runBatch() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await api.post<{ message: string }>("/warranty/audit/batch");
      setNote(r.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const audits = data?.audits ?? [];
  const c = data?.counts ?? {};

  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Warranty Audit</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Audits each RO&apos;s warranty documentation before it goes to Honda/Acura. A check is never
            silently passed — missing data is flagged <b>Needs Review</b> with a reason.
          </p>
        </div>
        <button
          onClick={runBatch}
          disabled={busy || !(data?.anthropic_configured ?? true)}
          className="shrink-0 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Auditing…" : "Audit warranty ROs"}
        </button>
      </div>

      {data && !data.anthropic_configured && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Auditor not connected.</b> Add <code>ANTHROPIC_API_KEY</code> to the backend&apos;s <code>.env</code> and
          restart the API to run audits. Everything else is ready.
        </div>
      )}
      {note && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{note}</div>}
      {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}

      {/* stat cards */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Stat n={c.fail ?? 0} label="Fail" color="text-rose-600" />
        <Stat n={c.needs_review ?? 0} label="Needs Review" color="text-amber-600" />
        <Stat n={c.pending ?? 0} label="Pending" color="text-slate-500" />
        <Stat n={c.pass ?? 0} label="Pass" color="text-emerald-600" />
      </div>

      {loading && <div className="pt-8"><Spinner label="Loading warranty audits…" /></div>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                <Th className="w-28">RO #</Th>
                <Th className="w-56">Vehicle / VIN</Th>
                <Th className="w-36">Job Line Type</Th>
                <Th className="w-32 text-center">Status</Th>
                <Th className="w-32">Reviewer</Th>
                <Th className="w-32">Audited</Th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/60"
                >
                  <td className="px-3 py-3 align-top font-semibold text-[var(--text)]">{a.ro_number}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="text-[var(--text)]">{a.vin || "—"}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-[var(--text-muted)]">{a.job_line_type || "—"}</td>
                  <td className="px-3 py-3 text-center align-top"><StatusBadge s={a.audit_status} /></td>
                  <td className="px-3 py-3 align-top text-xs">
                    {a.reviewer_decision === "not_reviewed"
                      ? <span className="text-[var(--text-faint)]">—</span>
                      : <span className={a.reviewer_decision === "overridden" ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>
                          {a.reviewer_decision}{a.submitted ? " · submitted" : ""}
                        </span>}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-[var(--text-muted)]">{fmtD(a.updated_at)}</td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">
                  No audits yet. Click <b>Audit warranty ROs</b> to run the checks on your open ROs.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Drawer
          audit={selected}
          onClose={() => setSelected(null)}
          onReviewed={async () => { await load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

function Drawer({ audit, onClose, onReviewed }: { audit: Audit; onClose: () => void; onReviewed: () => void }) {
  const [notes, setNotes] = useState(audit.reviewer_notes ?? "");
  const [submit, setSubmit] = useState(audit.submitted);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function review(decision: "confirmed" | "overridden") {
    if (decision === "overridden" && !notes.trim()) {
      setErr("A note is required to override the audit result.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/warranty/${audit.id}/review`, { decision, notes: notes.trim() || null, submitted: submit });
      onReviewed();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : String(e));
      setBusy(false);
    }
  }

  const needsReview = audit.findings.filter((f) => f.result === "needs_review");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-[560px] overflow-y-auto bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text)]">RO {audit.ro_number}</h2>
              <StatusBadge s={audit.audit_status} />
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">
              {audit.job_line_type || "Unknown type"}{audit.vin ? ` · ${audit.vin}` : ""}
              {audit.technician_id ? ` · tech ${audit.technician_id}` : ""}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]">✕</button>
        </div>

        <div className="px-5 py-4">
          {needsReview.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <b>{needsReview.length} check{needsReview.length > 1 ? "s" : ""} need a human look</b> — the RO data didn&apos;t show what
              these checks require.
            </div>
          )}

          {/* the 12 checks */}
          <div className="space-y-2">
            {audit.findings.map((f, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{f.check}</span>
                  <ResultBadge r={f.result} />
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{f.reason}</p>
                {f.dom_section && (
                  <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">DOM: {f.dom_section}</p>
                )}
              </div>
            ))}
          </div>

          {/* review controls */}
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Reviewer note {audit.reviewer_decision === "overridden" ? "(required to override)" : "(required to override)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Why are you overriding, or anything Don should know…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--brand)]"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--text)]">
              <input type="checkbox" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />
              Mark submitted to manufacturer
            </label>

            {err && <div className="mt-3 rounded-lg border border-[var(--danger)] bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{err}</div>}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => review("confirmed")}
                disabled={busy}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => review("overridden")}
                disabled={busy}
                className="flex-1 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Override
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const m = STATUS_META[s];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", m.cls)}>{m.label}</span>;
}
function ResultBadge({ r }: { r: Result }) {
  const m = RESULT_META[r];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", m.cls)}>{m.label}</span>;
}
function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="w-[150px] shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className={cn("text-2xl font-extrabold tabular-nums", color)}>{n}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2.5 font-bold", className)}>{children}</th>;
}
