"use client";

import { useEffect, useRef, useState } from "react";
import { api, getStoreId, setStoreId } from "@/lib/api";
import { cn } from "./ui";

interface Store {
  dealer_id: string;
  store_id: string | null;
  name: string;
  timezone: string;
  mykaarma_configured: boolean;
  ro_count: number;
  is_current: boolean;
}
interface StoresResp {
  current_store_id: string | null;
  stores: Store[];
}

export function StoreSwitcher() {
  const [data, setData] = useState<StoresResp | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<StoresResp>("/stores").then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!data || data.stores.length === 0) return null;

  const currentKey = getStoreId() || data.current_store_id;
  const current = data.stores.find((s) => s.store_id === currentKey) || data.stores.find((s) => s.is_current) || data.stores[0];
  const multi = data.stores.length > 1;

  function pick(s: Store) {
    setOpen(false);
    if (!s.store_id || s.store_id === currentKey) return;
    setStoreId(s.store_id);
    // hard reload so every page refetches scoped to the new store (no stale cross-store data)
    window.location.reload();
  }

  return (
    <div className="relative mb-2" ref={ref}>
      <button
        onClick={() => multi && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-[#3b82f6]/40 bg-[#3b82f6]/20 px-3 py-1.5 text-left text-xs font-semibold text-[#cfe3ff]",
          multi ? "hover:bg-[#3b82f6]/30" : "cursor-default",
        )}
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/15 text-[10px]">🏬</span>
        <span className="min-w-0 flex-1 truncate">{current?.name ?? "Store"}</span>
        {multi && <span className={`shrink-0 text-[#cfe3ff]/70 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>}
      </button>

      {open && multi && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b1b3f] shadow-xl">
          <div className="border-b border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
            Switch store ({data.stores.length})
          </div>
          {data.stores.map((s) => (
            <button
              key={s.dealer_id}
              onClick={() => pick(s)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${s.store_id === currentKey ? "bg-[#2563eb] text-white" : "text-white/80 hover:bg-white/10"}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-[10px] text-white/45">
                  {s.store_id} · {s.ro_count} ROs{s.mykaarma_configured ? " · myKaarma" : ""}
                </span>
              </span>
              {s.store_id === currentKey && <span className="shrink-0 text-white">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
