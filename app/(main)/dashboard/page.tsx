"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { TIPJAR_ADDRESS, tipJarAbi } from "@/lib/contract";

export default function Dashboard() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState(user?.google?.name || user?.github?.username || "");
  const [savedHandle, setSavedHandle] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  // remember handles claimed by this wallet
  useEffect(() => {
    if (wallet) {
      const stored = localStorage.getItem(`ms-handle-${wallet.address}`);
      if (stored) setSavedHandle(stored);
    }
  }, [wallet]);

  const { data: streamer, refetch } = useReadContract({
    address: TIPJAR_ADDRESS,
    abi: tipJarAbi,
    functionName: "getStreamerByHandle",
    args: [savedHandle || "zzz-none"],
    query: { enabled: !!savedHandle, refetchInterval: 5000 },
  });

  async function register() {
    if (!handle || handle.length < 3) return setMsg("Handle min 3 karakter");
    try {
      setMsg("Registering…");
      await writeContractAsync({
        address: TIPJAR_ADDRESS,
        abi: tipJarAbi,
        functionName: "register",
        args: [handle.trim().toLowerCase(), displayName || handle],
      });
      if (wallet) localStorage.setItem(`ms-handle-${wallet.address}`, handle.trim().toLowerCase());
      setSavedHandle(handle.trim().toLowerCase());
      setMsg("Tip jar live! 🎉");
      refetch();
    } catch (e: any) {
      setMsg(e?.shortMessage || "Handle already taken");
    }
  }

  async function withdraw() {
    if (!streamer) return;
    try {
      setMsg("Withdrawing…");
      await writeContractAsync({
        address: TIPJAR_ADDRESS,
        abi: tipJarAbi,
        functionName: "withdraw",
        args: [(streamer as any)[0]],
      });
      setMsg("MON landed in your wallet 💸");
      refetch();
    } catch (e: any) {
      setMsg(e?.shortMessage || "Withdraw failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9fc] text-slate-900">
      <header className="px-6 py-4 max-w-5xl mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold flex items-center">
          <img src="/mytips-icon.png" alt="" className="w-[36px] h-[36px] inline-block" />
          MY<span className="text-violet-600">TIPS</span>
        </Link>
        <div className="flex items-center gap-3">
        {ready && authenticated && (
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
            Log out
          </button>
        )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-12">
        {!ready ? null : !authenticated ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
            <h1 className="text-2xl font-bold">Streamer dashboard</h1>
            <p className="text-slate-500 mt-2">
              Login creates your wallet automatically — no extension needed.
            </p>
            <button
              onClick={login}
              className="mt-6 bg-violet-600 text-white rounded-xl px-6 py-3 font-semibold"
            >
              Login / create wallet
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Your tip jar</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">{wallet?.address}</p>

            {!savedHandle ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-6">
                <p className="font-semibold">Claim your handle</p>
                <div className="flex items-center mt-3 border border-slate-200 rounded-xl px-3">
                  <span className="text-slate-400 text-sm">mytips/</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                    className="flex-1 py-2.5 px-2 outline-none"
                    placeholder="yourname"
                  />
                </div>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-2.5"
                  placeholder="Display name"
                />
                <button
                  onClick={register}
                  className="mt-4 w-full bg-violet-600 text-white rounded-xl py-3 font-semibold"
                >
                  Claim onchain →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-3xl font-bold">
                      {streamer ? formatEther((streamer as any)[4]) : "…"} <span className="text-lg text-slate-400">MON</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-1">pending tips</p>
                  </div>
                  <a
                    href={`/${savedHandle}`}
                    target="_blank"
                    className="text-sm bg-slate-100 rounded-xl px-3 py-2 hover:bg-slate-200 font-mono"
                  >
                    mytips/{savedHandle} ↗
                  </a>
                </div>
                <button
                  onClick={withdraw}
                  disabled={!streamer || (streamer as any)[4] === 0n}
                  className="mt-4 w-full bg-slate-900 text-white rounded-xl py-3 font-semibold disabled:opacity-40"
                >
                  Withdraw to wallet
                </button>
              </div>
            )}
            {msg && <p className="mt-4 text-center text-sm font-medium text-violet-700">{msg}</p>}
          </>
        )}
      </div>
    </main>
  );
}
