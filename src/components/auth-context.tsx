"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api";

interface DealerInfo {
  id: string;
  name: string;
  timezone: string;
  role: string;
}

interface AuthState {
  ready: boolean; // finished the initial session check
  session: Session | null;
  dealer: DealerInfo | null;
  configured: boolean; // is Supabase auth wired up at all?
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  ready: false,
  session: null,
  dealer: null,
  configured: supabaseConfigured,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [dealer, setDealer] = useState<DealerInfo | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      // No Supabase → dev mode. The backend resolves the dealer from the
      // X-Dealer-Id fallback; still fetch it so the header can show the name.
      api
        .get<DealerInfo>("/dealer")
        .then(setDealer)
        .catch(() => {})
        .finally(() => setReady(true));
      return;
    }

    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Whenever we have a session, pull the dealer + role the backend resolved
  // from the JWT. A 403 here means the user has no user_profiles row yet.
  useEffect(() => {
    if (!supabaseConfigured) return;
    if (!session) {
      setDealer(null);
      return;
    }
    api
      .get<DealerInfo>("/dealer")
      .then(setDealer)
      .catch(() => setDealer(null));
  }, [session]);

  async function signOut() {
    if (supabaseConfigured) await getSupabase().auth.signOut();
    setSession(null);
    setDealer(null);
  }

  return (
    <Ctx.Provider
      value={{ ready, session, dealer, configured: supabaseConfigured, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}
