"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { monadTestnet } from "viem/chains";
import { TIPJAR_ADDRESS, tipJarAbi } from "@/lib/contract";

const RPC = createPublicClient({ chain: monadTestnet, transport: http() });

type Tip = { id: string; from: string; amount: string; message: string };

// alert placement presets — pick with ?pos= in the overlay URL
const POS: Record<string, React.CSSProperties> = {
  "top-center": { top: "8%", left: "50%", transform: "translateX(-50%)" },
  "top-left": { top: "8%", left: "3%" },
  "top-right": { top: "8%", right: "3%" },
  center: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  "bottom-center": { bottom: "12%", left: "50%", transform: "translateX(-50%)" },
  "bottom-left": { bottom: "12%", left: "3%" },
  "bottom-right": { bottom: "12%", right: "3%" },
};

function videoIdOf(msg: string): string | null {
  const m = msg.match(/\|vid:([\w-]{11})/);
  return m ? m[1] : null;
}
function videoStartOf(msg: string): number | null {
  const m = msg.match(/\|t:(\d{1,5}(?:\.\d{1,3})?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n > 0 ? n : null;
}
function videoEndOf(msg: string): number | null {
  const m = msg.match(/\|e:(\d{1,5}(?:\.\d{1,3})?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n > 0 ? n : null;
}
function isShort(msg: string): boolean {
  return /\|sh:1/.test(msg);
}

function nameOf(msg: string): string | null {
  const m = msg.match(/\|n:([^|]+)/);
  if (!m) return null;
  const n = m[1].trim();
  return n || null;
}

function displayMsg(msg: string): string {
  return msg.replace(/\s*\|vid:[\w-]+/g, "").replace(/\s*\|t:\d+(?:\.\d+)?/g, "").replace(/\s*\|e:\d+(?:\.\d+)?/g, "").replace(/\s*\|n:[^|]+/g, "").replace(/\s*\|sh:1/g, "").trim();
}

// YouTube player via IFrame API so start time can be fractional (millisecond
// precision — e.g. 1.250s). URL embed &start= only accepts whole seconds.
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let ytApiPromise: Promise<any> | null = null;
function loadYtApi(): Promise<any> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApiPromise;
}
function YTEmbed({ id, start, end, width, height }: { id: string; start: number | null; end: number | null; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let player: any;
    let cancelled = false;
    let watchTimer: any;
    loadYtApi().then((YT) => {
      if (cancelled || !ref.current) return;
      player = new YT.Player(ref.current, {
        width,
        height,
        videoId: id,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            const t = start && start > 0 ? start : 0;
            if (t > 0) e.target.seekTo(t, true);
            e.target.playVideo();
            if (end != null) {
              // range clip (0:24-0:33): pause once the end second is reached
              watchTimer = setInterval(() => {
                if (cancelled) return;
                const cur = e.target.getCurrentTime?.();
                if (cur != null && cur >= end - 0.05) {
                  clearInterval(watchTimer);
                  try { e.target.pauseVideo(); } catch {}
                }
              }, 100);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (watchTimer) clearInterval(watchTimer);
      try {
        player?.destroy();
      } catch {}
    };
  }, [id, start, end, width, height]);
  return <div ref={ref} style={{ width, height }} />;
}

// tiny coin chime via WebAudio (no asset files needed; works in OBS CEF)
function useTipSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  return function play() {
    try {
      const AC =
        window.AudioContext ||
        (window as any).webkitAudioContext;
      if (!ctxRef.current) ctxRef.current = new AC();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      // two-note "ding" — E6 then B6
      [
        [830, 0, 0.1],
        [1560, 0.09, 0.35],
      ].forEach(([freq, off, dur]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.25, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t + off);
        o.stop(t + off + dur + 0.05);
      });
    } catch {
      /* audio not allowed — ignore, visual still works */
    }
  };
}

export default function Overlay({ handle }: { handle: string }) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [big, setBig] = useState<Tip | null>(null);
  const [pos] = useState(() => {
    if (typeof window === "undefined") return "top-center";
    return new URLSearchParams(window.location.search).get("pos") || "top-center";
  });
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const playSound = useTipSound();

  function playVoice(msg: string) {
    try {
      const clean = msg.replace(/[“”]/g, "").replace(/\|vid:[\w-]+/g, "").replace(/\|t:\d+/g, "").replace(/\|e:\d+/g, "").replace(/\|n:[^|]+/g, "").replace(/\|sh:1/g, "").trim();
      if (!clean) return;
      const a = new Audio(`/api/tts?text=${encodeURIComponent(clean)}`);
      a.volume = 1;
      a.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let stop = false;
    let streamerId: bigint | null = null;

    async function poll() {
      try {
        if (streamerId === null) {
          const s = await RPC.readContract({
            address: TIPJAR_ADDRESS,
            abi: tipJarAbi,
            functionName: "getStreamerByHandle",
            args: [handle],
          }) as any;
          if (s?.[0] === 0n) return; // not registered yet, retry next tick
          streamerId = s[0];
        }
        // Monad public RPC limits eth_getLogs to a <=100-block range.
        // Monad testnet ~10 blocks/sec => 99 blocks ≈ 10s window; poll every 2s with overlap.
        const to = await RPC.getBlockNumber();
        const from = to > 99n ? to - 99n : 0n;
        const logs = await RPC.getLogs({
          address: TIPJAR_ADDRESS,
          event: tipJarAbi[4] as any,
          args: { id: streamerId! },
          fromBlock: from,
          toBlock: to,
        });
        if (stop) return;
        const parsed: Tip[] = logs.map((raw) => {
          const l = raw as any;
          const args = l.args as any;
          return {
            id: String(l.transactionHash) + ":" + String(l.logIndex),
            from: String(args?.from ?? "").slice(0, 8),
            amount: args?.amount ? formatEther(args.amount) : "?",
            message: String(args?.message ?? ""),
          };
        });
        // first pass: remember history without showing it — only NEW tips animate in
        if (!primed.current) {
          parsed.forEach((t) => seen.current.add(t.id));
          primed.current = true;
          return;
        }
        const fresh = parsed.filter((t) => !seen.current.has(t.id));
        fresh.forEach((t) => seen.current.add(t.id));
        if (fresh.length) {
          setTips((prev) => [...fresh, ...prev].slice(0, 5));
          const latest = fresh[fresh.length - 1];
          setBig(latest);
          playSound();
          playVoice(latest.message || "new tip");
          // How long the big card stays: plain tips 6s. Video tips need much
          // longer — YT iframe takes 3-4s just to load, and a range clip
          // (0:24-0:33) should play its FULL length, not get cut at 6s.
          const vId = videoIdOf(latest.message || "");
          const vStart = videoStartOf(latest.message || "");
          const vEnd = videoEndOf(latest.message || "");
          let bigMs = 6000;
          if (vId) {
            const clipLen = vEnd != null ? vEnd - (vStart ?? 0) : null;
            bigMs = clipLen != null ? 4000 + clipLen * 1000 + 1000 : 30000; // open-ended clip: generous
          }
          setTimeout(() => setBig((b) => (b?.id === latest.id ? null : b)), bigMs);
          fresh.forEach((t) =>
            setTimeout(() => setTips((p) => p.filter((x) => x.id !== t.id)), 15000)
          );
        }
      } catch (err: any) {
        console.warn("[overlay poll err]", err?.shortMessage || err?.message || err);
      }
    }
    poll();
    const iv = setInterval(poll, 2000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [handle]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none" style={{ background: "transparent" }}>
      {big && (
        <div
          className="absolute animate-[popin_0.5s_cubic-bezier(0.2,1.4,0.4,1)] flex flex-col items-center gap-2"
          style={POS[pos] || POS["top-center"]}
        >
          {videoIdOf(big.message) && (
            <div className="pointer-events-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
              <YTEmbed
                key={videoIdOf(big.message) + ":" + (videoStartOf(big.message) ?? 0)}
                id={videoIdOf(big.message)!}
                start={videoStartOf(big.message)}
                end={videoEndOf(big.message)}
                width={isShort(big.message) ? (pos === "center" ? 360 : 260) : pos === "center" ? 640 : 400}
                height={isShort(big.message) ? (pos === "center" ? 640 : 462) : pos === "center" ? 360 : 225}
              />
            </div>
          )}
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white px-10 py-6 shadow-2xl text-center border-2 border-white/30">
            <div className="text-4xl font-extrabold drop-shadow">🪙 {big.amount} MON</div>
            <div className="text-sm opacity-80 font-mono mt-1">from {nameOf(big.message) || big.from + "…"} 🎉</div>
          </div>
          {displayMsg(big.message) && (
            <div className="max-w-[720px] rounded-2xl bg-black/70 text-white px-6 py-3 text-xl font-semibold text-center backdrop-blur">
              “{displayMsg(big.message)}”
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes popin{from{scale(0.4);opacity:0}to{scale(1);opacity:1}}`}</style>
    </div>
  );
}
