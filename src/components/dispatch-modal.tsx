"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BoardRO, Candidate } from "@/lib/types";
import { Button, Modal } from "./ui";

// Dispatch confirmation. If the dispatcher picked a LOWER-ranked tech we ask
// for an optional override reason (FR-4.7) — logged either way, and the
// override rate is a metric.
export function DispatchModal({
  ro,
  cand,
  rank,
  open,
  onClose,
  onDone,
}: {
  ro: BoardRO | null;
  cand: Candidate | null;
  rank: number;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; notify_status: string | null } | null>(null);

  if (!ro || !cand) return null;
  const isOverride = rank > 1;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ notify_status: string | null }>("/dispatch/assign", {
        ro_id: ro!.id,
        technician_id: cand!.technician_id,
        override_reason: isOverride && reason ? reason : null,
      });
      setReason("");
      // Show the notification outcome before closing, so the owner sees the tech was texted.
      setResult({ name: cand!.name, notify_status: res?.notify_status ?? null });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    setResult(null);
    onDone();
  }

  if (result) {
    const texted = result.notify_status === "sent" || result.notify_status === "delivered";
    return (
      <Modal open={open} onClose={finish} title={`Dispatched RO #${ro.ro_number}`}>
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--surface-2)] px-4 py-4 text-center">
            <div className="text-3xl">{texted ? "📱✅" : "✅"}</div>
            <div className="mt-2 text-sm font-semibold text-[var(--text)]">
              {result.name.split(" ")[0]} is assigned to RO #{ro.ro_number}
            </div>
            <div className="mt-1 text-xs">
              {texted ? (
                <span className="font-semibold text-emerald-600">Technician texted ✓ — notified instantly</span>
              ) : result.notify_status === "queued" ? (
                <span className="font-semibold text-amber-600">Notification pending (GHL not fully set up yet)</span>
              ) : (
                <span className="font-semibold text-rose-600">Text not sent — check the tech has a phone number on file</span>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={finish}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Dispatch RO #${ro.ro_number}`}>
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--surface-2)] px-4 py-3">
          <div className="text-sm">
            Assign to <span className="font-semibold">{cand.name}</span>{" "}
            <span className="text-[var(--text-muted)]">({cand.level})</span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Match score <span className="font-mono font-semibold text-[var(--text)]">{cand.score}</span>
            {" · "}ranked #{rank}
            {cand.best_fit && " · Best Fit"}
          </div>
        </div>

        {isOverride && (
          <div className="rounded-lg border border-[var(--warn)] bg-[var(--surface)] px-3 py-2.5">
            <div className="text-xs font-semibold text-[var(--warn)]">
              This is not the top recommendation (ranked #{rank}).
            </div>
            <label className="mt-2 block text-xs text-[var(--text-muted)]">
              Override reason (optional — logged for the audit trail)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Top tech tied up on a heat case"
                className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--brand)]"
              />
            </label>
          </div>
        )}

        {!cand.confident && (
          <div className="rounded-lg border border-[var(--warn)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--warn)]">
            This score is provisional — the tech&apos;s source data is incomplete. Dispatching is
            allowed, but the decision will be flagged in the audit log.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Dispatching…" : `Dispatch to ${cand.name.split(" ")[0]}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
