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
