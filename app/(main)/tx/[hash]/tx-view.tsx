"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { monadTestnet, monad } from "viem/chains";
import { embedSrc, type Media } from "@/lib/media";
import { explorerTx } from "@/lib/chain";

const RPC_TEST = createPublicClient({ chain: monadTestnet, transport: http() });
const RPC_MAIN = createPublicClient({ chain: monad, transport: http() });

type TxData = { from: string; to: string | null; value: string; block: number; onMain: boolean; ts: number | null };

// ---------- TTS language detection (Indonesian vs English) ----------
// Whole-token stopword lists. Informal/slang Indonesian is covered so
// messages like "Bisa nggk lu maen gitar?" get an id-ID voice.
const ID_WORDS = new Set(
  "nggk nggak ngga gak gk ga engak enggak tak ndak ora ku kamu kau kalian kami kita mereka aku saya gue gua gw lo lu dia ini itu apa gimana gmn kenapa knp knapa kok sih nih dong deh lah loh kan ya iya tidak tdk bukan bkn udah udh sudah sdh belum blum belom blm pernah mau mo bisa bs pengen pgn pingin butuh perlu harus hrs wajib boleh jangan tolong minta mohon bilang blg katanya tanya nanya jawab jwb lihat liat denger dengar dgr nonton main maen makan minum beli jual harga uang duit kerja belajar tidur bangun nanti besok sekarang skrg sebentar bentar bntr cepat lama lagi masih kapan mana dimana kemana darimana sini situ sana orang teman temen tmn rekan kawan bro bang kak kk pak bu mas mbak dek sayang cinta suka lucu keren mantap mantab gokil asik seru bagus jelek besar kecil banyak dikit kurang lebih lumayan capek cape senang sedih galau baper kesel marah kangen rindu makasih makasi terimakasih sukur syukur alhamdulillah alhmdulillah halo hai hai eh cuy coy doi pacar gimana kalau kalo kl klo jika karena karna krn sebab maka tetap makin semakin paling banget bgt amat sangat sekali skali doang aja pergi pulang datang jalan duduk berdiri lari hal baru punya ada sini yuk ayo tidaklah janganlah tuh tu nya gitu gini ginian apaan apasih ngapain ngapa kenalan kenapa2 apa2"
    .split(/\s+/)
);

const EN_WORDS = new Set(
  "the a an is are was were be been being i you he she it we they me him her us them my your his its our their this that these those what when where which who whom why how can could will would shall should may might must do does did have has had am not no yes ok okay and or but if then than so for of in on at to from with by as about into through over under again further once here there all any both each few more most other some such only own same too very just don t now get got go going want wanna gonna let us know send sent gift pay paid happy birthday congrats congratulations thank thanks love luv miss dude man well done nice good great awesome cool amazing stay keep come back call text hello hi hey please pls sorry welcome enjoy fun best win wow omg lol see soon later take care bless blessed pray prayer amen god lord peace friend friends guys hope always life never ever yeah sure right"
    .split(/\s+/)
);

function detectTtsLang(raw: string): "id" | "en" {
  let id = 0, en = 0;
  for (const w of raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")) {
    if (!w) continue;
    if (ID_WORDS.has(w)) id++;
    if (EN_WORDS.has(w)) en++;
  }
  // tie → Indonesian (fits MYTIPS' audience)
  return id >= en ? "id" : "en";
}

// Expand compressed slang so the synthesizer pronounces it clearly.
// The on-screen message stays original; only the spoken text is normalized.
const TTS_SLANG: Record<string, string> = {
  nggk: "enggak", nggak: "enggak", ngga: "engga", gak: "enggak", gk: "enggak", ga: "enggak",
  gmn: "gimana", knp: "kenapa", udah: "sudah", udh: "sudah", blm: "belum", blum: "belum",
  belom: "belum", sm: "sama", sma: "sama", yg: "yang", dgn: "dengan", utk: "untuk",
  krn: "karena", karna: "karena", bgt: "banget", maen: "main", gitu: "begitu", gini: "begini",
  aja: "saja", abis: "habis", tdk: "tidak", pgn: "pengen", jg: "juga", spt: "seperti",
  dr: "dari", hrs: "harus", bs: "bisa", dh: "sudah", alhmdulillah: "alhamdulillah",
};

function normalizeForTts(text: string): string {
  return text.replace(/[a-zA-Z]+/g, (w) => {
    const mapped = TTS_SLANG[w.toLowerCase()];
    if (!mapped) return w;
    if (w === w.toUpperCase()) return mapped.toUpperCase();
    return w[0] === w[0].toUpperCase() && w.length > 1
      ? mapped[0].toUpperCase() + mapped.slice(1)
      : mapped;
  });
}

function pickVoice(lang: "id" | "en"): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const v of voices) {
      const l = (v.lang || "").toLowerCase().replace("_", "-");
      if (!l.startsWith(lang)) continue;
      let s = 0;
      if (v.default) s += 10;
      if (v.localService) s += 2;
      const n = v.name.toLowerCase();
      if (n.includes("google")) s += 5;
      if (n.includes("natural") || n.includes("neural") || n.includes("premium") || n.includes("enhanced")) s += 3;
      if (s > bestScore) { bestScore = s; best = v; }
    }
    return best;
  } catch {
    return null;
  }
}

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
    const cleaned = (message || "").trim();
    if (!cleaned) {
      setError("There's no message to read aloud.");
      return;
    }
    const lang = detectTtsLang(cleaned);
    const spoken = normalizeForTts(cleaned);
    const u = new SpeechSynthesisUtterance(spoken);
    const v = pickVoice(lang);
    if (v) {
      u.voice = v;
    } else {
      u.lang = lang === "id" ? "id-ID" : "en-US";
    }
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
        <a href="https://mytips.fun" target="_blank" rel="noopener" className="flex items-center justify-center mb-6 no-underline" aria-label="MYTIPS home">
          <img src="/mytips-icon.png" alt="" className="w-[48px] h-[48px] inline-block" />
          <span className="font-bold text-xl tracking-tight ml-0.5 text-slate-900">
            MY<span className="text-violet-600">TIPS</span>
          </span>
        </a>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <img src="/assets/gift_box.png" alt="" width="48" height="48" className="mx-auto mb-2 inline-block animate-[popin_0.6s_cubic-bezier(0.2,1.4,0.4,1)]" />
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
            <div className="mt-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-b from-violet-50/70 to-white p-2.5 text-left">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-500 text-center mb-1">
                Message from the sender
              </p>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[14px] leading-snug text-slate-800 whitespace-pre-wrap break-words text-center">
                    “{message}”
                  </p>
                  <button
                    onClick={speak}
                    title={speaking ? "Stop reading" : "Read the message aloud"}
                    className={`shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${speaking ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-violet-600 hover:border-violet-300"}`}
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
              className={`overflow-hidden rounded-xl border border-slate-200 shadow-sm relative ${message ? "mt-3" : "mt-4"}`}
              style={media.vertical ? { width: "min(calc(100vw - 10px), calc(94vh * 9 / 16))", aspectRatio: "9/16", marginLeft: "calc(50% - min(calc(100vw - 10px), calc(94vh * 9 / 16)) / 2)" } : { width: "100%", aspectRatio: "16/9" }}
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
          <a href="https://mytips.fun" className="text-violet-500 underline font-semibold" target="_blank" rel="noopener">
            MYTIPS
          </a>{" "}
          · tips & gifts land straight in wallets, no escrow
        </p>
      </div>
      <style>{`@keyframes popin{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </main>
  );
}
