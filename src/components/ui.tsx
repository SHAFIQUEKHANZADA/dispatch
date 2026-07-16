"use client";

import React from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// --------------------------------------------------------------------------- //
// Card                                                                        //
// --------------------------------------------------------------------------- //

export function Card({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card-elev rounded-xl border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Button                                                                      //
// --------------------------------------------------------------------------- //

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "good" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white border-transparent",
    good: "bg-[var(--good)] hover:brightness-110 text-[#04140a] border-transparent font-semibold",
    secondary:
      "bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border-[var(--border-strong)]",
    ghost:
      "bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-muted)] border-transparent",
    danger:
      "bg-[var(--danger)] hover:brightness-110 text-white border-transparent",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-2.5 py-1.5 rounded-md",
    md: "text-sm px-4 py-2 rounded-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------- //
// Badge                                                                       //
// --------------------------------------------------------------------------- //

const FLAG_STYLES: Record<string, string> = {
  MGR_FLAG: "bg-amber-50 text-amber-700 border-amber-300",
  HEAT_CASE: "bg-rose-50 text-rose-700 border-rose-300",
  COMEBACK: "bg-violet-50 text-violet-700 border-violet-300",
  WAITING: "bg-sky-50 text-sky-700 border-sky-300",
  LUBE_TEAM: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border-strong)]",
};

const FLAG_LABELS: Record<string, string> = {
  MGR_FLAG: "MGR FLAG",
  HEAT_CASE: "HEAT CASE",
  COMEBACK: "COMEBACK",
  WAITING: "⏱ WAITING",
};

export function FlagBadge({ flag }: { flag: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide border uppercase",
        FLAG_STYLES[flag] ?? "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border-strong)]",
      )}
    >
      {FLAG_LABELS[flag] ?? flag}
    </span>
  );
}

export function PriorityChip({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    HIGH: "text-[var(--danger)] border-[var(--danger)]",
    MEDIUM: "text-[var(--warn)] border-[var(--warn)]",
    LOW: "text-[var(--text-faint)] border-[var(--border-strong)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide border uppercase",
        styles[priority] ?? styles.LOW,
      )}
    >
      {priority}
    </span>
  );
}

// --------------------------------------------------------------------------- //
// Score bar                                                                   //
// --------------------------------------------------------------------------- //

export function ScoreBar({
  score,
  confident = true,
  onClick,
}: {
  score: number;
  confident?: boolean;
  onClick?: () => void;
}) {
  const color = !confident
    ? "var(--text-faint)"
    : score >= 80
      ? "var(--good)"
      : score >= 60
        ? "var(--warn)"
        : "var(--danger)";
  return (
    <button
      onClick={onClick}
      title="Click to see why"
      className="group flex items-center gap-2 cursor-pointer"
    >
      <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span
        className="w-8 text-right font-mono text-sm font-semibold tabular-nums group-hover:underline"
        style={{ color }}
      >
        {score}
      </span>
    </button>
  );
}

// --------------------------------------------------------------------------- //
// Avatar (initials)                                                           //
// --------------------------------------------------------------------------- //

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // deterministic hue from the name so the same tech is always the same color
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: `hsl(${h} 45% 40%)` }}
    >
      {initials}
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Modal                                                                       //
// --------------------------------------------------------------------------- //

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className={cn(
          "my-8 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-[var(--text-faint)] hover:text-[var(--text)] text-lg leading-none cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- //
// Guardian banner — the "never hide uncertainty" surface                      //
// --------------------------------------------------------------------------- //

export function GuardianBanner({
  stale,
  ageHours,
  thresholdHours,
}: {
  stale: boolean;
  ageHours: number | null;
  thresholdHours: number;
}) {
  if (!stale) return null;
  const msg =
    ageHours === null
      ? "No DMS history has been imported for this store. Familiarity and performance factors cannot be computed — import the last 90 days to activate them."
      : `Source data is ${(ageHours / 24).toFixed(1)} days old (stale past ${thresholdHours}h). Scores and metrics below may not reflect current shop state.`;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--warn)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--warn)]">
      <span aria-hidden>⚠</span>
      <span>
        <span className="font-semibold">Guardian: </span>
        {msg}
      </span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--brand)]" />
      {label ?? "Loading…"}
    </div>
  );
}
