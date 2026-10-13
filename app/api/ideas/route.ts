import { NextResponse } from "next/server";

export const maxDuration = 40;

// Gift concierge — Qwen (Token Plan compatible-mode). Key stays server-side.
const BASE_URL = "https://token-plan.maas.qwencloudapi.com/compatible-mode/v1/chat/completions";
const MODEL = process.env.QWEN_MODEL || "qwen3.6-flash";

const SYSTEM = `You are MYTIPS' gift concierge. MYTIPS lets someone send a crypto gift (MON on Monad) wrapped around a shared video link — the video plays on a gift page next to a personal message.

The user tells you the occasion and the vibe (birthday, apology after a fight, anniversary, just because, trending meme, etc). Reply with EXACTLY one JSON object, no markdown fences:
{"reply":"<max 2 sentences, warm, plain-spoken, no emoji, no corporate hype>","ideas":[{"title":"<video concept, max 7 words>","why":"<max 12 words why it fits>","message":"<a ready-to-send gift message, 1-2 sentences, heartfelt, no emoji>","search":"<a short YouTube search query, max 8 words>"}]}

Rules:
- Always 3 ideas: one specific-to-occasion, one nostalgic/personal, one light or trending (memes, viral formats).
- Every idea must be a VIDEO THE SENDER CAN FIND AND SHARE on YouTube right now — songs, official trailers, short films, meme compilations, fan edits, lyric videos. "search" is a YouTube query, max 8 words, that reliably returns watchable videos (real song titles + artists, well-known meme names, "happy birthday song", "cat meme compilation 2026", etc). NEVER suggest custom/commissioned/one-off items, physical gifts, art prints, or anything a stranger cannot search for. Do NOT invent fake video titles.
- Match the emotional tone the user describes. If they mention fighting/making up, be sincere, not funny.
- English only. Never mention that you are an AI.`;

export async function POST(req: Request) {
  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const msgs = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length < 800)
    .slice(-8);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") {
    return NextResponse.json({ error: "no prompt" }, { status: 400 });
  }
  const key = process.env.QWEN_API_KEY;
  if (!key) return NextResponse.json({ error: "not configured" }, { status: 500 });

  try {
    const r = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 700,
        enable_thinking: false,
        messages: [{ role: "system", content: SYSTEM }, ...msgs],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) return NextResponse.json({ error: "upstream " + r.status }, { status: 502 });
    const j = await r.json();
    let text: string = j?.choices?.[0]?.message?.content ?? "";
    text = text.replace(/```json|```/gi, "").trim();
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a === -1 || b <= a) return NextResponse.json({ error: "bad model output" }, { status: 502 });
    const parsed = JSON.parse(text.slice(a, b + 1));
    const ideas = Array.isArray(parsed.ideas)
      ? parsed.ideas.slice(0, 3).map((i: any) => ({
          title: String(i.title || "").slice(0, 60),
          why: String(i.why || "").slice(0, 90),
          message: String(i.message || "").slice(0, 280),
          search: String(i.search || "").slice(0, 60),
        }))
      : [];
    return NextResponse.json({ reply: String(parsed.reply || "").slice(0, 300), ideas });
  } catch {
    return NextResponse.json({ error: "timeout" }, { status: 504 });
  }
}
