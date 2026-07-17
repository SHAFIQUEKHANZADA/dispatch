"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Board, BoardRO, Candidate } from "@/lib/types";
import { Button, GuardianBanner, Spinner } from "@/components/ui";
import { ROCard } from "@/components/ro-card";
import { DispatchModal } from "@/components/dispatch-modal";
import { SmartDecisionModal } from "@/components/smart-decision-modal";

export default function DispatchBoardPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState("READY_TO_DISPATCH");
  const [sort, setSort] = useState("flagged_written");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dispatchTarget, setDispatchTarget] = useState<{
    ro: BoardRO;
    cand: Candidate;
    rank: number;
  } | null>(null);
  const [smartOpen, setSmartOpen] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);

  // How many ROs the optimizer could actually plan, regardless of which tab is open.
  const readyCount =
    board?.tabs.find((t) => t.key === "READY_TO_DISPATCH")?.count ?? 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Board>(
        `/dispatch/board?status_filter=${tab}&sort=${sort}`,
      );
      setBoard(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tab, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Available ROs to Dispatch</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Pick an RO — techs are ranked by Match Score. Click a score to see why.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[var(--text-faint)]">Unassigned</div>
            <div className="font-mono text-lg font-bold text-[var(--warn)]">
              {board?.unassigned ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-faint)]">Available Techs</div>
            <div className="font-mono text-lg font-bold text-[var(--good)]">
              {board?.available_techs ?? "—"}
            </div>
          </div>
          {/* Nothing to plan => don't open a modal full of zeros. Say so, in place. */}
          <div className="relative">
            <Button
              variant="good"
              disabled={readyCount === 0}
              title={
                readyCount === 0
                  ? "No repair orders are ready for dispatch"
                  : `Plan ${readyCount} ready RO${readyCount === 1 ? "" : "s"} across the shop`
              }
              onClick={() => {
                if (readyCount === 0) {
                  setNudge("No repair orders are ready for dispatch.");
                  window.setTimeout(() => setNudge(null), 3500);
                  return;
                }
                setSmartOpen(true);
              }}
            >
              ⚡ Make Smart Decision
            </Button>
            {nudge && (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)] shadow-lg">
                {nudge}
              </div>
            )}
          </div>
        </div>
      </div>

      {board && (
        <GuardianBanner
          stale={board.guardian.stale}
          ageHours={board.guardian.source_data_age_hours}
          thresholdHours={board.guardian.staleness_threshold_hours}
        />
      )}

      {/* tabs + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-1">
          {board?.tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-[var(--brand)] text-[var(--text)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] font-mono">
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <label className="text-xs text-[var(--text-faint)]">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text)] outline-none"
          >
            {board?.sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sort === "flagged_written" && (
        <p className="-mt-2 text-[11px] text-[var(--text-faint)]">
          Flagged = customer waiting, heat case, comeback, or manager flag.
        </p>
      )}

      {/* the board */}
      {loading && <Spinner label="Scoring the board…" />}
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {board && !loading && board.ros.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-12 text-center text-sm text-[var(--text-muted)]">
          Nothing in this tab.
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {board?.ros.map((ro) => (
          <ROCard
            key={ro.id}
            ro={ro}
            onDispatch={(ro, cand, rank) => setDispatchTarget({ ro, cand, rank })}
          />
        ))}
      </div>

      <DispatchModal
        ro={dispatchTarget?.ro ?? null}
        cand={dispatchTarget?.cand ?? null}
        rank={dispatchTarget?.rank ?? 1}
        open={dispatchTarget !== null}
        onClose={() => setDispatchTarget(null)}
        onDone={() => {
          setDispatchTarget(null);
          load();
        }}
      />

      <SmartDecisionModal
        open={smartOpen}
        onClose={() => setSmartOpen(false)}
        onApplied={() => {
          setSmartOpen(false);
          load();
        }}
      />
    </div>
  );
}
