"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useBalance, useDisconnect } from "wagmi";
import { formatEther } from "viem";
import { ACTIVE_CHAIN, TESTNET_MODE, CHAIN_LABEL, CHAIN_RPC, explorerAddress, explorerTx } from "@/lib/chain";
import { detectMedia, embedSrc, type Media } from "@/lib/media";
import MonPrice from "@/components/mon-price";
import { historyEnabled, pushGift, fetchGifts, removeGift, removeAllGifts, type GiftRow } from "@/lib/history";
import IdeasChat from "@/components/ideas-chat";
const TX_RE = /^0x[0-9a-fA-F]{64}$/;

// "42" | "42s" | "1m30s" | "0:24" | "0:24.5" -> seconds
function toSec(v: string): number | null {
  const hm = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s?$/);
  if (hm && (v.includes("h") || v.includes("m") || v.includes("s"))) {
    return (parseInt(hm[1] ?? "0", 10) * 3600) + (parseInt(hm[2] ?? "0", 10) * 60) + parseFloat(hm[3]);
  }
  if (/^\d{1,6}(?:\.\d{1,3})?$/.test(v)) return parseFloat(v);
  const mmss = v.match(/^(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?$/);
  if (mmss) return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10) + (mmss[3] ? parseInt(mmss[3].padEnd(3, "0"), 10) / 1000 : 0);
  return null;
}
// extract timestamp from a YouTube share link: ?t= / &t= / #t= / &start=
function timeFromLink(link: string): number | null {
  const m = link.match(/[?&#](?:t|start)=([\dhms:.]{1,12})/i);
  if (!m) return null;
  return toSec(m[1]);
}

  // Privy-style gradient avatar: hue pair derived from the address itself
  function WalletAvatar({ address, size = 36 }: { address?: string; size?: number }) {
    const seed = address ?? "0x";
    const [failed, setFailed] = useState(false);
    const n = parseInt(seed.slice(2, 8), 16) || 0;
    const h1 = n % 360;
    const h2 = (h1 + 70 + (n % 90)) % 360;
    if (failed || !address)
      return (
        <span
          className="rounded-full shrink-0"
          style={{
            width: size,
            height: size,
            background: `radial-gradient(circle at 30% 30%, hsl(${h1} 90% 70%), hsl(${h2} 85% 55%))`,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
          }}
        />
      );
    return (
      <img
        src={`https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=e9e4fd,ede9fe,fdf2f8`}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-full shrink-0 bg-violet-50"
        style={{ width: size, height: size }}
      />
    );
  }


export default function SendClient() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  // Privy v3: wallets = all connected/embedded wallets of the logged-in user
  const { disconnect: disconnectWagmi } = useDisconnect();
  // After Privy logout the wagmi connector can still report a wallet — gate UI on session too
  const wallet = authenticated ? wallets?.[0] : undefined;
  const [txHash, setTxHash] = useState("");
  const [ytLink, setYtLink] = useState("");
  const [msg, setMsg] = useState(""); // custom message shown in the gift frame (Saweria-style)
  const [amount, setAmount] = useState(""); // MON to send directly (optional path)
  const [to, setTo] = useState(""); // friend address (optional path)
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [balanceMon, setBalanceMon] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: balance } = useBalance({
    address: wallet?.address as `0x${string}` | undefined,
    chainId: ACTIVE_CHAIN.id,
    query: { enabled: !!wallet && menuOpen, staleTime: 15_000 },
  });
  const [handle, setHandle] = useState<string | null>(null);

  // if this wallet claimed a MYTIPS handle (dashboard), show the username instead of the address
  useEffect(() => {
    if (!wallet?.address) { setHandle(null); return; }
    try {
      setHandle(
        localStorage.getItem(`ms-handle-${wallet.address}`) ??
          localStorage.getItem(`ms-handle-${wallet.address.toLowerCase()}`)
      );
    } catch {}
  }, [wallet?.address]);
  const displayName = handle ? `@${handle}` : wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "";

  // read wallet balance from the chain, shown next to the amount field
  useEffect(() => {
    const addr = wallet?.address;
    if (!addr) { setBalanceMon(null); return; }
    let dead = false;
    async function f() {
      try {
        const r = await fetch(CHAIN_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [addr, "latest"] }),
        });
        const j = await r.json();
        if (dead) return;
        if (j?.result) setBalanceMon((Number(BigInt(j.result)) / 1e18).toFixed(4));
      } catch {}
    }
    f();
    const iv = setInterval(f, 15000);
    return () => { dead = true; clearInterval(iv); };
  }, [wallet?.address]);

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  // Relay-style widget: live USD for the amount field + paste-hash toggle
  const [monUsd, setMonUsd] = useState<number | null>(null);
  const [hashOpen, setHashOpen] = useState(false);
  useEffect(() => {
    let stop = false;
    async function f() {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd");
        const j = await r.json();
        if (!stop && j?.monad) setMonUsd(j.monad.usd);
      } catch {}
    }
    f();
    const iv = setInterval(f, 60000);
    return () => { stop = true; clearInterval(iv); };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);
  const [timeStr, setTimeStr] = useState(""); // manual: "90" | "1:23" | "0:24-0:33"
  const [autoplay, setAutoplay] = useState(true); // sender's choice: video starts playing on the share page (always muted)
  const detected = detectMedia(ytLink);
  // facebook.com/share/v/… shortlinks must be resolved server-side before the plugin accepts them
  const [fbResolved, setFbResolved] = useState<string | null>(null);
  const [fbResolving, setFbResolving] = useState(false);
  const isFbShare = detected?.platform === "facebook" && /\/share\/[a-z]\//i.test(detected.id);
  useEffect(() => {
    if (!isFbShare || !detected) { setFbResolved(null); setFbResolving(false); return; }
    let cancelled = false;
    setFbResolving(true);
    fetch(`/api/resolve-fb?url=${encodeURIComponent(detected.id)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) { setFbResolved(j.url ?? null); setFbResolving(false); } })
      .catch(() => { if (!cancelled) { setFbResolved(null); setFbResolving(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected?.id, isFbShare]);
  const media: Media | null = detected
    ? isFbShare
      ? fbResolved ? { ...detected, id: fbResolved } : null
      : detected
    : null;
  const valid = TX_RE.test(txHash.trim());

  // start time: manual field wins, else auto from the link (?t= / #t= / &start=)
  const rangeParts = timeStr.trim() ? timeStr.trim().split("-").map((x) => x.trim()) : [];
  const manualStart = rangeParts.length ? toSec(rangeParts[0]) : null;
  const manualEnd = rangeParts.length === 2 ? toSec(rangeParts[1]) : null;
  const startSec = manualStart != null ? manualStart : timeFromLink(ytLink);
  const endSec = manualEnd != null && manualEnd > (startSec ?? 0) ? manualEnd : null;
  const timeBad = timeStr.trim() !== "" && (manualStart == null || (rangeParts.length === 2 && (manualEnd == null || manualEnd <= manualStart)));

  const shareUrl = (() => {
    if (!valid || !origin) return "";
    const q: string[] = [];
    if (media) {
      q.push(`v=${media.platform === "facebook" ? "fb" : media.id}`);
      if (media.platform === "facebook") q.push(`f=${encodeURIComponent(media.id)}`);
      if (media.platform !== "youtube") q.push(`p=${media.platform}`);
      if (media.vertical) q.push("sh=1");
      if (media.platform === "youtube" && startSec != null) q.push(`t=${startSec}`);
      if (media.platform === "youtube" && endSec != null) q.push(`e=${endSec}`);
      if (autoplay) q.push("ap=1");
    }
    const m = msg.trim();
    if (m) q.push(`msg=${encodeURIComponent(m.slice(0, 500))}`);
    return `${origin}/tx/${txHash.trim()}${q.length ? `?${q.join("&")}` : ""}`;
  })();
  const previewMedia = media;

  // ── short link: mytips.fun/g/xxxxxxx instead of the giant query URL ──
  const [shortUrl, setShortUrl] = useState("");
  useEffect(() => {
    setShortUrl("");
    if (!shareUrl) return;
    let alive = true;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: shareUrl }),
          signal: ctrl.signal,
        });
        const j = await r.json();
        if (alive && j?.slug) setShortUrl(`https://mytips.fun/g/${j.slug}`);
      } catch {}
    }, 400);
    return () => { alive = false; clearTimeout(t); ctrl.abort(); };
  }, [shareUrl]);
  const finalUrl = shortUrl || shareUrl;

  // ── per-wallet send history (localStorage, no backend) ──
  type HistItem = { hash: string; to: string; amount: string; video: string; link: string; ts: number; msg?: string };
  const [tab, setTab] = useState<"send" | "ideas" | "history">("send");
  const [history, setHistory] = useState<HistItem[]>([]);
  const histKey = wallet?.address ? `ms-history-${wallet.address.toLowerCase()}` : null;

  useEffect(() => {
    if (!histKey) { setHistory([]); return; }
    try { setHistory(JSON.parse(localStorage.getItem(histKey) || "[]")); } catch { setHistory([]); }
    // sync from server (Supabase) — cross-device history
    if (historyEnabled() && wallet?.address) {
      fetchGifts(wallet.address).then((rows) => {
        if (!rows.length) return;
        const server: HistItem[] = rows.map((r: GiftRow) => ({
          hash: r.tx_hash,
          to: r.to_addr,
          amount: r.amount,
          video: r.video_url,
          link: r.share_link,
          msg: r.message || undefined,
          ts: typeof r.created_at === "number" ? r.created_at * 1000 : r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        }));
        setHistory((local) => {
          const seen = new Set(server.map((s) => s.hash));
          const merged = [...server, ...local.filter((l) => !seen.has(l.hash))];
          try { localStorage.setItem(histKey, JSON.stringify(merged.slice(0, 50))); } catch {}
          return merged.slice(0, 50);
        });
      });
    }
  }, [histKey]);

  // upsert whenever a valid tx hash exists (from Send or pasted) — keeps video/amount in sync
  useEffect(() => {
    if (!histKey || !valid) return;
    const hash = txHash.trim().toLowerCase();
    setHistory((prev) => {
      const item: HistItem = { hash, to: to.trim(), amount: amount.trim(), video: ytLink.trim(), link: finalUrl, ts: Date.now(), msg: msg.trim() || undefined };
      const idx = prev.findIndex((p) => p.hash === hash);
      let next: HistItem[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...prev[idx], ...item, ts: prev[idx].ts || item.ts };
      } else {
        next = [item, ...prev].slice(0, 50);
      }
      try { localStorage.setItem(histKey, JSON.stringify(next)); } catch {}
      return next;
    });
    // fire-and-forget sync to server
    if (historyEnabled() && wallet?.address) {
      pushGift({
        wallet: wallet.address,
        tx_hash: txHash.trim(),
        to_addr: to.trim() || wallet.address,
        amount: amount.trim(),
        video_url: ytLink.trim(),
        share_link: finalUrl,
        message: msg.trim() || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histKey, valid, txHash, to, amount, ytLink, shareUrl, msg, finalUrl]);

  function deleteHistory(hash: string) {
    setHistory((prev) => {
      const next = prev.filter((p) => p.hash !== hash);
      if (histKey) { try { localStorage.setItem(histKey, JSON.stringify(next)); } catch {} }
      return next;
    });
    if (historyEnabled() && wallet?.address) removeGift(wallet.address, hash);
  }
  function clearHistory() {
    setHistory([]);
    if (histKey) { try { localStorage.removeItem(histKey); } catch {} }
    if (historyEnabled() && wallet?.address) removeAllGifts(wallet.address);
  }
  function fmtTs(ts: number) {
    return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  async function copyHistLink(link: string) {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus("Copy failed — select the link manually");
    }
  }

  async function sendDirect() {
    if (!wallet) {
      setStatus("Connect wallet first (top right)");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setStatus("Enter an amount in MON");
      return;
    }
    const bal = balanceMon != null ? parseFloat(balanceMon) : null;
    if (bal != null && amt > bal) {
      setStatus(`Not enough balance — wallet has ${bal} MON`);
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(to.trim())) {
      setStatus("Friend's address looks wrong (0x…)");
      return;
    }
    try {
      setStatus("Confirm in your wallet…");
      const provider = await wallet.getEthereumProvider();
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: to.trim(),
            value: "0x" + BigInt(Math.floor(amt * 1e18)).toString(16),
          },
        ],
      })) as string;
      setTxHash(hash);
      setStatus("");
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Send failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] text-slate-900">
      <header className="px-4 py-4 flex items-center justify-between gap-2 max-w-md mx-auto w-full">
        <Link href="/" className="font-bold text-base tracking-tight flex items-center shrink-0">
          <img src="/mytips-icon.png" alt="" className="w-[32px] h-[32px] inline-block" />
          MY<span className="text-violet-600">TIPS</span>
        </Link>
        <div className="flex items-center justify-end min-w-0 shrink-0">
          <MonPrice compact />
        </div>
        <div className="flex items-center justify-end min-w-0 shrink-0">
          {!ready ? null : wallet ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-black rounded-full pl-1 pr-2.5 py-1 transition-colors shadow-sm"
              >
                <WalletAvatar size={20} />
                <span className="text-[11px] font-semibold text-white tracking-tight max-w-[90px] truncate">{displayName}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/60 shrink-0" fill="none">
                  <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-20 text-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-1 rounded-full ring-1 ring-slate-200">
                      <WalletAvatar address={wallet?.address} size={56} />
                    </div>
                    <p className="font-bold mt-2.5 text-[15px]">{handle ? `@${handle}` : "Connected Wallet"}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(wallet.address);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      }}
                      title="Copy address"
                      className="mt-2 flex items-center gap-2 max-w-full bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <code className="text-[12px] text-slate-700 truncate">{wallet.address}</code>
                      {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-600 shrink-0">
                          <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-500 shrink-0">
                          <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                    <p className="mt-2.5 text-[13px] font-semibold text-slate-800">
                      {balance
                        ? `${formatEther(balance.value).slice(0, 9).replace(/\.?0*$/, "")} ${balance.symbol}`
                        : "…"}
                      <span className="text-[11px] font-normal text-slate-400">
                        {" "}· {CHAIN_LABEL}
                      </span>
                    </p>
                  </div>
                  <div className="border-t border-slate-100 mt-3.5 -mb-1 pt-1.5 space-y-0.5">
                    <a
                      href={explorerAddress(wallet.address)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 text-slate-800 font-medium"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-slate-600 shrink-0">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      View in explorer
                    </a>
                    <button
                      onClick={() => {
                        logout();
                        try { disconnectWagmi(); } catch {}
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 text-slate-800 font-medium text-left"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500 shrink-0">
                        <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M10 8l-4 4 4 4M6 12h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => login({ loginMethods: ["wallet", "email", "sms"] })}
              className="rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700"
            >
              Connect wallet
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto mt-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        {/* tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
          <button
            onClick={() => setTab("send")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${tab === "send" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            🎁 Send
          </button>
          <button
            onClick={() => setTab("ideas")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${tab === "ideas" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            💡 Ideas
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${tab === "history" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            History{history.length > 0 ? ` (${history.length})` : ""}
          </button>
        </div>

        {tab === "ideas" ? (
          <IdeasChat
            onUseMessage={(m) => {
              setMsg(m);
              setTab("send");
            }}
          />
        ) : tab === "history" ? (
          <div>
            <h1 className="text-xl font-bold">📜 Send history</h1>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Gifts sent from this wallet on this device — tap one to reopen its share link.
            </p>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <p className="text-3xl">🕰️</p>
                <p className="text-sm text-slate-500 mt-2">
                  {wallet ? "No sends yet — your gifts will appear here." : "Connect a wallet to see your history."}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.hash} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded-full ring-1 ring-slate-200 shrink-0 mt-0.5">
                          <WalletAvatar address={h.to || h.hash} size={28} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {h.amount ? `${h.amount} MON` : "Gift"}
                            {h.to && (
                              <span className="font-normal text-slate-500">
                                {" "}→ {h.to.slice(0, 6)}…{h.to.slice(-4)}
                              </span>
                            )}
                          </p>
                          {h.msg && (
                            <p className="text-[12px] text-slate-600 mt-1 italic line-clamp-2">“{h.msg}”</p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {fmtTs(h.ts)} ·{" "}
                            <a
                              href={explorerTx(h.hash)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono hover:text-violet-600"
                            >
                              {h.hash.slice(0, 10)}…{h.hash.slice(-6)}
                            </a>
                            {h.video && <span className="ml-1">· 🎬 video attached</span>}
                          </p>
                          {h.link && (
                            <div className="flex gap-1.5 mt-2">
                              <a
                                href={h.link}
                                className="text-[11px] rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium hover:bg-violet-50"
                              >
                                Open page →
                              </a>
                              <button
                                onClick={() => copyHistLink(h.link)}
                                className="text-[11px] rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium hover:bg-violet-50"
                              >
                                {copied ? "✓ Copied" : "Copy link"}
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteHistory(h.hash)}
                          title="Remove from history"
                          className="text-slate-300 hover:text-red-500 shrink-0 p-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m3 0l-.8 12a2 2 0 01-2 1.9H8.8a2 2 0 01-2-1.9L6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={clearHistory}
                  className="mt-3 text-xs text-slate-400 hover:text-red-500"
                >
                  Clear all history
                </button>
              </>
            )}
          </div>
        ) : (
        <>
        {/* ── Relay-bridge style widget ── */}

        {/* SELL panel = you send */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 transition-colors focus-within:border-violet-300">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-700">Send</span>
            {wallet ? (
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 pl-1.5 pr-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors">
                <WalletAvatar address={wallet.address} size={18} />
                <span className="max-w-[90px] truncate">{displayName}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-400 shrink-0"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              </button>
            ) : (
              <button onClick={() => login({ loginMethods: ["wallet", "email", "sms"] })} className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-violet-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors">
                Select wallet
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-slate-400"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent text-[32px] font-bold text-slate-900 outline-none placeholder:text-slate-300 tabular-nums"
              />
              <p className="text-[12px] text-slate-400 mt-0.5 tabular-nums">
                ${((parseFloat(amount || "0") * (monUsd ?? 0)) || 0).toFixed(amount && parseFloat(amount) < 1 ? 4 : 2)} USD
                {balanceMon != null && <span className="ml-2 text-slate-300">· balance {balanceMon}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {balanceMon != null && (
                <button
                  onClick={() => setAmount(String(Math.max(0, parseFloat(balanceMon) - 0.01)))}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 uppercase tracking-wide"
                >
                  Max
                </button>
              )}
              <span title={CHAIN_LABEL} className="flex items-center gap-2 rounded-full bg-white border border-slate-200 pl-1.5 pr-3 py-1.5 cursor-default">
                <span className="h-6 w-6 rounded-full bg-violet-600 text-white grid place-items-center text-[11px] font-black shadow-sm">$</span>
                <span className="text-sm font-bold text-slate-900">MON</span>
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl bg-white border border-slate-200 focus:border-violet-300 outline-none px-3.5 py-2.5 text-[13px] font-mono text-slate-700 placeholder:text-slate-400 placeholder:font-sans transition-colors"
              placeholder="Friend wallet 0x…"
            />
          </div>
          <button onClick={() => setHashOpen((o) => !o)} className="mt-2 text-[11px] text-slate-400 hover:text-violet-600 transition-colors">
            {hashOpen ? "− hide" : "Already sent? paste tx hash +"}
          </button>
          {hashOpen && (
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className={`mt-1.5 w-full rounded-xl bg-white border outline-none px-3.5 py-2.5 text-[13px] font-mono ${txHash && !valid ? "border-red-300" : "border-slate-200 focus:border-violet-300"}`}
              placeholder="0x… transaction hash"
            />
          )}
          {txHash && valid && <p className="text-[11px] text-emerald-600 mt-1.5">✓ transaction detected</p>}
        </div>

        {/* circular switch = the gift drops down */}
        <div className="flex justify-center -my-2.5 relative z-10 pointer-events-none">
          <span className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm grid place-items-center text-base">🎁</span>
        </div>

        {/* BUY panel = friend receives */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 transition-colors focus-within:border-violet-300">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-700">Gift</span>
            <span className="text-[11px] text-slate-400">optional · up to 3 fields</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <input
                value={ytLink}
                onChange={(e) => setYtLink(e.target.value)}
                placeholder="Paste video link"
                className="w-full bg-transparent text-[22px] font-bold text-slate-900 outline-none placeholder:text-slate-300 placeholder:font-semibold"
              />
              <p className="text-[12px] text-slate-400 mt-0.5">
                {media ? (
                  <span className="text-emerald-600 font-medium">✓ {media.label}{media.platform === "youtube" && startSec != null ? ` · starts ${Math.round(startSec * 10) / 10}s` : ""}</span>
                ) : fbResolving ? (
                  <span className="animate-pulse">Resolving link…</span>
                ) : ytLink.trim() ? (
                  <span className="text-red-500">Not recognized — YouTube / Facebook / X / TikTok / Instagram</span>
                ) : (
                  "YouTube, TikTok, X, Facebook, Instagram"
                )}
              </p>
            </div>
            <span className="h-9 w-9 shrink-0 rounded-full bg-white border border-slate-200 grid place-items-center text-lg cursor-default" title="Video gift">🎬</span>
          </div>
          {media?.platform === "youtube" && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                inputMode="numeric"
                placeholder="0:24-0:33"
                className={`w-28 rounded-xl bg-white border outline-none px-3 py-2 text-sm font-mono ${timeBad ? "border-red-300" : "border-slate-200 focus:border-violet-300"}`}
              />
              <span className="text-[11px] text-slate-400">
                {timeBad ? "seconds (90), mm:ss (1:30) or range (0:24-0:33)" : "clip window — blank = whole video"}
              </span>
            </div>
          )}
          {media && (
            <label className="mt-3 flex items-center gap-3 cursor-pointer select-none rounded-xl bg-white border border-slate-200 px-3 py-2.5">
              <span className="text-[13px] font-medium text-slate-700 flex-1">
                Auto-play for your friend
                <span className="block text-[11px] font-normal text-slate-400">Always starts muted — they tap to unmute.</span>
              </span>
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="sr-only" />
              <span aria-hidden="true" className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${autoplay ? "bg-violet-600" : "bg-slate-200"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${autoplay ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </span>
            </label>
          )}
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
            className="mt-3 w-full rounded-xl bg-white border border-slate-200 focus:border-violet-300 outline-none px-3.5 py-2.5 text-sm resize-none transition-colors"
            placeholder="Write a message…"
          />
          <p className="text-[10px] text-slate-300 text-right -mt-0.5">{msg.length}/500</p>
        </div>

        {/* CTA */}
        {!shareUrl ? (
          wallet ? (
            <button
              onClick={sendDirect}
              disabled={!amount || parseFloat(amount) <= 0 || !/^0x[0-9a-fA-F]{40}$/.test(to.trim())}
              className="mt-4 w-full rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3.5 text-[15px] font-bold transition-colors"
            >
              {status === "Confirm in your wallet…" ? "Confirm in wallet…" : amount && parseFloat(amount) > 0 ? `Send ${amount} MON` : "Enter an amount"}
            </button>
          ) : (
            <button
              onClick={() => login({ loginMethods: ["wallet", "email", "sms"] })}
              className="mt-4 w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white py-3.5 text-[15px] font-bold uppercase tracking-wide transition-colors"
            >
              Connect wallet
            </button>
          )
        ) : (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Share link — ready 🎉</p>
            <div className="flex gap-2 mt-2 items-center">
              <input readOnly value={finalUrl} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-mono" />
              <button onClick={copyLink} className="rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700 shrink-0">{copied ? "✓" : "Copy"}</button>
            </div>
            {previewMedia && (
              <div className="mt-3 overflow-hidden rounded-xl border border-violet-200">
                <iframe
                  src={embedSrc(previewMedia, { autoplay: false, enableJsApi: false, start: previewMedia.platform === "youtube" ? startSec : null })}
                  className="w-full"
                  style={{ aspectRatio: previewMedia.vertical ? "9/16" : "16/9", border: 0, maxHeight: 420 }}
                  allow="accelerometer; encrypted-media; picture-in-picture; autoplay; fullscreen"
                  allowFullScreen
                  title="video preview"
                />
                <p className="text-[10px] text-slate-400 px-2 py-1 bg-slate-50">{previewMedia.label} · what your friend will see</p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <a href={`https://t.me/share/url?url=${encodeURIComponent(finalUrl)}`} target="_blank" rel="noopener" className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white">Share on Telegram</a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Sent you something 🎁")}&url=${encodeURIComponent(finalUrl)}`} target="_blank" rel="noopener" className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white">Share on X</a>
              <a href={finalUrl} className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white">Open page →</a>
            </div>
            <button
              onClick={() => {
                // reset only the gift/video part — keep `to` + `amount` so the user
                // can immediately send the next gift without a page refresh
                setYtLink("");
                setTimeStr("");
                setMsg("");
                setTxHash("");
                setHashOpen(false);
                setShortUrl("");
                setStatus("");
              }}
              className="mt-3 w-full rounded-xl bg-violet-600 text-white py-2.5 text-[13px] font-bold hover:bg-violet-700 transition-colors"
            >
              🎁 Send another gift
              <span className="block text-[10px] font-normal opacity-80">clears video & message — keeps address and amount</span>
            </button>
          </div>
        )}

        {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
        </>
        )}
      </div>
    </main>
  );
}
