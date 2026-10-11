"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useChainId, useConnect, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { TIPJAR_ADDRESS, TIPJAR_ADDRESS_MAINNET, tipJarAbi, CHAIN_ID, MAINNET_CHAIN_ID } from "@/lib/contract";
import MonPrice from "@/components/mon-price";

const PRESETS = ["0.3", "0.5", "1", "5"]; // USD (mainnet)
const PRESETS_TESTNET = ["0.1", "0.1", "0.1", "0.1"]; // flat 0.1 MON for testing
const MIN_USD = 0.3; // text-only tip (mainnet)
const MIN_VID_USD = 0.5; // tip with YouTube video (mainnet)
const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;

function useMonUsd() {
  const [usd, setUsd] = useState<number | null>(null);
  useEffect(() => {
    let stop = false;
    async function f() {
      try {
        const r = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=monad&vs_currencies=usd"
        );
        const j = await r.json();
        if (!stop && j?.monad) setUsd(j.monad.usd);
      } catch {}
    }
    f();
    const iv = setInterval(f, 60000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);
  return usd;
}

export default function TipClient({ handle }: { handle: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { address: injectedAddr, isConnected: walletConnected } = useAccount();
  const currentChain = useChainId();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const [net, setNet] = useState<"testnet" | "mainnet">("testnet");
  const [amountUsd, setAmountUsd] = useState("0.5");
  const [amountMon, setAmountMon] = useState("0.1");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [video, setVideo] = useState("");
  const [startSec, setStartSec] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const monUsd = useMonUsd();
  const hasVideo = !!video.trim();
  const { writeContractAsync } = useWriteContract();

  const isTest = net === "testnet";
  const jarAddr = (isTest ? TIPJAR_ADDRESS : TIPJAR_ADDRESS_MAINNET) as `0x${string}`;
  const jarChain = isTest ? CHAIN_ID : MAINNET_CHAIN_ID;
  const presets = isTest ? PRESETS_TESTNET : PRESETS;
  const amount = isTest ? amountMon : amountUsd;
  const setAmount = isTest ? setAmountMon : setAmountUsd;

  // Either an injected wallet (MetaMask etc, no signup) or a Privy embedded wallet works.
  const canTip = walletConnected || authenticated;
  const tipperAddr = injectedAddr || wallets[0]?.address;

  const { data: streamer } = useReadContract({
    address: jarAddr,
    chainId: jarChain,
    abi: tipJarAbi,
    functionName: "getStreamerByHandle",
    args: [handle],
    query: { enabled: /^0x[0-9a-fA-F]{40}$/.test(jarAddr) },
  });

  if (!streamer) {
    const mainnetPending = !isTest && !/^0x[0-9a-fA-F]{40}$/.test(jarAddr);
    return (
      <main className="min-h-screen bg-[#faf9fc] text-slate-900">
        <Header />
        <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="grid grid-cols-2 gap-1 mb-5 bg-slate-100 rounded-xl p-1 text-sm font-medium">
            {(["testnet", "mainnet"] as const).map((n) => (
              <button
                key={n}
                onClick={() => setNet(n)}
                className={`rounded-lg py-1.5 ${
                  net === n ? "bg-white shadow text-violet-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {n === "testnet" ? "🧪 Testnet (free)" : "🌐 Mainnet"}
              </button>
            ))}
          </div>
          {mainnetPending ? (
            <>
              <p className="text-2xl font-semibold">Mainnet coming soon 🚧</p>
              <p className="text-slate-500 mt-2">
                The tip jar contract isn't deployed on Monad mainnet yet. Switch to Testnet to try it now — tips are free there.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold">Tip jar not found 🫥</p>
              <p className="text-slate-500 mt-2">
                No streamer registered <code className="bg-slate-100 px-1 rounded">{handle}</code> on {isTest ? "testnet" : "mainnet"} yet.
              </p>
              <a href="/dashboard" className="text-violet-600 underline mt-4 inline-block">
                Claim this handle →
              </a>
            </>
          )}
        </div>
      </main>
    );
  }

  const [, wallet, displayName, active] = streamer as [bigint, string, string, boolean, bigint];

  async function sendTip() {
    if (!tipperAddr) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(jarAddr)) {
      setStatus("Mainnet tip jar not deployed yet — switch back to Testnet");
      return;
    }
    if (currentChain !== jarChain) {
      // wallet on the wrong network → ask it to switch
      switchChain({ chainId: jarChain });
      return;
    }
    const usdAmt = parseFloat(amountUsd);
    const monAmt = parseFloat(amountMon);
    if (isTest) {
      if (!monAmt || monAmt <= 0) {
        setStatus("Enter an amount in MON");
        return;
      }
    } else {
      if (!usdAmt || usdAmt < 0.01) {
        setStatus("Enter an amount in USD");
        return;
      }
      if (!monUsd) {
        setStatus("Loading live MON price… try again in a second");
        return;
      }
    }
    let vidId: string | null = null;
    let vidStart: number | null = null;
    let vidEnd: number | null = null;
    if (video.trim()) {
      const m = video.match(YT_RE);
      if (!m) {
        setStatus("Video link must be a YouTube link (youtube.com/watch?v=… or youtu.be/…)");
        return;
      }
      vidId = m[1];
      const s = startSec.trim();
      if (s) {
        // one timestamp: 42 | 1.5 | 0.083 | 1:23 | 1:23.456 (mm:ss with optional decimals)
        const parseOne = (v: string): number | null => {
          if (/^\d{1,5}(?:\.\d{1,3})?$/.test(v)) return parseFloat(v);
          const mmss = v.match(/^(\d{1,3}):([0-5]?\d)(?:\.(\d{1,3}))?$/);
          if (!mmss) return null;
          return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10) + (mmss[3] ? parseInt(mmss[3].padEnd(3, "0"), 10) / 1000 : 0);
        };
        // also accepts a range: 0:24-0:33 or 24-33 (video stops at the end time)
        const parts = s.split("-").map((x) => x.trim());
        if (parts.length === 1) {
          vidStart = parseOne(parts[0]);
        } else if (parts.length === 2) {
          vidStart = parseOne(parts[0]);
          vidEnd = parseOne(parts[1]);
        }
        if (vidStart == null || (parts.length === 2 && (vidEnd == null || vidEnd <= vidStart))) {
          vidStart = null;
          vidEnd = null;
          setStatus("Start time must be seconds (1.5), mm:ss (0:24), or a range (0:24-0:33)");
          return;
        }
      }
    }
    let payMon: number;
    if (isTest) {
      payMon = monAmt;
    } else {
      const floor = vidId ? MIN_VID_USD : MIN_USD;
      if (usdAmt < floor) {
        setStatus(
          vidId
            ? `Video tips start at $${MIN_VID_USD}`
            : `Tip too small — minimum is $${MIN_USD}`
        );
        return;
      }
      // convert USD -> MON at live price, rounded up to 4 decimals so it never lands under the floor
      payMon = Math.ceil((usdAmt / monUsd!) * 1e4) / 1e4;
    }
    let finalMsg = message.trim() || "gm";
    // viewer-chosen display name (max 24 chars, no pipes so parsing stays safe)
    const safeName = name.trim().replace(/[|\r\n]/g, "").slice(0, 24);
    if (safeName) finalMsg += ` |n:${safeName}`;
    if (vidId) finalMsg += ` |vid:${vidId}` + (/\/shorts\//i.test(video) ? " |sh:1" : "");
    if (vidId && vidStart != null && vidStart > 0) finalMsg += ` |t:${Math.round(vidStart * 1000) / 1000}`;
    if (vidId && vidStart != null && vidEnd != null) finalMsg += ` |e:${Math.round(vidEnd * 1000) / 1000}`;
    try {
      setStatus("Sending…");
      await writeContractAsync({
        address: jarAddr,
        abi: tipJarAbi,
        functionName: "tip",
        args: [handle, finalMsg],
        value: parseEther(String(payMon)),
      });
      setStatus(
        isTest
          ? `Tip landed ✅ ${payMon} MON sent on testnet (gas ≈ 0) — thank you!`
          : `Tip landed ✅ $${usdAmt.toFixed(2)} sent as ${payMon} MON — thank you!`
      );
      setMessage("");
      setName("");
      setVideo("");
      setStartSec("");
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Failed — try again");
    }
  }

  function connectWallet() {
    // Open Privy's modal with external-wallet options (MetaMask, Coinbase, etc.).
    // wagmi's raw injected connect() fails silently when no extension exists.
    if (!ready) return;
    login({ loginMethods: ["wallet", "email", "sms"] });
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] text-slate-900">
      <Header />
      <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center text-white text-xl font-bold">
            {displayName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-sm text-slate-500">mytips/{handle}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-4">
          {active
            ? "Support this streamer — tips go straight to their MON wallet."
            : "This tip jar is closed."}
        </p>

        <div className="grid grid-cols-2 gap-1 mt-4 bg-slate-100 rounded-xl p-1 text-sm font-medium">
          {(["testnet", "mainnet"] as const).map((n) => (
            <button
              key={n}
              onClick={() => setNet(n)}
              className={`rounded-lg py-1.5 capitalize transition ${
                net === n ? "bg-white shadow text-violet-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {n === "testnet" ? "🧪 Testnet (free)" : "🌐 Mainnet"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => setAmount(p)}
              className={`rounded-xl py-2 text-sm font-medium border ${
                amount === p
                  ? "bg-violet-600 text-white border-violet-600"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              {isTest ? `${p} MON` : `$${p}`}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">{isTest ? "◎" : "$"}</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-200 pl-8 pr-4 py-3 text-lg font-semibold"
            placeholder={isTest ? "Custom MON" : "Custom amount"}
          />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Your name (shown on stream)"
        />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={100}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Say something nice (shown on stream)"
        />
        <input
          value={video}
          onChange={(e) => {
            setVideo(e.target.value);
            // auto-fill start time from the link itself (…&t=93 / ?t=1m33s / &start=93)
            const t = e.target.value.match(/[?&](?:t|start)=(\d{1,5}(?:\.\d{1,3})?)/);
            if (t) setStartSec(t[1]);
          }}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Optional: YouTube link to play on stream"
        />
        {video.trim() && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={startSec}
              onChange={(e) => setStartSec(e.target.value)}
              inputMode="numeric"
              placeholder="0:24-0:33"
              className="w-28 rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
            <span className="text-xs text-slate-500">start (24 or 0:24) or range (0:24-0:33) — blank = from the beginning</span>
          </div>
        )}

        {!ready ? null : canTip ? (
          <button
            onClick={sendTip}
            disabled={!active || !amount}
            className="mt-4 w-full bg-violet-600 text-white rounded-xl py-3 font-semibold hover:bg-violet-700 disabled:opacity-40"
          >
            {currentChain === jarChain
              ? isTest
                ? `Tip ${amount || "0"} MON 🧪`
                : monUsd && parseFloat(amountUsd) > 0
                  ? `Tip $${amountUsd} (${Math.ceil((parseFloat(amountUsd) / monUsd) * 1e4) / 1e4} MON) 🪙`
                  : `Tip $${amountUsd || "0"} 🪙`
              : `Switch to ${isTest ? "Testnet" : "Mainnet"} ⚡`}
          </button>
        ) : (
          <>
            <button
              onClick={connectWallet}
              className="mt-4 w-full bg-violet-600 text-white rounded-xl py-3 font-semibold hover:bg-violet-700"
            >
              Connect wallet or Log in with email
            </button>
          </>
        )}

        {status && (
          <p className="mt-3 text-center text-sm font-medium text-violet-700">{status}</p>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">
          from {tipperAddr ? tipperAddr.slice(0, 10) + "…" : "your wallet"} · {isTest ? "Monad Testnet" : "Monad Mainnet"} · gas ≈ 0.00002
          MON
        </p>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="px-6 py-4 max-w-5xl mx-auto flex items-center justify-between">
      <a href="/" className="font-bold flex items-center">
        <img src="/mytips-icon.png" alt="" className="w-[36px] h-[36px] inline-block" />
        MY<span className="text-violet-600">TIPS</span>
      </a>
      <MonPrice />
    </header>
  );
}
