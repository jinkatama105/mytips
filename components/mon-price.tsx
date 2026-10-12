"use client";

import { useEffect, useState } from "react";

// Live MON price via CoinGecko (free, no key). Refreshes every 60s.
export default function MonPrice({ compact = false }: { compact?: boolean }) {
  const [usd, setUsd] = useState<number | null>(null);
  const [chg, setChg] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    async function fetchPrice() {
      try {
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd&include_24hr_change=true"
        );
        const j = await r.json();
        if (!stop && j?.monad) {
          setUsd(j.monad.usd);
          setChg(j.monad.usd_24h_change ?? null);
        }
      } catch {}
    }
    fetchPrice();
    const iv = setInterval(fetchPrice, 60000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  if (usd == null) return null;
  const up = (chg ?? 0) >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 ${
        compact ? "" : "shadow-sm"
      }`}
      title="Live MON price · CoinGecko"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      MON&nbsp;<span className="font-bold">${usd.toFixed(4)}</span>
      {chg != null && (
        <span className={`${up ? "text-emerald-600" : "text-rose-600"} ${compact ? "hidden sm:inline" : ""}`}>
          {up ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
        </span>
      )}
    </span>
  );
}
