"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import MonPrice from "@/components/mon-price";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();

  return (
    <main className="min-h-screen bg-[#faf9fc] text-slate-900 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="font-bold text-lg tracking-tight flex items-center">
          <img src="/mytips-icon.png" alt="" className="w-[40px] h-[40px] inline-block" />
          MY<span className="text-violet-600">TIPS</span>
        </span>
        <nav className="flex gap-3 items-center">
          <a
            href="#how-it-works"
            className="hidden sm:inline-block text-sm font-bold text-slate-600 hover:text-violet-600"
          >
            How it works
          </a>
          <a
            href="https://github.com/jinkatama105"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-block text-sm font-bold text-slate-600 hover:text-violet-600"
          >
            GitHub
          </a>
          <MonPrice />
          {ready && !authenticated && (
            <button
              onClick={login}
              className="text-sm font-medium border border-violet-200 rounded-xl px-4 py-2 hover:bg-violet-50"
            >
              Login
            </button>
          )}
          <Link
            href="/send"
            className="text-sm font-medium bg-violet-600 text-white rounded-xl px-4 py-2 hover:bg-violet-700"
          >
            Send a gift
          </Link>
        </nav>
      </header>

      <section className="flex flex-col items-center justify-center px-6 text-center pt-12 pb-14">
        <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">
          Onchain gifts with a video attached
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">
          Send MON with a <span className="text-violet-600">video gift</span> — share it anywhere.
        </h1>
        <p className="mt-4 text-slate-500 text-center max-w-md mx-auto">
          Pay a friend or attach any onchain transaction, add a YouTube / TikTok / X / video link,
          and get one shareable page that plays the gift with the transaction in the preview card.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap justify-center">
          <Link
            href="/send"
            className="bg-slate-900 text-white rounded-xl px-5 py-3 font-medium hover:bg-slate-700"
          >
            🎁 Send a gift with a video →
          </Link>
        </div>

        <Link
          href="/send"
          className="mt-6 w-full max-w-md rounded-2xl border border-violet-200 bg-white p-4 text-left hover:bg-violet-50 transition flex items-center gap-4"
        >
          <span className="text-3xl">🎁</span>
          <span>
            <span className="block font-semibold text-sm">Send a gift with a video</span>
            <span className="block text-xs text-slate-500">
              Pay or paste any tx hash + video link → share it on X/Telegram/WhatsApp with the video in the preview card
            </span>
          </span>
          <span className="ml-auto text-violet-500 font-medium">→</span>
        </Link>
      </section>

      <section id="how-it-works" className="max-w-5xl mx-auto w-full px-6 pb-20 scroll-mt-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 text-center">
          The gift flow
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-center">
          Three steps. One shareable link.
        </h2>

        <div className="mt-6 flex items-center justify-center flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-medium text-slate-700 shadow-sm">Send MON / paste tx hash</span>
          <span className="text-violet-400 font-semibold" aria-hidden="true">→</span>
          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-medium text-slate-700 shadow-sm">Attach a video</span>
          <span className="text-violet-400 font-semibold" aria-hidden="true">→</span>
          <span className="rounded-full bg-slate-900 px-3.5 py-1.5 font-medium text-white shadow-sm">Share the gift page</span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="font-mono text-xs text-violet-600 font-semibold">01</span>
            <h3 className="mt-2 font-semibold text-sm">Send or attach</h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              Transfer native MON to any wallet, or paste an existing transaction hash — no signup, no escrow.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="font-mono text-xs text-violet-600 font-semibold">02</span>
            <h3 className="mt-2 font-semibold text-sm">Add the video</h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              YouTube, TikTok, X, Instagram, Facebook, or a direct video link — with optional start time and a spoken greeting.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="font-mono text-xs text-violet-600 font-semibold">03</span>
            <h3 className="mt-2 font-semibold text-sm">Share anywhere</h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              One link shows the gift card with the video playing and the transaction details — preview renders in X, Telegram, and WhatsApp.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-slate-400">
        Monad Testnet · chain 10143 · built for the Metropolis hackathon
      </footer>
    </main>
  );
}
