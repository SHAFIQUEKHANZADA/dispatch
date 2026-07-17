"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { MetricValue, Scoreboard, Scorecard } from "@/lib/types";
import { Card, GuardianBanner, Modal, Spinner, cn } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const PERIODS = ["DAILY", "MTD", "T90"];
const METRIC_ORDER = [
  "efficiency",
  "productivity",
  "utilization",
  "promise_pct",
  "comeback_rate",
  "first_time_fix",
];

interface Drill {
  technician_id: string;
  period: string;
  metric: string;
  formula: string | null;
  rows: {
    ro_number: string;
    closed_at: string | null;
    op_code: string | null;
    concern_category: string | null;
    flagged_hours: number;
    actual_clocked_hours: number;
    labor_type: string | null;
    made_promise: boolean | null;
    counted: boolean;
    exclusion_reason: string | null;
  }[];
  counted_rows: number;
  excluded_rows: number;
}

export default function ScoreboardPage() {
  const [period, setPeriod] = useState("MTD");
  const [data, setData] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<Scoreboard>(`/scoreboard?period=${period}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [period]);

  async function openDrill(techId: string, metric: string) {
    try {
      const d = await api.get<Drill>(
        `/scoreboard/${techId}/drilldown?period=${period}&metric=${metric}`,
      );
      setDrill(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Technician Scoreboard</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Six metrics, every one with a published formula. Click any number to see the source ROs.
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                period === p
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <GuardianBanner
          stale={data.source_data_age_hours === null || data.source_data_age_hours > 48}
          ageHours={data.source_data_age_hours}
          thresholdHours={48}
        />
      )}

      {loading && <Spinner label="Computing metrics…" />}
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="text-xs text-[var(--text-faint)]">
            Period {fmtDate(data.period_start)} – {fmtDate(data.period_end)} · Gate to rank:{" "}
            ≥{data.gates.min_ros_to_rank} ROs or ≥{data.gates.min_flagged_hours_to_rank} flagged hrs
          </div>

          {/* --- mobile: one card per tech (a 8-column table is unusable on a phone) --- */}
          <div className="space-y-3 lg:hidden">
            {data.cards.map((c) => (
              <ScoreCardMobile
                key={c.technician_id}
                card={c}
                period={period}
                windows={data.metric_windows}
                labels={data.labels}
                onDrill={openDrill}
              />
            ))}
          </div>

          {/* --- desktop: table --- */}
          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-faint)]">
                  <th className="px-3 py-2.5 font-medium">Technician</th>
                  <th className="px-2 py-2.5 font-medium">Team / Level</th>
                  {METRIC_ORDER.map((m) => (
                    <th key={m} className="px-2 py-2.5 font-medium" title={data.formulas[m]}>
                      {data.labels[m]}
                      {!data.metric_windows[m].includes(period) && (
                        <span className="ml-1 text-[9px] text-[var(--text-faint)]">(n/a {period})</span>
                      )}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 font-medium">CP / War</th>
                </tr>
              </thead>
              <tbody>
                {data.cards.map((c) => (
                  <ScoreRow
                    key={c.technician_id}
                    card={c}
                    period={period}
                    windows={data.metric_windows}
                    lowerIsBetter={data.lower_is_better}
                    onDrill={openDrill}
                  />
                ))}
              </tbody>
            </table>
          </Card>

          {/* published formulas */}
          <Card className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Published formulas — nothing here is a black box
            </div>
            <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
              {METRIC_ORDER.map((m) => (
                <div key={m} className="flex justify-between gap-2">
                  <span className="text-[var(--text-muted)]">{data.labels[m]}</span>
                  <span className="text-right font-mono text-[var(--text-faint)]">
                    {data.formulas[m]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <DrillModal drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

// Mobile view of one technician's scorecard. Same numbers, same gates, same
// click-to-drilldown as the desktop table — just stacked so nothing runs off
// the screen. A service manager checks this on a phone on the shop floor.
function ScoreCardMobile({
  card,
  period,
  windows,
  labels,
  onDrill,
}: {
  card: Scorecard;
  period: string;
  windows: Record<string, string[]>;
  labels: Record<string, string>;
  onDrill: (techId: string, metric: string) => void;
}) {
  const applicable = METRIC_ORDER.filter((m) => windows[m].includes(period));
  return (
    <Card className={cn("p-4", !card.qualifies_for_ranking && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{card.name}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {card.skill_level ?? "—"} · {card.team ?? "—"}
          </div>
        </div>
        {!card.qualifies_for_ranking && (
          <span
            className="shrink-0 rounded border border-[var(--warn)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--warn)]"
            title={card.data_issues.join(" · ")}
          >
            Building sample
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {applicable.map((m) => {
          const mv = card.metrics[m];
          return (
            <div key={m} className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-[var(--text-faint)]">{labels[m]}</dt>
              <dd>
                {!mv || !mv.available ? (
                  <span
                    className="cursor-help text-xs text-[var(--warn)]"
                    title={mv?.issue ?? "unavailable"}
                  >
                    ⚠ n/a
                  </span>
                ) : (
                  <button
                    onClick={() => onDrill(card.technician_id, m)}
                    className="font-mono text-sm font-semibold tabular-nums text-[var(--text)] underline decoration-dotted underline-offset-2"
                    title={`${mv.numerator} ÷ ${mv.denominator} — tap for source ROs`}
                  >
                    {mv.value?.toFixed(1)}
                    {mv.unit === "percent" ? "%" : ""}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-muted)]">
        <span>
          ROs <span className="font-mono text-[var(--text)]">{card.ro_count}</span>
        </span>
        <span>
          CP / Warranty{" "}
          <span className="font-mono text-[var(--text)]">
            {card.cp_flagged_hours} / {card.warranty_flagged_hours}
          </span>{" "}
          hrs
        </span>
      </div>

      {card.data_issues.length > 0 && (
        <div className="mt-2 text-[11px] text-[var(--warn)]">⚠ {card.data_issues[0]}</div>
      )}
    </Card>
  );
}

function ScoreRow({
  card,
  period,
  windows,
  lowerIsBetter,
  onDrill,
}: {
  card: Scorecard;
  period: string;
  windows: Record<string, string[]>;
  lowerIsBetter: string[];
  onDrill: (techId: string, metric: string) => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border)]",
        !card.qualifies_for_ranking && "opacity-60",
      )}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{card.name}</span>
          {!card.qualifies_for_ranking && (
            <span
              className="rounded border border-[var(--warn)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--warn)]"
              title={card.data_issues.join(" · ")}
            >
              Building sample
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5 text-xs text-[var(--text-muted)]">
        {card.team} · {card.skill_level}
      </td>
      {METRIC_ORDER.map((m) => (
        <td key={m} className="px-2 py-2.5">
          <MetricCell
            mv={card.metrics[m]}
            applicable={windows[m].includes(period)}
            onClick={() => onDrill(card.technician_id, m)}
          />
        </td>
      ))}
      <td className="px-2 py-2.5 text-xs text-[var(--text-muted)]">
        <span className="font-mono">{card.cp_flagged_hours}</span>
        {" / "}
        <span className="font-mono">{card.warranty_flagged_hours}</span>
      </td>
    </tr>
  );
}

function MetricCell({
  mv,
  applicable,
  onClick,
}: {
  mv: MetricValue;
  applicable: boolean;
  onClick: () => void;
}) {
  if (!applicable) return <span className="text-[var(--text-faint)]">—</span>;
  if (!mv || !mv.available) {
    return (
      <span
        className="cursor-help text-xs text-[var(--warn)]"
        title={mv?.issue ?? "unavailable"}
      >
        ⚠ n/a
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className="font-mono tabular-nums hover:underline"
      title={`${mv.numerator} ÷ ${mv.denominator} — click for source ROs`}
    >
      {mv.value?.toFixed(1)}
      {mv.unit === "percent" ? "%" : ""}
    </button>
  );
}

function DrillModal({ drill, onClose }: { drill: Drill | null; onClose: () => void }) {
  if (!drill) return null;
  return (
    <Modal
      open={drill !== null}
      onClose={onClose}
      wide
      title={`Source ROs — ${drill.metric}`}
    >
      <div className="space-y-3">
        <div className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold">Formula:</span> {drill.formula}
          <span className="ml-3">
            {drill.counted_rows} counted · {drill.excluded_rows} excluded
          </span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--surface-2)] text-left text-[var(--text-faint)]">
              <tr>
                <th className="px-2 py-1.5">RO</th>
                <th className="px-2 py-1.5">Category</th>
                <th className="px-2 py-1.5">Op</th>
                <th className="px-2 py-1.5 text-right">Flagged</th>
                <th className="px-2 py-1.5 text-right">Clocked</th>
                <th className="px-2 py-1.5">Type</th>
                <th className="px-2 py-1.5">Counted</th>
              </tr>
            </thead>
            <tbody>
              {drill.rows.map((r, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-[var(--border)]",
                    !r.counted && "opacity-50",
                  )}
                >
                  <td className="px-2 py-1.5 font-mono text-[var(--brand)]">{r.ro_number}</td>
                  <td className="px-2 py-1.5">{r.concern_category}</td>
                  <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.op_code}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.flagged_hours}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.actual_clocked_hours}</td>
                  <td className="px-2 py-1.5">{r.labor_type}</td>
                  <td className="px-2 py-1.5">
                    {r.counted ? (
                      <span className="text-[var(--good)]">✓</span>
                    ) : (
                      <span className="text-[var(--text-faint)]" title={r.exclusion_reason ?? ""}>
                        excluded
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
