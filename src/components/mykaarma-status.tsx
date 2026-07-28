"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, Card, Spinner, cn } from "./ui";

interface MKStatus {
  configured: boolean;
  reachable?: boolean;
  ro_scope_granted?: boolean;
  ro_search_scope_granted?: boolean;
  open_ro_count?: number;
  opcode_total?: number;
  dealer_uuid?: string;
  message?: string;
}

interface SyncResp {
  ok: boolean;
  message: string;
  detail: Record<string, unknown>;
}

// Live myKaarma connection panel. Shows exactly which parts of the integration
// are working — deliberately granular, because "connected" is not one thing:
// auth can work while a data scope is still missing.
export function MyKaarmaStatus() {
  const [status, setStatus] = useState<MKStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResp | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await api.get<MKStatus>("/mykaarma/status"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runSync(path: string, key: string) {
    setBusy(key);
    setResult(null);
    try {
      setResult(await api.post<SyncResp>(path));
      await load();
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof ApiError ? e.message : String(e),
        detail: {},
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">myKaarma (live DMS)</h2>
            {status && <OverallPill status={status} />}
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            The live connection to the dealership&apos;s DMS. CSV import stays available as
            a fallback and for onboarding history.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="mt-4">
          <Spinner label="Checking myKaarma…" />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-[var(--danger)] bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {status && !loading && (
        <>
          {/* the three things that actually matter, each independently true/false */}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Check
              label="Credentials"
              ok={status.configured}
              okText="Configured"
              badText="Missing"
            />
            <Check
              label="Authentication"
              ok={Boolean(status.reachable)}
              okText="Connected"
              badText="Not reachable"
            />
            <Check
              label="Repair-order scope"
              ok={Boolean(status.ro_scope_granted)}
              okText="Granted"
              badText="Not granted"
            />
          </div>

          {status.message && (
            <p className="mt-3 text-xs text-[var(--text-muted)]">{status.message}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-faint)]">
            {status.dealer_uuid && <span>Dealer: {status.dealer_uuid}</span>}
            {status.opcode_total !== undefined && (
              <span>Op codes available: {status.opcode_total}</span>
            )}
            {status.open_ro_count !== undefined && (
              <span className={status.open_ro_count > 0 ? "font-semibold text-good" : ""}>
                Open ROs in myKaarma: {status.open_ro_count}
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!status.reachable || busy !== null}
              onClick={() => runSync("/mykaarma/sync/opcodes", "opcodes")}
            >
              {busy === "opcodes" ? "Syncing…" : "Sync op codes"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!status.ro_scope_granted || busy !== null}
              onClick={() => runSync("/mykaarma/sync/repair-orders", "ros")}
            >
              {busy === "ros"
                ? "Pulling…"
                : status.open_ro_count
                  ? `Pull ${status.open_ro_count} open RO${status.open_ro_count === 1 ? "" : "s"}`
                  : "Pull open ROs"}
            </Button>
          </div>

          {result && (
            <div
              className={cn(
                "mt-3 rounded-lg border px-3 py-2 text-xs",
                result.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              {result.message}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function OverallPill({ status }: { status: MKStatus }) {
  const full = status.configured && status.reachable && status.ro_scope_granted;
  const partial = status.configured && status.reachable;
  const [text, cls] = full
    ? ["Fully connected", "bg-emerald-50 text-emerald-700 border-emerald-200"]
    : partial
      ? ["Partially connected", "bg-amber-50 text-amber-700 border-amber-200"]
      : ["Not connected", "bg-red-50 text-red-700 border-red-200"];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", cls)}>
      {text}
    </span>
  );
}

function Check({
  label,
  ok,
  okText,
  badText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 flex items-center gap-1.5 text-sm font-semibold",
          ok ? "text-emerald-700" : "text-amber-700",
        )}
      >
        <span aria-hidden>{ok ? "✓" : "⚠"}</span>
        {ok ? okText : badText}
      </div>
    </div>
  );
}
