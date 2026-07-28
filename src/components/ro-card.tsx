"use client";

import type { BoardRO, Candidate } from "@/lib/types";
import { Button, Card, FlagBadge, PriorityChip, cn } from "./ui";
import { certLabel, fmtTimeShort, vehicleLabel } from "@/lib/format";

export function ROCard({
  ro,
  onDispatch,
}: {
  ro: BoardRO;
  onDispatch: (ro: BoardRO, cand: Candidate, rank: number) => void;
}) {
  const ranking = ro.ranking;
  const top = ranking?.candidates ?? [];

  return (
    <Card className="overflow-visible">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-[var(--brand)]">
              RO #{ro.ro_number}
            </span>
            <span className="text-sm font-medium text-[var(--text)]">
              {vehicleLabel(ro)}
              {ro.mileage ? (
                <span className="text-[var(--text-muted)]"> · {ro.mileage.toLocaleString()} mi</span>
              ) : ""}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
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
        </div>
        <div className="text-right text-xs text-[var(--text-muted)]">
          Written {fmtTimeShort(ro.written_at)} · Promise{" "}
          <span className="text-[var(--text)]">{ro.promise_at ? fmtTimeShort(ro.promise_at) : "EOD"}</span>
        </div>
      </div>

      {/* body: concern (left) + recommended techs (right) */}
      <div className="grid gap-4 px-4 py-3 md:grid-cols-[minmax(0,320px)_1fr]">
        {/* left — concern */}
        <div>
          <ul className="space-y-0.5">
            {ro.lines.map((ln, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-[var(--text-faint)]">•</span>
                <span>{ln.description}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <div><Meta k="Concern" v={ro.concern_category ?? "—"} /> · <Meta k="Tier" v={ro.tier ?? "—"} /></div>
            <div><Meta k="Est" v={`${ro.est_hours} hr`} /> · <Meta k="Cert" v={ro.required_certs.length ? ro.required_certs.map(certLabel).join(", ") : "None"} /></div>
          </div>
        </div>

        {/* right — recommended techs */}
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Recommended Technicians
          </div>

          {ranking === null ? (
            <NotRanked status={ro.status} />
          ) : top.length === 0 ? (
            <NoEligible ranking={ranking} />
          ) : (
            <div className="space-y-1.5">
              {top.map((c, i) => (
                <TechRow key={c.technician_id} cand={c} rank={i + 1} onDispatch={() => onDispatch(ro, c, i + 1)} />
              ))}
              {ranking.not_eligible.length > 0 && (
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
      </div>
    </Card>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <span>
      <span className="text-[var(--text-faint)]">{k}:</span>{" "}
      <span className="font-medium text-[var(--text)]">{v}</span>
    </span>
  );
}

// score bar color by RANK — #1 green, #2 blue, #3 orange (matches the mockup)
const BAR_COLOR = ["#16a34a", "#2563eb", "#f59e0b"];

function TechRow({
  cand,
  rank,
  onDispatch,
}: {
  cand: Candidate;
  rank: number;
  onDispatch: () => void;
}) {
  const color = cand.confident ? BAR_COLOR[Math.min(rank - 1, 2)] : "var(--text-faint)";
  return (
    <div className="group relative flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-[var(--surface-2)]">
      <span className="w-3 text-center font-mono text-xs text-[var(--text-faint)]">{rank}</span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: hue(cand.name) }}>
        {initials(cand.name)}
      </span>
      <div className="w-32 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-[var(--text)]">{cand.name}</span>
          {cand.best_fit && (
            <span className="shrink-0 rounded bg-[var(--good)] px-1 py-0.5 text-[8px] font-bold uppercase text-white">
              Best Fit
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-[var(--text-muted)]">{cand.level}</div>
      </div>

      {/* score bar */}
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full" style={{ width: `${cand.score}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-mono text-lg font-bold tabular-nums" style={{ color }}>
        {cand.score}
      </span>
      <Button size="sm" variant="primary" onClick={onDispatch}>
        Dispatch
      </Button>

      {/* hover WHY tooltip */}
      <WhyTooltip cand={cand} />
    </div>
  );
}

// Dark tooltip that appears on hover, matching the mockup — the reasons come
// straight from the deterministic engine (real, not written for the demo).
function WhyTooltip({ cand }: { cand: Candidate }) {
  return (
    <div className="pointer-events-none absolute right-full top-1/2 z-40 mr-3 hidden w-[340px] -translate-y-1/2 group-hover:block">
      <div className="relative rounded-2xl bg-[#111c2e] p-4 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-4">
          <div className="shrink-0 border-r border-white/10 pr-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#60a5fa]">Why?</div>
            <div className="my-0.5 font-mono text-3xl font-extrabold leading-none" style={{ color: cand.confident ? "#4ade80" : "#cbd5e1" }}>
              {cand.score}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Match</div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5 text-[12px] leading-snug">
            {cand.reasons
              .filter((r) => r.text)
              .slice(0, 6)
              .map((r, k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-px text-emerald-400">✓</span>
                  <span className="text-white/90">{r.text}</span>
                </li>
              ))}
            {cand.warnings.map((w, k) => (
              <li key={`w${k}`} className="flex gap-2">
                <span className="mt-px font-bold text-amber-400">!</span>
                <span className="text-amber-200">{w}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* pointer */}
        <span className="absolute left-full top-1/2 -translate-y-1/2 border-[9px] border-transparent border-l-[#111c2e]" />
      </div>
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

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 45%)`;
}
