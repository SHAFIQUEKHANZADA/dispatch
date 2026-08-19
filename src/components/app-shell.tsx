"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { StoreSwitcher } from "./store-switcher";
import { cn } from "./ui";

// Left-sidebar navigation — matches the dispatcher board layout exactly.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <IconGrid /> },
  { href: "/scoreboard", label: "Scoreboard", icon: <IconTrophy /> },
  { href: "/dispatch", label: "Available ROs", icon: <IconClipboard /> },
  { href: "/techs", label: "Available Techs", icon: <IconUsers /> },
  { href: "/route-sheet", label: "Route Sheet", icon: <IconRoute /> },
  { href: "/appointments", label: "Appointments", icon: <IconCalendar /> },
  { href: "/loaners", label: "Loaners", icon: <IconCar /> },
  { href: "/reports", label: "Reports", icon: <IconChart /> },
  { href: "/store-settings", label: "Store Settings", icon: <IconStore /> },
  { href: "/scoreboard-settings", label: "Scoreboard Settings", icon: <IconSliders /> },
  { href: "/settings", label: "Tech Settings", icon: <IconGear /> },
];

function Sidebar() {
  const pathname = usePathname();
  const { dealer, configured, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[190px] shrink-0 flex-col bg-gradient-to-b from-[#0b1f3a] to-[#15315a] text-white md:flex print:hidden!">
      {/* logo — white band; height matches the page header bar so the top aligns */}
      <div className="flex h-[62px] shrink-0 items-center border-b border-[#e2e8f0] bg-white px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/image.png" alt="3D Dispatch — Data Driven Decisions" className="h-8 w-auto" />
      </div>

      {/* nav — flat rows with a left-border active state, matching the mockup */}
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 border-l-[3px] px-3.5 py-2.5 text-sm transition [&_svg]:h-4 [&_svg]:w-4",
                active
                  ? "border-[#3b82f6] bg-[#3b82f6]/[0.16] font-bold text-white"
                  : "border-transparent font-medium text-[#cbd5e1] hover:bg-white/[0.07] hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* store switcher + user */}
      <div className="border-t border-white/10 p-3">
        <StoreSwitcher />
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3b82f6] text-xs font-semibold text-white">
            {initials(dealer?.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">
              {dealer ? dealer.name.split(" ")[0] : "User"}
            </div>
            <div className="text-[11px] capitalize text-white/45">
              {dealer?.role?.replace("_", " ").toLowerCase() ?? "dispatcher"}
            </div>
          </div>
          {configured && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <IconLogout />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function initials(name?: string): string {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session, configured } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && configured && !session) router.replace("/login");
  }, [ready, configured, session, router]);

  if (!ready)
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--text-muted)]">Loading…</div>;
  if (configured && !session)
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--text-muted)]">Redirecting to sign in…</div>;
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <div className="flex min-h-screen bg-[var(--bg)]">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </AuthGate>
    </AuthProvider>
  );
}

/* ---- icons ---- */
const ip = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IconGrid() { return <svg {...ip}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function IconTrophy() { return <svg {...ip}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 4H5a2 2 0 0 0 0 4h1M17 4h2a2 2 0 0 1 0 4h-1"/></svg>; }
function IconClipboard() { return <svg {...ip}><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></svg>; }
function IconUsers() { return <svg {...ip}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M16 15c2.2 0 4 1.5 4 4"/><circle cx="17" cy="8" r="2.5"/></svg>; }
function IconPlug() { return <svg {...ip}><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/></svg>; }
function IconGear() { return <svg {...ip}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z"/></svg>; }
function IconRoute() { return <svg {...ip}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a3 3 0 0 0 3-3V9M6 17V8a3 3 0 0 1 3-3h5"/></svg>; }
function IconCalendar() { return <svg {...ip}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconCar() { return <svg {...ip}><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="15.5" r="0.5"/><circle cx="16.5" cy="15.5" r="0.5"/></svg>; }
function IconChart() { return <svg {...ip}><path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/></svg>; }
function IconStore() { return <svg {...ip}><path d="M3 9l1.5-5h15L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18"/></svg>; }
function IconSliders() { return <svg {...ip}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>; }
function IconLogout() { return <svg {...ip}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
