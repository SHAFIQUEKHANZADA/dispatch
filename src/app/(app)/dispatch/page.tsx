"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { Board, BoardRO, Candidate } from "@/lib/types";
import { Button, GuardianBanner, Spinner } from "@/components/ui";
import { ROCard } from "@/components/ro-card";
import { DispatchModal } from "@/components/dispatch-modal";
import { SmartDecisionModal } from "@/components/smart-decision-modal";

interface ApptService {
  op_code: string | null;
  description: string | null;
  duration_mins: number | null;
  price: number | null;
  pay_type: string | null;
  operation_type: string | null;
}
interface Appt {
  appointment_uuid: string;
  customer_name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  vehicle: string;
  vin: string | null;
  license_plate: string | null;
  mileage: string | number | null;
  color: string | null;
  engine: string | null;
  trim: string | null;
  start_time: string | null;
  end_time: string | null;
  preferred_date: string | null;
  status: string | null;
  transport: string | null;
  service_requested: string | null;
  services: ApptService[];
  internal_notes: string | null;
  recall: boolean;
  source: string | null;
  text_reminder: boolean;
  advisor_uuid: string | null;
  order_number: string | null;
  has_order: boolean;
  booked_at: string | null;
}
interface UpcomingResp {
  available: boolean;
  reason?: string;
  count?: number;
  appointments: Appt[];
}
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
    <div className="space-y-4 px-5 py-5">
      {/* title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Available ROs to Dispatch</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Pick an RO — techs are ranked by Match Score. Hover a tech to see why.
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

      <>
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

          <div className="space-y-3">
            {board?.ros.map((ro) => (
              <ROCard
                key={ro.id}
                ro={ro}
                onDispatch={(ro, cand, rank) => setDispatchTarget({ ro, cand, rank })}
              />
            ))}
          </div>
      </>

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

// ------- Upcoming ROs (myKaarma appointments) ------- //
function fmtT(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? s : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtD(s: string | null): string {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? s : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function dayKey(s: string | null): string {
  return (s ?? "").split(" ")[0] || "—";
}
function apptInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

function UpcomingView({ data, loading, onRefresh }: { data: UpcomingResp | null; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) return <Spinner label="Reading appointments from myKaarma…" />;

  if (data && !data.available) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        Upcoming appointments aren&apos;t available yet — {data.reason ?? "myKaarma appointment scope not granted."}
      </div>
    );
  }

  const appts = data?.appointments ?? [];
  // group by day, in chronological order
  const groups: { key: string; label: string; items: Appt[] }[] = [];
  for (const a of appts) {
    const k = dayKey(a.start_time);
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, label: fmtD(a.start_time), items: [] }; groups.push(g); }
    g.items.push(a);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
        <span>
          <b>Booked in myKaarma</b> — appointments from the scheduler / voice agent. Each becomes a dispatchable RO when the customer checks in.
        </span>
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {appts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-12 text-center text-sm text-[var(--text-muted)]">
          No upcoming appointments booked in myKaarma for the next two weeks.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{g.label}</div>
            <div className="grid gap-2 xl:grid-cols-2">
              {g.items.map((a) => (
                <AppointmentCard key={a.appointment_uuid} a={a} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function apptHue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}

function FactList({ title, rows, cols2 }: { title: string; rows: [string, ReactNode][]; cols2?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{title}</div>
      <dl className={cols2 ? "grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2" : "space-y-1"}>
        {rows.map(([k, v], i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--border)] py-0.5 last:border-0">
            <dt className="shrink-0 text-xs text-[var(--text-faint)]">{k}</dt>
            <dd className="min-w-0 truncate text-right text-xs font-medium text-[var(--text)]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AppointmentCard({ a }: { a: Appt }) {
  const [open, setOpen] = useState(true);  // details expanded by default
  const services = a.services ?? [];       // tolerate an older backend payload
  const hasVehicle = a.vehicle && a.vehicle !== "Vehicle TBD";

  // Customer + vehicle facts
  const customer: [string, ReactNode][] = [
    ["Full name", a.customer_name],
  ];
  if (a.phone) customer.push(["Phone", a.phone]);
  else customer.push(["Phone", <span className="text-[var(--text-faint)]">—</span>]);
  if (a.company) customer.push(["Company", a.company]);

  const vehicle: [string, ReactNode][] = [
    ["Vehicle", hasVehicle ? a.vehicle : <span className="text-[var(--text-faint)]">Not selected at booking</span>],
  ];
  if (a.vin) vehicle.push(["VIN", <span className="font-mono text-[11px]">{a.vin}</span>]);
  if (a.license_plate) vehicle.push(["License plate", a.license_plate]);
  if (a.mileage) vehicle.push(["Mileage", `${a.mileage} mi`]);
  if (a.color) vehicle.push(["Color", a.color]);
  if (a.engine) vehicle.push(["Engine", a.engine]);
  if (a.trim) vehicle.push(["Trim", a.trim]);

  // Booking meta
  const meta: [string, ReactNode][] = [];
  if (a.transport) meta.push(["Transport", a.transport]);
  if (a.recall) meta.push(["Recall", "Yes"]);
  if (a.source) meta.push(["Booked via", a.source]);
  if (a.booked_at) meta.push(["Booked at", `${fmtD(a.booked_at)} ${fmtT(a.booked_at)}`]);
  meta.push(["Text reminder", a.text_reminder ? "On" : "Off"]);
  if (a.internal_notes) meta.push(["Notes", a.internal_notes]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-[var(--surface-2)] px-2 py-1.5">
          <span className="text-sm font-bold text-[var(--text)]">{fmtT(a.start_time)}</span>
          <span className="text-[9px] uppercase text-[var(--text-faint)]">arrival</span>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: apptHue(a.customer_name) }}>
          {apptInitials(a.customer_name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-[var(--text)]">{a.customer_name}</div>
          <div className="truncate text-xs text-[var(--text-muted)]">
            {a.service_requested ? a.service_requested : a.vehicle}
            {a.vehicle !== "Vehicle TBD" && a.service_requested ? ` · ${a.vehicle}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
            {a.status || "Scheduled"}
          </span>
          {a.order_number ? (
            <span className="font-mono text-[11px] text-[var(--text-muted)]">RO #{a.order_number}</span>
          ) : (
            <span className="text-[10px] text-[var(--text-faint)]">not checked in</span>
          )}
        </div>
        <span className={`ml-1 shrink-0 text-[var(--text-faint)] transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
          {/* customer + vehicle, side by side */}
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <FactList title="Customer" rows={customer} />
            <FactList title="Vehicle" rows={vehicle} />
          </div>

          {/* op-code service lines (real DMS operations booked) */}
          {services.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                Services / Op Codes
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-2)] text-left text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
                      <th className="px-2.5 py-1.5 font-semibold">Op Code</th>
                      <th className="px-2.5 py-1.5 font-semibold">Service</th>
                      <th className="px-2.5 py-1.5 text-right font-semibold">Duration</th>
                      <th className="px-2.5 py-1.5 text-right font-semibold">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-2.5 py-1.5 font-mono font-semibold text-[var(--brand)]">{s.op_code ?? "—"}</td>
                        <td className="px-2.5 py-1.5 text-[var(--text)]">{s.description ?? "—"}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-[var(--text-muted)]">
                          {s.duration_mins ? `${s.duration_mins} min` : "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-[var(--text-muted)]">{s.pay_type ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* booking meta */}
          <FactList title="Booking" rows={meta} cols2 />
        </div>
      )}
    </div>
  );
}
