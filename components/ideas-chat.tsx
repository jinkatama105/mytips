"use client";

import { useEffect, useRef, useState } from "react";

type Idea = { title: string; why: string; message: string; search: string };
type Msg = { role: "user" | "ai"; text: string; ideas?: Idea[] };

// Gift concierge chat — asks Qwen for occasion-matched video ideas + ready messages.
export default function IdeasChat({ onUseMessage }: { onUseMessage: (msg: string, search: string) => void }) {
  const [log, setLog] = useState<Msg[]>([
    {
      role: "ai",
      text: "Tell me who the gift is for and what's going on — birthday, sorry-after-a-fight, anniversary, or just a meme they'd love. I'll suggest videos and messages.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log, busy]);

  async function ask(prefill?: string) {
    const q = (prefill ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const next: Msg[] = [...log, { role: "user", text: q }];
    setLog(next);
    setBusy(true);
    try {
      const r = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.role !== "ai" || m.text).map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })) }),
      });
      const j = await r.json();
      if (!r.ok || !j.ideas?.length) {
        setLog((l) => [...l, { role: "ai", text: j.error === "not configured" ? "Concierge is offline right now — try again later." : "Hmm, I lost my train of thought — say that again?" }]);
      } else {
        setLog((l) => [...l, { role: "ai", text: j.reply, ideas: j.ideas }]);
      }
    } catch {
      setLog((l) => [...l, { role: "ai", text: "Connection dropped — try again in a second." }]);
    } finally {
      setBusy(false);
    }
  }

  const starters = ["It's my friend's birthday 🎂", "We had a fight, want to say sorry", "Send something funny & trending"];

  return (
    <div className="flex flex-col">
      <h1 className="text-xl font-bold">💡 Gift concierge</h1>
      <p className="text-sm text-slate-500 mt-1 mb-3">
        Describe the moment — I'll suggest videos and a message that fits. Tap an idea to drop its message into the Send tab.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 max-h-[340px] overflow-y-auto space-y-2.5">
        {log.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 text-white px-3 py-2 text-sm"
                  : "max-w-[92%] rounded-2xl rounded-bl-md bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700"
              }
            >
              {m.text}
              {m.ideas && (
                <div className="mt-2 space-y-2">
                  {m.ideas.map((idea, k) => (
                    <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[13px] font-semibold text-slate-800">{idea.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{idea.why}</p>
                      <p className="text-[12px] italic text-slate-600 mt-1.5">“{idea.message}”</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          onClick={() => {
                            onUseMessage(idea.message, idea.search);
                            setUsed(`${i}:${k}`);
                            setTimeout(() => setUsed(null), 1800);
                          }}
                          className="text-[11px] rounded-lg bg-violet-600 text-white px-2.5 py-1 font-medium hover:bg-violet-700"
                        >
                          {used === `${i}:${k}` ? "✓ Added to Send" : "Use message"}
                        </button>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(idea.search)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-medium hover:bg-violet-50"
                        >
                          Find video ↗
                        </a>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400">Pick a video on YouTube, copy its link back to the Send tab.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white border border-slate-200 px-3 py-2 text-sm text-slate-400">
              <span className="inline-block animate-pulse">thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {log.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-[12px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:border-violet-300 hover:text-violet-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex gap-2 mt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. my girlfriend's birthday, she loves Studio Ghibli"
          maxLength={300}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
