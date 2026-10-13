"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { monadTestnet, monad } from "viem/chains";
import { embedSrc, type Media } from "@/lib/media";
import { explorerTx } from "@/lib/chain";

const RPC_TEST = createPublicClient({ chain: monadTestnet, transport: http() });
const RPC_MAIN = createPublicClient({ chain: monad, transport: http() });

type TxData = { from: string; to: string | null; value: string; block: number; onMain: boolean; ts: number | null };

export default function TxView({ hash, media, start, end, autoplay, message }: { hash: string; media: Media | null; start: number | null; end: number | null; autoplay: boolean; message: string | null }) {
  const [data, setData] = useState<TxData | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [blockTs, setBlockTs] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [speaking, setSpeaking] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  // live clock while a gift is on-chain
  useEffect(() => {
    if (!blockTs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [blockTs]);

  // read the message aloud (browser voices, free — no backend)
  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("This browser can't read the message aloud.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(message || "");
    const indo = /\b(apa|gimana|kenapa|terima|makasih|ulang|tahun|selamat|sayang|doang|banget|kok|sih|nih|dong)\b/i.test(message || "");
    u.lang = indo ? "id-ID" : "en-US";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // receiver can unmute at any time; muting again is also allowed
  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try {
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: next ? "mute" : "unMute" }),
        "*"
      );
      if (!next) playerRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "playVideo" }), "*");
    } catch {}
  }

  useEffect(() => {
    let dead = false;
    async function load() {
      setError("");
      setData(null);
      const candidates: Array<[ReturnType<typeof createPublicClient>, boolean]> = [
        [RPC_TEST as any, false],
        [RPC_MAIN as any, true],
      ];
      for (const [client, onMain] of candidates) {
        try {
          const [tx, rcpt] = await Promise.all([
            client.getTransaction({ hash: hash as `0x${string}` }),
            client.getTransactionReceipt({ hash: hash as `0x${string}` }),
          ]);
          if (dead) return;
          if (!rcpt) continue;
          let ts: number | null = null;
          try {
            const blk = await client.getBlock({ blockNumber: rcpt.blockNumber } as any);
            ts = Number(blk.timestamp) * 1000;
          } catch {}
          if (dead) return;
          setData({
            from: tx.from,
            to: tx.to ?? null,
            value: formatEther(tx.value ?? 0n),
            block: Number(rcpt.blockNumber),
            onMain,
            ts,
          });
          setBlockTs(ts);
          return;
        } catch {
          /* try next chain */
        }
      }
      if (!dead) setError("Transaction not found on Monad yet — it may still be confirming.");
    }
    load();
    const retry = setInterval(() => {
      if (!data && !error) load();
    }, 8000);
    return () => {
      dead = true;
      clearInterval(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  return (
    <main className="min-h-screen bg-[#faf9fc] text-slate-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center mb-6">
          <img src="/mytips-icon.png" alt="" className="w-[36px] h-[36px] inline-block" />
          <span className="font-bold text-lg tracking-tight ml-0">
            MY<span className="text-violet-600">TIPS</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="text-5xl mb-2 animate-[popin_0.6s_cubic-bezier(0.2,1.4,0.4,1)]">🎁</div>
          <h1 className="text-xl font-bold">A gift arrived on-chain</h1>
          {data ? (
            <>
              <p className="text-3xl font-extrabold text-violet-600 mt-3">
                {Number(data.value) > 0 ? `${data.value} MON` : "Transaction"}
              </p>
              <a
                href={explorerTx(hash, data.onMain)}
                target="_blank"
                rel="noreferrer"
                title="Check explorer"
                className="group relative mt-2 block rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-300 hover:bg-violet-50/60 transition-colors px-3 py-2 text-[11px] font-mono text-slate-500 break-all"
              >
                {hash} <span className="text-violet-500 font-sans font-semibold">↗</span>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-sans font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap shadow-lg">
                  Check explorer
                </span>
              </a>
              <p className="text-xs text-slate-400 mt-2 tabular-nums">
                {data.onMain ? "Monad Mainnet" : "Monad Testnet"} · block {data.block.toLocaleString()} ·{" "}
                {data.ts
                  ? now - data.ts < 60000
                    ? "confirmed just now"
                    : now - data.ts < 3600000
                      ? `confirmed ${Math.floor((now - data.ts) / 60000)} min ago`
                      : `confirmed ${new Date(data.ts).toLocaleString()}`
                  : "confirmed"}
                {data.ts && now - data.ts < 3600000 && <span className="ml-1 text-emerald-500 animate-pulse">● live</span>}
              </p>
            </>
          ) : error ? (
            <p className="text-sm text-slate-400 mt-3">{error}</p>
          ) : (
            <p className="text-sm text-slate-400 mt-3 animate-pulse">Checking the chain…</p>
          )}

          {!data && (
            <a
              href={explorerTx(hash)}
              target="_blank"
              rel="noreferrer"
              title="Check explorer"
              className="group relative mt-4 block rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-300 hover:bg-violet-50/60 transition-colors px-3 py-2 text-[11px] font-mono text-slate-500 break-all"
            >
              {hash} <span className="text-violet-500 font-sans font-semibold">↗</span>
            </a>
          )}

          {(message || media) && (
            <>
          {message && (
            <div className="mt-5 rounded-2xl border-2 border-violet-200 bg-gradient-to-b from-violet-50/70 to-white p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 text-center mb-2">
                Message from the sender
              </p>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[16px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words text-center">
                    “{message}”
                  </p>
                  <button
                    onClick={speak}
                    title={speaking ? "Stop reading" : "Read the message aloud"}
                    className={`shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${speaking ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-violet-600 hover:border-violet-300"}`}
                  >
                    {speaking ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 5V5z" />
                        <path d="M15.5 8.5a5 5 0 010 7" />
                        <path d="M18.5 5.5a9 9 0 010 13" />
                      </svg>
                    )}
                  </button>
                </div>
            </div>
          )}
          {media && (
            <div
              className={`overflow-hidden rounded-xl border border-slate-200 shadow-sm relative ${message ? "mt-4" : "mt-5"}`}
              style={media.vertical ? { width: "min(calc(100vw - 12px), calc(88vh * 9 / 16))", aspectRatio: "9/16", marginLeft: "calc(50% - min(calc(100vw - 12px), calc(88vh * 9 / 16)) / 2)" } : { width: "100%", aspectRatio: "16/9" }}
            >
              <iframe
                ref={playerRef}
                src={embedSrc(media, { autoplay, muted: true, start, end, enableJsApi: media.platform === "youtube" })}
                className="w-full h-full"
                style={{ border: 0 }}
                allow="accelerometer; encrypted-media; picture-in-picture; autoplay; fullscreen; clipboard-write; autoplay-camera"
                allowFullScreen
                title="gift video"
              />
              {media.platform === "youtube" ? (
                <>
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 transition-colors"
              >
                {muted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 5V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 5V5z" />
                    <path d="M15.5 8.5a5 5 0 010 7" />
                    <path d="M18.5 5.5a9 9 0 010 13" />
                  </svg>
                )}
              </button>
              {autoplay && muted && (
                <p className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  Tapping unmute plays with sound
                </p>
              )}
                </>
              ) : (
                <p className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {media.label} · tap the player for sound
                </p>
              )}
            </div>
          )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sent with{" "}
          <a href="/" className="text-violet-500 underline">
            MYTIPS
          </a>{" "}
          · tips & gifts land straight in wallets, no escrow
        </p>
      </div>
      <style>{`@keyframes popin{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </main>
  );
}
