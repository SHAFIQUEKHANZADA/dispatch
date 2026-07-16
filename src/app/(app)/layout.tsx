import { AppShell } from "@/components/app-shell";

// The operational app lives under this route group. Everything here is wrapped
// in the dispatcher chrome (nav + dealer switcher). The marketing landing page
// at "/" sits outside it.
export default function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
