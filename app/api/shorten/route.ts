import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// POST { url } -> { slug }  — stores a long gift URL and returns a short code.
// Backed by Supabase table `links` (slug PK, url). Insert allowed via RLS policy.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/i/l/1 — typo-safe

export async function POST(req: NextRequest) {
  try {
    if (!SB_URL || !SB_KEY) return NextResponse.json({ error: "not configured" }, { status: 500 });
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url : "";
    // only shorten our own gift pages — refuse anything else (open-redirect guard)
    if (!/^https:\/\/mytips\.fun\/tx\/0x[0-9a-fA-F]{64}(\?.*)?$/.test(url)) {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
    let slug = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const bytes = randomBytes(7);
      slug = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
      const r = await fetch(`${SB_URL}/rest/v1/links`, {
        method: "POST",
        headers: {
          "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type": "application/json", "Prefer": "return=minimal,resolution=ignore-duplicates",
        },
        body: JSON.stringify([{ slug, url }]),
      });
      if (!r.ok) continue;
      // verify it actually stored ours (ignore-duplicates may have skipped a collision)
      const check = await fetch(`${SB_URL}/rest/v1/links?select=url&slug=eq.${slug}`, {
        headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      });
      const rows = await check.json();
      if (Array.isArray(rows) && rows[0]?.url === url) break;
      slug = "";
    }
    if (!slug) return NextResponse.json({ error: "store failed" }, { status: 500 });
    return NextResponse.json({ slug });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
