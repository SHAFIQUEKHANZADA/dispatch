"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SmartPlan } from "@/lib/types";
import { Button, Modal, Spinner } from "./ui";

// "Make Smart Decision" — propose a shop-wide plan, show the projected gain, and
// apply ONLY on confirmation (FR-3.7). Every number in the gain is computed from
// the plan by the backend, not asserted.
export function SmartDecisionModal({
  open,
  onClose,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [plan, setPlan] = useState<SmartPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setError(null);
    setLoading(true);
    api
      .post<SmartPlan>("/dispatch/smart-decision/preview")
      .then(setPlan)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open]);

  async function apply() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/dispatch/smart-decision/apply", {
        assignments: plan.assignments.map((a) => ({
          ro_id: a.ro_id,
          technician_id: a.technician_id,
        })),
      });
      onApplied();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const g = plan?.gain;

  return (
    <Modal open={open} onClose={onClose} wide title="⚡ Make Smart Decision — proposed plan">
      {loading && <Spinner label="Optimizing the whole board…" />}
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {plan && g && (
        <div className="space-y-4">
          {/* projected gain */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="ROs assigned" value={`${g.ros_assigned}`} accent />
            <Stat label="Hours dispatched" value={`${g.hours_dispatched}`} />
            <Stat
              label="Promises protected"
              value={`${g.promises_protected}`}
              accent
            />
            <Stat label="Avg match score" value={`${g.avg_match_score}`} />
            <Stat
              label="Idle techs"
              value={`${g.idle_techs_before} → ${g.idle_techs_after}`}
              sub={g.idle_change_pct !== 0 ? `${g.idle_change_pct}%` : undefined}
            />
            <Stat
              label="Workload spread"
              value={`${g.workload_spread_before} → ${g.workload_spread_after}`}
              sub="std dev, lower is better"
            />
            <Stat
              label="Promises at risk"
              value={`${g.promises_at_risk_before} → ${g.promises_at_risk_after}`}
            />
            <Stat label="Unplaced" value={`${g.ros_unplaced}`} />
          </div>

          {/* the plan */}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Proposed assignments
            </div>
            <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {plan.assignments.map((a) => (
                <div key={a.ro_id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-mono text-[var(--brand)]">RO #{a.ro_number}</span>
                  <span className="flex-1 px-3 text-[var(--text-muted)]">→ {a.technician_name}</span>
                  <span className="font-mono text-[var(--text)]">{a.score}</span>
                  {a.rank > 1 && (
                    <span className="ml-2 text-[10px] text-[var(--warn)]">#{a.rank}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {plan.unplaced.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--warn)]">
                Could not place ({plan.unplaced.length})
              </div>
              <ul className="space-y-1 rounded-lg border border-[var(--warn)]/40 px-3 py-2 text-xs text-[var(--text-muted)]">
                {plan.unplaced.map((u) => (
                  <li key={u.ro_id}>
                    <span className="font-mono text-[var(--text)]">RO #{u.ro_number}</span> — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-faint)]">
              Nothing is applied until you confirm.
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="good"
                onClick={apply}
                disabled={busy || plan.assignments.length === 0}
              >
                {busy ? "Applying…" : `Apply plan (${plan.assignments.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div
        className={`font-mono text-lg font-bold ${accent ? "text-[var(--good)]" : "text-[var(--text)]"}`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--text-faint)]">{sub}</div>}
    </div>
  );
}
