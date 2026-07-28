"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

interface Row {
  no: number;
  ro_number: string;
  owner: string;
  license: string;
  ser_sale: string;
  description: string;
  status: "done" | "working" | "queued" | "to_dispatch" | "waiter";
  mechanic: string | null;
  hours: number;
  promised: string;
  carried_over: boolean;
  checks: Record<string, "ok" | "watch" | "behind" | null>;
}
interface Data {
  date_label: string;
  carried_count: number;
  new_count: number;
  rows: Row[];
  check_columns: string[];
  totals: { ros: number; done: number; in_process: number; queued: number; to_dispatch: number; hours: number };
}

const STATUS: Record<Row["status"], { label: string; dot: string; cls: string }> = {
  done: { label: "Done", dot: "✓", cls: "text-emerald-700" },
  working: { label: "Working", dot: "●", cls: "text-blue-600" },
  queued: { label: "Queued", dot: "○", cls: "text-emerald-600" },
  to_dispatch: { label: "To dispatch", dot: "◇", cls: "text-amber-600" },
  waiter: { label: "Waiter", dot: "⏱", cls: "text-orange-600" },
};

export default function RouteSheetPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Data>("/route-sheet"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-5 py-5 print:p-0">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Route Sheet</h1>
          <p className="text-sm text-[var(--text-muted)]">
            All ROs for the day in numerical order — carry-overs first, then new. Read-only view for the whole shop.
          </p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-1 py-1 text-sm">
            <button className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] hover:bg-[var(--surface-2)]">‹</button>
            <span className="px-2 font-semibold text-[var(--text)]">{data?.date_label ?? "—"}</span>
            <button className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] hover:bg-[var(--surface-2)]">›</button>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]"
          >
            Print
          </button>
        </div>
      </div>

      {loading && <div className="pt-8"><Spinner label="Building route sheet…" /></div>}
      {error && (
        <div className="mt-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] print:rounded-none print:border-0">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                <Th className="w-10 text-center">No</Th>
                <Th className="w-16">RO #</Th>
                <Th className="w-40">Owner's Name</Th>
                <Th className="w-24">License</Th>
                <Th className="w-16 text-center">Ser/Sale</Th>
                <Th>Description of Work</Th>
                <Th className="w-32">Mechanic</Th>
                <Th className="w-14 text-right">Hrs</Th>
                <Th className="w-20 text-center">Promised</Th>
                {data.check_columns.map((c) => (
                  <Th key={c} className="w-12 text-center">{c}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.carried_count > 0 && (
                <SectionRow color="bg-amber-400" label="Carried over from yesterday" count={data.carried_count} span={9 + data.check_columns.length} />
              )}
              {data.rows.filter((r) => r.carried_over).map((r) => (
                <RowLine key={r.ro_number} r={r} checks={data.check_columns} />
              ))}

              <SectionRow color="bg-blue-500" label="New today" count={data.new_count} span={9 + data.check_columns.length} />
              {data.rows.filter((r) => !r.carried_over).map((r) => (
                <RowLine key={r.ro_number} r={r} checks={data.check_columns} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-2)] font-semibold">
                <td colSpan={7} className="px-3 py-2.5 text-center text-[var(--text)]">
                  Totals — {data.totals.ros} ROs · {data.totals.done} done · {data.totals.in_process} in process · {data.totals.queued} queued · {data.totals.to_dispatch} to dispatch
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text)]">{data.totals.hours.toFixed(1)}</td>
                <td colSpan={1 + data.check_columns.length} />
              </tr>
            </tfoot>
          </table>

          {/* legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] px-3 py-2.5 text-[11px] text-[var(--text-muted)]">
            {(Object.keys(STATUS) as Row["status"][]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("font-bold", STATUS[k].cls)}>{STATUS[k].dot}</span>
                {STATUS[k].label}
              </span>
            ))}
            <span className="text-[var(--text-faint)]">— statuses mirror the live dashboard.</span>
            <span className="ml-auto text-[var(--text-faint)]">
              Check columns: <span className="text-emerald-600 font-bold">✓</span> on track ·{" "}
              <span className="text-amber-500 font-bold">◐</span> watch ·{" "}
              <span className="text-rose-500 font-bold">✕</span> behind — foreman updates each column at 10a / noon / 2p / 4p.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2.5 font-bold", className)}>{children}</th>;
}

function SectionRow({ color, label, count, span }: { color: string; label: string; count: number; span: number }) {
  return (
    <tr className="bg-[var(--surface-2)]/60">
      <td colSpan={span} className="px-3 py-1.5">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          <span className={cn("h-2 w-2 rounded-full", color)} />
          {label}
          <span className="rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] text-[var(--text-muted)]">{count}</span>
        </span>
      </td>
    </tr>
  );
}

function RowLine({ r, checks }: { r: Row; checks: string[] }) {
  const s = STATUS[r.status];
  const done = r.status === "done";
  const unassigned = !r.mechanic;
  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50">
      <td className="px-3 py-2 text-center tabular-nums text-[var(--text-faint)]">{r.no}</td>
      <td className={cn("px-3 py-2 font-mono font-bold", done ? "text-[var(--text-faint)]" : "text-[var(--brand)]")}>{r.ro_number}</td>
      <td className={cn("px-3 py-2", done ? "text-[var(--text-faint)]" : "text-[var(--text)]")}>{r.owner}</td>
      <td className={cn("px-3 py-2 font-mono text-xs", done ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]")}>{r.license}</td>
      <td className="px-3 py-2 text-center">
        <span className={cn("font-bold", r.ser_sale === "W" ? "text-orange-600" : r.ser_sale === "I" ? "text-violet-600" : "text-[var(--text-muted)]")}>
          {r.ser_sale}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-baseline gap-2">
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", statusPill(r.status))}>
            <span>{s.dot}</span>{s.label}
          </span>
          <span className={cn(done ? "text-[var(--text-muted)]" : "text-[var(--text)]")}>{r.description}</span>
        </span>
      </td>
      <td className="px-3 py-2">
        {unassigned ? (
          <span className="font-semibold italic text-[var(--danger)]">Unassigned</span>
        ) : (
          <span className={cn(done ? "text-[var(--text-faint)]" : "text-[var(--text)]")}>{r.mechanic}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">{r.hours.toFixed(1)}</td>
      <td className={cn("px-3 py-2 text-center tabular-nums", r.promised === "EOD" ? "font-semibold text-[var(--text-muted)]" : "text-[var(--text)]")}>{r.promised}</td>
      {checks.map((c) => {
        const v = r.checks[c];
        return (
          <td key={c} className="px-3 py-2 text-center">
            {v === "ok" && <span className="text-emerald-600">✓</span>}
            {v === "watch" && <span className="text-amber-500">◐</span>}
            {v === "behind" && <span className="text-rose-500">✕</span>}
            {!v && <span className="text-[var(--border-strong)]">·</span>}
          </td>
        );
      })}
    </tr>
  );
}

function statusPill(s: Row["status"]): string {
  switch (s) {
    case "done": return "bg-emerald-50 text-emerald-700";
    case "working": return "bg-blue-50 text-blue-600";
    case "queued": return "bg-emerald-50 text-emerald-600";
    case "to_dispatch": return "bg-amber-50 text-amber-700";
    case "waiter": return "bg-orange-50 text-orange-600";
  }
}
