"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

/* eslint-disable @next/next/no-img-element */

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Go straight to the board.
  useEffect(() => {
    if (!supabaseConfigured) {
      router.replace("/dashboard");
      return;
    }
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/dashboard");
      });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!supabaseConfigured) {
        router.replace("/dashboard");
        return;
      }
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070d1c] px-4 text-white">
      <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[800px] rounded-full bg-[#123a8a]/25 blur-[140px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="/dispatchlogo.png" alt="3D Dispatch" className="h-12 w-auto" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-white/60">
            Access your dealership&apos;s dispatch board.
          </p>

          {!supabaseConfigured && (
            <div className="mt-4 rounded-lg border border-[#f59e0b]/50 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#f59e0b]">
              Supabase auth isn&apos;t configured — set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY. Continuing in dev mode.
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-[#3b82f6]"
                placeholder="you@dealership.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-[#3b82f6]"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-[#ef4444]/50 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#ef4444]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#2563eb] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Zenvyk · 3D Dispatch™
        </p>
      </div>
    </div>
  );
}
