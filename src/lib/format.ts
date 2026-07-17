// Display helpers. The dealer's timezone comes from the backend already baked
// into reason text; these are for the raw timestamps the UI formats itself.

const DEALER_TZ = "America/Chicago";

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DEALER_TZ,
  });
}

export function fmtTimeShort(iso: string | null | undefined): string {
  return fmtTime(iso).replace(" ", "").toLowerCase(); // "8:45am"
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: DEALER_TZ,
  });
}

/**
 * Format a plain wall-clock time — "07:00:00" -> "7:00 AM".
 *
 * Shift and lunch times come back from the API as a bare time-of-day, NOT a
 * timestamp. Passing those to `new Date()` yields Invalid Date, so they must
 * never go through fmtTime(). There is no timezone conversion here on purpose:
 * a 7 AM shift is 7 AM at the store, not an instant to be shifted.
 */
export function fmtClock(time: string | null | undefined): string {
  if (!time) return "—";
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return "—";
  const h = Number(m[1]);
  const min = m[2];
  if (Number.isNaN(h) || h > 23) return "—";
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${min} ${ampm}`;
}

/** "7:00 AM – 4:00 PM", or "—" if the schedule isn't set. */
export function fmtShiftRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return "Not set";
  return `${fmtClock(start)} – ${fmtClock(end)}`;
}

export function vehicleLabel(ro: {
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
}): string {
  return [ro.vehicle_year, ro.vehicle_make, ro.vehicle_model].filter(Boolean).join(" ");
}

// Score color: green high, amber mid, red low. Matches the score-bar fill.
export function scoreColor(score: number): string {
  if (score >= 80) return "var(--good)";
  if (score >= 60) return "var(--warn)";
  return "var(--danger)";
}

export function certLabel(cert: string): string {
  return cert.replace(/_/g, "/");
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}
