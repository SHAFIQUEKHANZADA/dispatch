"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner, cn } from "@/components/ui";

interface Hold { kind: string; label: string; reserve?: string }
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
  service_requested: string | null;
  services: ApptService[];
  transport: string | null;
  internal_notes: string | null;
  recall: boolean;
  source: string | null;
  status: string | null;
  order_number: string | null;
  has_order: boolean;
  booked_at: string | null;
  start_time: string | null;
  end_time: string | null;
  complexity: "HIGH" | "MID" | "LOW";
  show_pct: number | null;
  lifecycle: "scheduled" | "arrived" | "no_show";
  capacity_hold: Hold;
}
interface Board {
  available: boolean;
  reason?: string;
  stats: { upcoming_today: number; high_complexity: number; windows_held: number; no_show_freed: number };
  capacity_policy: { level: string; text: string };
  appointments: Appt[];
}

function fmtT(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  // Force 12-hour AM/PM regardless of the viewer's OS locale (a 24-hour locale
  // was rendering "15:00" instead of "3:00 PM").
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDateLabel(s: string | null) {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtShortD(s: string | null) {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
const CX: Record<string, string> = {
  HIGH: "bg-rose-100 text-rose-700",
  MID: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
};
function showColor(p: number) { return p >= 85 ? "#16a34a" : p >= 65 ? "#f59e0b" : "#dc2626"; }
function hasHVCert(concern: string | null) {
  const t = (concern || "").toLowerCase();
  return t.includes("hybrid") || t.includes(" hv") || t.includes("hv ") || t.includes("recall");
}

export default function AppointmentsPage() {
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<Board>("/mykaarma/appointments/board?days=14"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const appts = data?.appointments ?? [];
  const dateLabel = appts.length ? fmtDateLabel(appts[0].start_time) : "";

  return (
    <div className="px-5 py-5">
      {/* header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Appointments</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Incoming work — the system watches the hard jobs and helps you hold capacity.
          </p>
        </div>
        {dateLabel && (
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-1 py-1 text-sm">
            <button className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] hover:bg-[var(--surface-2)]">‹</button>
            <span className="px-2 font-semibold text-[var(--text)]">{dateLabel}</span>
            <button className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] hover:bg-[var(--surface-2)]">›</button>
          </div>
        )}
      </div>

      {loading && <div className="pt-8"><Spinner label="Reading appointments from myKaarma…" /></div>}
      {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
      {data && !data.available && (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          Appointments aren&apos;t available — {data.reason ?? "myKaarma appointment scope not granted."}
        </div>
      )}

      {data?.available && (
        <>
          {/* stat cards — compact, left-aligned (not full width) */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Stat n={data.stats.upcoming_today} label="Upcoming today" color="text-[var(--text)]" />
            <Stat n={data.stats.high_complexity} label="High complexity" color="text-rose-600" />
            <Stat n={data.stats.windows_held} label="Windows held" color="text-emerald-600" />
            <Stat n={data.stats.no_show_freed} label="No-show (freed)" color="text-rose-600" />
          </div>

          {/* capacity policy banner */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 px-4 py-2.5 text-sm text-[var(--text-muted)]">
            <span>
              <b className="text-[var(--text)]">Capacity holds: {data.capacity_policy.level}</b> — {data.capacity_policy.text}
            </span>
            <a href="/store-settings" className="shrink-0 font-semibold text-[var(--brand)] hover:underline">Adjust in Store Settings →</a>
          </div>

          {/* table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  <Th className="w-20">Time</Th>
                  <Th className="w-52">Customer / Vehicle</Th>
                  <Th>Concern</Th>
                  <Th className="w-24 text-center">Complexity</Th>
                  <Th className="w-32">Show</Th>
                  <Th className="w-44">Capacity Hold</Th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a) => (
                  <tr
                    key={a.appointment_uuid}
                    onClick={() => setSelected(a)}
                    className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50"
                  >
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[var(--text)]">{fmtT(a.start_time)}</div>
                      <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">{fmtShortD(a.start_time)}</div>
                      {a.lifecycle === "arrived" && <div className="text-[10px] text-[var(--text-faint)]">arrived</div>}
                      {a.lifecycle === "no_show" && <div className="text-[10px] text-[var(--text-faint)]">missed</div>}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-[var(--text)]">{a.customer_name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{a.vehicle}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-[var(--text)]">
                      {a.service_requested || "—"}
                      {hasHVCert(a.service_requested) && (
                        <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">HV cert</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", CX[a.complexity])}>{a.complexity}</span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {a.show_pct == null ? (
                        <span className="text-xs text-[var(--text-faint)]">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
                            <div className="h-full rounded-full" style={{ width: `${a.show_pct}%`, background: showColor(a.show_pct) }} />
                          </div>
                          <span className="font-semibold tabular-nums" style={{ color: showColor(a.show_pct) }}>{a.show_pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <HoldCell hold={a.capacity_hold} />
                    </td>
                  </tr>
                ))}
                {appts.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-[var(--text-muted)]">No upcoming appointments in myKaarma.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-[var(--text-faint)]">
            Click any row to see the full appointment. Time · customer · vehicle · concern come live from myKaarma. Complexity + capacity holds are computed from your real roster.
            <b> Show %</b> is an estimate from booking signals — it becomes a true prediction once no-show history is fed in.
          </p>
        </>
      )}

      {selected && <ApptModal appt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Appointment detail popup                                                    */
/* --------------------------------------------------------------------------- */

function fmtDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}
function fmtMoney(n: number | null) {
  if (n == null) return null;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ApptModal({ appt, onClose }: { appt: Appt; onClose: () => void }) {
  const hold = appt.capacity_hold;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text)]">{appt.customer_name}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", CX[appt.complexity])}>{appt.complexity}</span>
              {appt.recall && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">Recall</span>}
            </div>
            <div className="mt-0.5 text-sm text-[var(--text-muted)]">{appt.vehicle}{appt.company ? ` · ${appt.company}` : ""}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface-2)]" aria-label="Close">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {/* appointment */}
          <Section title="Appointment">
            <Field label="Date / time" value={fmtDateTime(appt.start_time)} />
            <Field label="Ends" value={appt.end_time ? fmtDateTime(appt.end_time) : "—"} />
            <Field label="Transport" value={appt.transport || "—"} />
            <Field label="Status" value={appt.status || "—"} />
            <Field label="Show likelihood" value={appt.show_pct == null ? "—" : `${appt.show_pct}%`} />
            <Field
              label="Capacity hold"
              value={hold.reserve ? `${hold.label} · reserve ${hold.reserve}` : hold.label}
            />
          </Section>

          {/* contact */}
          <Section title="Customer">
            <Field label="Phone" value={appt.phone || "—"} />
            <Field label="Email" value={appt.email || "—"} />
            <Field label="Source" value={appt.source || "—"} />
            <Field label="Booked" value={appt.booked_at ? fmtDateTime(appt.booked_at) : "—"} />
          </Section>

          {/* vehicle */}
          <Section title="Vehicle">
            <Field label="VIN" value={appt.vin || "—"} />
            <Field label="Plate" value={appt.license_plate || "—"} />
            <Field label="Mileage" value={appt.mileage != null && appt.mileage !== "" ? String(appt.mileage) : "—"} />
            <Field label="Color" value={appt.color || "—"} />
            <Field label="Engine" value={appt.engine || "—"} />
            <Field label="Trim" value={appt.trim || "—"} />
          </Section>

          {/* services */}
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Services requested</div>
            {appt.services && appt.services.length > 0 ? (
              <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {appt.services.map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-[var(--text)]">{s.description || s.op_code || "Service"}</div>
                      <div className="text-[11px] text-[var(--text-faint)]">
                        {[s.op_code, s.pay_type, s.duration_mins ? `${s.duration_mins} min` : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    {fmtMoney(s.price) && <div className="shrink-0 text-sm font-semibold text-[var(--text)]">{fmtMoney(s.price)}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-3 text-sm text-[var(--text-muted)]">
                {appt.service_requested || "No operations selected at booking."}
              </div>
            )}
          </div>

          {appt.internal_notes && (
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Internal notes</div>
              <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]">{appt.internal_notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--text-faint)]">{label}</div>
      <div className="text-sm text-[var(--text)] break-words">{value}</div>
    </div>
  );
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
function HoldCell({ hold }: { hold: Hold }) {
  const style: Record<string, string> = {
    soft_hold: "bg-blue-50 text-blue-700",
    checked_in: "bg-sky-50 text-sky-700",
    no_show: "bg-rose-50 text-rose-700",
    alert: "bg-amber-50 text-amber-800",
    routine: "bg-transparent text-[var(--text-faint)]",
  };
  return (
    <div>
      <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", style[hold.kind] ?? "bg-[var(--surface-3)] text-[var(--text-muted)]")}>
        {hold.label}
      </span>
      {hold.reserve && (
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">reserve <b className="text-[var(--text)]">{hold.reserve}</b></div>
      )}
    </div>
  );
}
