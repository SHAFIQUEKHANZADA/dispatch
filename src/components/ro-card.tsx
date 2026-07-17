"use client";

import { useState } from "react";
import type { BoardRO, Candidate } from "@/lib/types";
import { Avatar, Button, Card, FlagBadge, PriorityChip, ScoreBar, cn } from "./ui";
import { WhyPanel } from "./why-panel";
import { certLabel, fmtTimeShort, vehicleLabel } from "@/lib/format";

export function ROCard({
  ro,
  onDispatch,
}: {
  ro: BoardRO;
  onDispatch: (ro: BoardRO, cand: Candidate, rank: number) => void;
}) {
  const [why, setWhy] = useState<Candidate | null>(null);
  const ranking = ro.ranking;
  const top = ranking?.candidates ?? [];

  return (
    <Card className="overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[var(--brand)]">
              RO #{ro.ro_number}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {vehicleLabel(ro)}
              {ro.mileage ? ` · ${ro.mileage.toLocaleString()} mi` : ""}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ro.flags.map((f) => (
              <FlagBadge key={f} flag={f} />
            ))}
            {ro.required_team && (
              <span className="inline-flex items-center rounded border border-[var(--border-strong)] bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {ro.required_team} TEAM
              </span>
            )}
            <PriorityChip priority={ro.priority} />
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-muted)]">
          <div>Written {fmtTimeShort(ro.written_at)}</div>
          <div className={ro.promise_at ? "text-[var(--text)]" : ""}>
            Promise {ro.promise_at ? fmtTimeShort(ro.promise_at) : "—"}
          </div>
        </div>
      </div>

      {/* concern lines + meta */}
      <div className="px-4 py-3">
        <ul className="space-y-0.5">
          {ro.lines.map((ln, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm">
              <span className="text-[var(--text-faint)]">•</span>
              <span>{ln.description}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <Meta k="Concern" v={ro.concern_category ?? "—"} />
          <Meta k="Tier" v={ro.tier ?? "—"} />
          <Meta k="Est" v={`${ro.est_hours} hr`} />
          <Meta
            k="Cert"
            v={ro.required_certs.length ? ro.required_certs.map(certLabel).join(", ") : "None"}
          />
          {ro.required_team && <Meta k="Team" v={ro.required_team} />}
        </div>
      </div>

      {/* recommended techs */}
      <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            {ranking === null ? "Technician ranking" : "Recommended Technicians"}
          </span>
          {ranking !== null && (
            <span className="text-[10px] text-[var(--text-faint)]">Click a score to see why</span>
          )}
        </div>

        {ranking === null ? (
          <NotRanked status={ro.status} />
        ) : top.length === 0 ? (
          <NoEligible ranking={ranking} />
        ) : (
          <div className="space-y-1.5">
            {top.map((c, i) => (
              <TechRow
                key={c.technician_id}
                cand={c}
                rank={i + 1}
                onWhy={() => setWhy(c)}
                onDispatch={() => onDispatch(ro, c, i + 1)}
              />
            ))}
            {ranking && ranking.not_eligible.length > 0 && (
              <details className="pt-1">
                <summary className="cursor-pointer text-[11px] text-[var(--text-faint)] hover:text-[var(--text-muted)]">
                  {ranking.not_eligible.length} not eligible
                </summary>
                <ul className="mt-1.5 space-y-1 pl-1">
                  {ranking.not_eligible.map((n) => (
                    <li key={n.technician_id} className="text-[11px] text-[var(--text-faint)]">
                      <span className="text-[var(--text-muted)]">{n.name}</span> — {n.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <WhyPanel
        candidate={why}
        roLabel={`RO #${ro.ro_number}`}
        open={why !== null}
        onClose={() => setWhy(null)}
      />
    </Card>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <span>
      <span className="text-[var(--text-faint)]">{k}:</span>{" "}
      <span className="text-[var(--text)]">{v}</span>
    </span>
  );
}

function TechRow({
  cand,
  rank,
  onWhy,
  onDispatch,
}: {
  cand: Candidate;
  rank: number;
  onWhy: () => void;
  onDispatch: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-1.5",
        cand.best_fit ? "bg-emerald-50 ring-1 ring-[var(--good)]/40" : "",
      )}
    >
      <span className="w-4 text-center font-mono text-xs text-[var(--text-faint)]">{rank}</span>
      <Avatar name={cand.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{cand.name}</span>
          {cand.best_fit && (
            <span className="rounded bg-[var(--good)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#04140a]">
              Best Fit
            </span>
          )}
          {!cand.confident && (
            <span className="rounded border border-[var(--warn)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--warn)]">
              Building Sample
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-[var(--text-muted)]">{cand.level}</div>
      </div>
      <ScoreBar score={cand.score} confident={cand.confident} onClick={onWhy} />
      <Button size="sm" variant="primary" onClick={onDispatch}>
        Dispatch
      </Button>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  PENDING_AUTHORIZATION: "Pending Authorization",
  WAITING_ON_PARTS: "Waiting on Parts",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

// An RO that isn't Ready to Dispatch is deliberately NOT ranked — recommending a
// tech for a job that's still waiting on parts or authorization is advice nobody
// can act on. Say that plainly instead of implying nobody is eligible.
function NotRanked({ status }: { status: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/60 px-3 py-3 text-center">
      <div className="text-sm font-medium text-[var(--text-muted)]">
        Not ranked yet — this RO is{" "}
        <span className="text-[var(--text)]">{STATUS_LABEL[status] ?? status}</span>
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-faint)]">
        Technicians are ranked once the RO moves to <strong>Ready to Dispatch</strong>.
      </div>
    </div>
  );
}

function NoEligible({ ranking }: { ranking: BoardRO["ranking"] }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-3 text-center">
      <div className="text-sm font-medium text-[var(--warn)]">No eligible technician</div>
      {ranking && ranking.not_eligible.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-left text-[11px] text-[var(--text-faint)]">
          {ranking.not_eligible.slice(0, 6).map((n) => (
            <li key={n.technician_id}>
              <span className="text-[var(--text-muted)]">{n.name}</span> — {n.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
