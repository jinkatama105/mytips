"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useBalance } from "wagmi";
import { formatEther } from "viem";
import { monadTestnet } from "viem/chains";
import MonPrice from "@/components/mon-price";

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;
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
  const { connectedWallets, wallets } = useWallets();
  // Privy embedded wallets aren't "connected" in the injected sense — fall back to them
  const wallet = connectedWallets?.[0] ?? wallets?.[0];
  const [txHash, setTxHash] = useState("");
  const [ytLink, setYtLink] = useState("");
  const [amount, setAmount] = useState(""); // MON to send directly (optional path)
  const [to, setTo] = useState(""); // friend address (optional path)
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [balanceMon, setBalanceMon] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: balance } = useBalance({
    address: wallet?.address as `0x${string}` | undefined,
    chainId: monadTestnet.id,
    enabled: !!wallet && menuOpen,
    query: { staleTime: 15_000 },
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
    if (!wallet?.address) { setBalanceMon(null); return; }
    let dead = false;
    async function f() {
      try {
        const r = await fetch("https://rpc-testnet.monad.xyz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [wallet.address, "latest"] }),
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
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);
  const [timeStr, setTimeStr] = useState(""); // manual: "90" | "1:23" | "0:24-0:33"
  const [autoplay, setAutoplay] = useState(true); // sender's choice: video starts playing on the share page (always muted)
  const ytId = ytLink.trim() ? ytLink.match(YT_RE)?.[1] ?? null : null;
  const valid = TX_RE.test(txHash.trim());

  // start time: manual field wins, else auto from the link (?t= / #t= / &start=)
  const rangeParts = timeStr.trim() ? timeStr.trim().split("-").map((x) => x.trim()) : [];
  const manualStart = rangeParts.length ? toSec(rangeParts[0]) : null;
  const manualEnd = rangeParts.length === 2 ? toSec(rangeParts[1]) : null;
  const startSec = manualStart != null ? manualStart : timeFromLink(ytLink);
  const endSec = manualEnd != null && manualEnd > (startSec ?? 0) ? manualEnd : null;
  const timeBad = timeStr.trim() !== "" && (manualStart == null || (rangeParts.length === 2 && (manualEnd == null || manualEnd <= manualStart)));

  const shareUrl = valid && origin
    ? `${origin}/tx/${txHash.trim()}${ytId ? `?v=${ytId}${/\/shorts\//i.test(ytLink) ? "&sh=1" : ""}${startSec != null ? `&t=${startSec}` : ""}${endSec != null ? `&e=${endSec}` : ""}${autoplay ? "&ap=1" : ""}` : ""}`
    : "";
  const previewVid = shareUrl ? new URL(shareUrl).searchParams.get("v") : null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
      <header className="px-6 py-4 flex items-center justify-between max-w-md mx-auto w-full">
        <Link href="/" className="font-bold text-lg tracking-tight flex items-center">
          <img src="/mytips-icon.png" alt="" className="w-[36px] h-[36px] inline-block" />
          MY<span className="text-violet-600">TIPS</span>
        </Link>
        <div className="flex items-center gap-3">
          <MonPrice />
          {!ready ? null : wallet ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-black rounded-full pl-1 pr-2.5 py-1 transition-colors shadow-sm"
              >
                <WalletAvatar size={20} />
                <span className="text-[11px] font-semibold text-white tracking-tight max-w-[110px] truncate">{displayName}</span>
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
                        {" "}· Monad Testnet
                      </span>
                    </p>
                  </div>
                  <div className="border-t border-slate-100 mt-3.5 -mb-1 pt-1.5 space-y-0.5">
                    <a
                      href={`https://testnet.monadexplorer.com/address/${wallet.address}`}
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
        <h1 className="text-xl font-bold">🎁 Send to a friend</h1>
        <p className="text-sm text-slate-500 mt-1">
          Send MON directly or paste any transaction hash, attach a YouTube video, then share the
          link — X, Telegram & WhatsApp show the video right in the preview card.
        </p>

        {/* direct send (optional) */}
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Step 1 · send MON from your wallet
          </p>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono"
            placeholder="Friend wallet 0x…"
          />
          <div className="flex gap-2 mt-2">
            <div className="relative flex-1">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm pr-14"
                placeholder="Amount MON"
              />
              {balanceMon != null && (
                <button
                  onClick={() => setAmount(String(Math.max(0, parseFloat(balanceMon) - 0.01)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-violet-600 hover:text-violet-800"
                >
                  MAX
                </button>
              )}
            </div>
            <button
              onClick={sendDirect}
              disabled={!wallet}
              className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-40"
            >
              {status === "Confirm in your wallet…" ? "Confirm…" : "Send"}
            </button>
          </div>
          {wallet ? (
            <p className="text-[11px] text-slate-400 mt-1.5">
              Balance: {balanceMon ?? "…"} MON · sent straight from your wallet balance
            </p>
          ) : (
            <p className="text-[11px] text-amber-600 mt-1.5">Connect wallet above to send directly.</p>
          )}
        </div>

        {/* tx hash */}
        <label className="block mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Step 2 · transaction hash (automatic after Send)
        </label>
        <input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className={`mt-1 w-full rounded-xl border px-4 py-2.5 text-sm font-mono ${
            txHash && !valid ? "border-red-300" : "border-slate-200"
          }`}
          placeholder="auto-filled after Send — or paste any 0x… hash"
        />
        {txHash && valid && (
          <p className="text-[11px] text-emerald-600 mt-1">✓ transaction detected — no need to paste anything</p>
        )}

        {/* youtube link */}
        <label className="block mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Step 3 · video (optional)
        </label>
        <input
          value={ytLink}
          onChange={(e) => setYtLink(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          placeholder="YouTube link — video or Shorts"
        />
        {ytLink.trim() && !ytId && (
          <p className="text-xs text-red-500 mt-1">Not a YouTube link (watch?v=…, youtu.be/…, shorts/…)</p>
        )}
        {ytId && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              inputMode="numeric"
              placeholder="0:24-0:33"
              className={`w-28 rounded-xl border px-3 py-2 text-sm ${timeBad ? "border-red-300" : "border-slate-200"}`}
            />
            <span className="text-xs text-slate-500">
              {timeBad
                ? "Use seconds (90), mm:ss (1:30) or a range (0:24-0:33)"
                : startSec != null
                  ? `▶ starts at ${Math.round(startSec * 10) / 10}s${endSec != null ? ` · stops at ${Math.round(endSec * 10) / 10}s` : ""}${manualStart == null ? " — auto-picked from your link, edit here to override" : ""}`
                  : "start at a second (90 or 0:24) or a range (0:24-0:33) — blank = from the beginning"}
            </span>
          </div>
        )}
        {ytId && (
          <label className="mt-3 flex items-center gap-3 cursor-pointer select-none rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="text-sm font-medium text-slate-700 flex-1">
              Play the video automatically
              <span className="block text-[11px] font-normal text-slate-400">
                Always starts muted — the viewer taps unmute. Off = they tap play first.
              </span>
            </span>
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                autoplay ? "bg-violet-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                  autoplay ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </span>
          </label>
        )}

        {/* generated share link */}
        {shareUrl && (
          <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
              Share link — ready 🎉
            </p>
            <div className="flex gap-2 mt-2 items-center">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={copyLink}
                className="rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 shrink-0"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
            {previewVid && (
              <div className="mt-3 overflow-hidden rounded-xl border border-violet-200">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewVid}?autoplay=0&rel=0${startSec != null ? `&start=${Math.floor(startSec)}` : ""}`}
                  className="w-full"
                  style={{ aspectRatio: "16/9", border: 0 }}
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title="video preview"
                />
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener"
                className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white"
              >
                Share on Telegram
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Sent you something 🎁")}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener"
                className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white"
              >
                Share on X
              </a>
              <a
                href={shareUrl}
                className="text-xs rounded-lg border border-violet-300 px-3 py-1.5 font-medium hover:bg-white"
              >
                Open page →
              </a>
            </div>
          </div>
        )}

        {status && <p className="mt-4 text-sm text-red-600">{status}</p>}
      </div>
    </main>
  );
}
