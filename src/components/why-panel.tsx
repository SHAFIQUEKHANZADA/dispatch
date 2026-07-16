"use client";

import { Modal } from "./ui";
import type { Candidate } from "@/lib/types";
import { scoreColor } from "@/lib/format";

const FACTOR_LABEL: Record<string, string> = {
  cert: "Certification",
  skill: "Skill match",
  familiarity: "Familiarity",
  performance: "Performance",
  availability: "Availability",
  promise: "Promise time",
  workload: "Workload",
  specialty: "Specialty",
};

const FACTOR_ICON: Record<string, string> = {
  cert: "🎓",
  skill: "🔧",
  familiarity: "📊",
  performance: "⚡",
  availability: "🕐",
  promise: "🎯",
  workload: "⚖️",
  specialty: "⭐",
};

// The WHY panel. This IS the product — a score the tech can reproduce by hand.
export function WhyPanel({
  candidate,
  roLabel,
  open,
  onClose,
}: {
  candidate: Candidate | null;
  roLabel: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!candidate) return null;
  const color = candidate.confident ? scoreColor(candidate.score) : "var(--text-faint)";

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        <span>
          Why {candidate.name} scored{" "}
          <span style={{ color }} className="font-mono">
            {candidate.score}
          </span>{" "}
          for {roLabel}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-4 py-3">
          <div>
            <div className="font-semibold">{candidate.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{candidate.level}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold" style={{ color }}>
              {candidate.score}
            </div>
            {candidate.best_fit && (
              <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--good)]">
                Best Fit
              </div>
            )}
          </div>
        </div>

        {!candidate.confident && (
          <div className="rounded-lg border border-[var(--warn)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--warn)]">
            <span className="font-semibold">Provisional score — Guardian flagged the source data:</span>
            <ul className="mt-1 list-disc pl-4">
              {candidate.data_issues.map((i, k) => (
                <li key={k}>{i}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            The math (adds up to the score)
          </div>
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {candidate.reasons.map((r, k) => (
              <div key={k} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 w-5 text-center" aria-hidden>
                  {FACTOR_ICON[r.factor] ?? "•"}
                </span>
                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                    {FACTOR_LABEL[r.factor] ?? r.factor}
                  </div>
                  <div className="text-sm text-[var(--text)]">{r.text}</div>
                </div>
                <div
                  className={`w-14 shrink-0 text-right font-mono text-sm tabular-nums ${
                    r.points > 0 ? "text-[var(--good)]" : "text-[var(--text-faint)]"
                  }`}
                >
                  {r.points > 0 ? `+${r.points.toFixed(1)}` : "—"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between px-3 text-sm">
            <span className="font-semibold">Total match score</span>
            <span className="font-mono text-lg font-bold" style={{ color }}>
              {candidate.score}
            </span>
          </div>
        </div>

        {candidate.warnings.length > 0 && (
          <div className="rounded-lg border border-[var(--warn)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--warn)]">
            <span className="font-semibold">Warnings</span>
            <ul className="mt-1 list-disc pl-4">
              {candidate.warnings.map((w, k) => (
                <li key={k}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[11px] text-[var(--text-faint)]">
          This score is a deterministic algorithm — not an AI guess. The same RO and the
          same shop state always produce this exact number.
        </p>
      </div>
    </Modal>
  );
}
