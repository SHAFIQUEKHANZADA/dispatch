"use client";

import { useState } from "react";
import { api, API_BASE, ApiError, authHeader } from "@/lib/api";
import { Button, Card, cn } from "@/components/ui";
import { MyKaarmaStatus } from "@/components/mykaarma-status";

interface PreviewResp {
  filename: string;
  kind: string;
  headers: string[];
  sample: string[][];
  suggested_mapping: Record<string, string | null>;
  fields: { key: string; label: string; required: boolean }[];
}

interface CommitResp {
  import_run_id: string;
  rows_total: number;
  rows_imported: number;
  rows_rejected: number;
  rejects: { row: number; reason: string }[];
  unmatched_tech_nos: string[];
  unmapped_op_codes?: string[];
  comeback_pairs?: number;
  familiarity_rows?: number;
  warnings: string[];
}

export default function ImportPage() {
  const [kind, setKind] = useState<"DMS_RO_HISTORY" | "TIME_CLOCK">("DMS_RO_HISTORY");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<CommitResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doPreview() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch(`${API_BASE}/imports/preview`, {
        method: "POST",
        headers: await authHeader(),
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const data: PreviewResp = await res.json();
      setPreview(data);
      setMapping(data.suggested_mapping);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doCommit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      form.append("mapping_json", JSON.stringify(mapping));
      form.append("replace_existing", "true");
      const res = await fetch(`${API_BASE}/imports/commit`, {
        method: "POST",
        headers: await authHeader(),
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 py-5">
      <div>
        <h1 className="text-xl font-semibold">Data Sources</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Where 3D Dispatch gets its repair-order data — the live DMS connection, and the
          CSV import used for onboarding history and as a fallback.
        </p>
      </div>

      {/* live DMS connection status */}
      <MyKaarmaStatus />

      <div className="pt-2">
        <h2 className="text-lg font-semibold">CSV Import</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Upload the last 90 days of closed ROs. Every dealership&apos;s export is shaped differently,
          so you map the columns before anything is imported. Bad rows are rejected and reported —
          nothing is imported silently.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs text-[var(--text-muted)]">Export type</div>
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setPreview(null);
                setResult(null);
              }}
            >
              <option value="DMS_RO_HISTORY">DMS RO history (90 days)</option>
              <option value="TIME_CLOCK">Time clock (enables Productivity)</option>
            </select>
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs text-[var(--text-muted)]">CSV file</div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
              }}
              className="text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-3)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text)]"
            />
          </div>
          <Button variant="primary" onClick={doPreview} disabled={!file || busy}>
            {busy && !preview ? "Reading…" : "Preview & map"}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* mapping step */}
      {preview && !result && (
        <Card className="p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Map your columns
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {preview.fields.map((field) => (
              <label key={field.key} className="block">
                <div className="mb-1 text-xs text-[var(--text-muted)]">
                  {field.label}
                  {field.required && <span className="text-[var(--danger)]"> *</span>}
                </div>
                <select
                  className={inputCls}
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value || null })
                  }
                >
                  <option value="">— not mapped —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {/* sample preview */}
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--text-faint)]">
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-2 py-1.5 text-[var(--text-muted)]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="good" onClick={doCommit} disabled={busy}>
              {busy ? "Importing…" : "Validate & import"}
            </Button>
          </div>
        </Card>
      )}

      {/* result */}
      {result && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Import complete</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <Stat label="Rows total" value={result.rows_total} />
            <Stat label="Imported" value={result.rows_imported} tone="good" />
            <Stat label="Rejected" value={result.rows_rejected} tone={result.rows_rejected ? "danger" : "good"} />
            {result.comeback_pairs !== undefined && (
              <Stat label="Comeback pairs" value={result.comeback_pairs} />
            )}
            {result.familiarity_rows !== undefined && (
              <Stat label="Familiarity rows" value={result.familiarity_rows} />
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="rounded-lg border border-[var(--warn)]/50 px-3 py-2 text-xs text-[var(--warn)]">
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}

          {result.rejects.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--danger)]">
                Rejected rows — why each failed
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-xs">
                  <tbody>
                    {result.rejects.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="w-16 px-2 py-1.5 font-mono text-[var(--text-faint)]">
                          row {r.row}
                        </td>
                        <td className="px-2 py-1.5 text-[var(--text-muted)]">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--brand)]";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "danger";
}) {
  const color = tone === "good" ? "text-[var(--good)]" : tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text)]";
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className={cn("font-mono text-lg font-bold", color)}>{value}</div>
    </div>
  );
}
