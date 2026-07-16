"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { cn } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/dispatch", label: "Dispatch Board", icon: "⚡", primary: true },
  { href: "/techs", label: "Available Techs", icon: "◉" },
  { href: "/scoreboard", label: "Scoreboard", icon: "▤" },
  { href: "/settings", label: "Technicians", icon: "⚙" },
  { href: "/import", label: "Import DMS", icon: "⇪" },
];

function StoreMenu() {
  const { dealer, configured, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-3">
      {dealer && (
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium leading-tight">{dealer.name}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
            {dealer.role?.replace("_", " ")}
          </div>
        </div>
      )}
      {configured && (
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          Sign out
        </button>
      )}
    </div>
  );
}

function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-[var(--surface-2)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
            )}
          >
            <span className="text-xs opacity-70" aria-hidden>
              {item.icon}
            </span>
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Redirects to /login when Supabase auth is on and there is no session.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && configured && !session) router.replace("/login");
  }, [ready, configured, session, router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--text-muted)]">
        Loading…
      </div>
    );
  }
  if (configured && !session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--text-muted)]">
        Redirecting to sign in…
      </div>
    );
  }
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M5 20V11M12 20V4M19 20v-6" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold tracking-tight text-[var(--text)]">
                  3D DISPATCH
                </span>
                <span className="block text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-faint)]">
                  Data Driven Decisions
                </span>
              </span>
            </Link>
          </div>
          <div className="hidden lg:block">
            <Nav />
          </div>
          <StoreMenu />
        </div>
        <div className="border-t border-[var(--border)] px-4 py-1.5 lg:hidden">
          <Nav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <Shell>{children}</Shell>
      </AuthGate>
    </AuthProvider>
  );
}
