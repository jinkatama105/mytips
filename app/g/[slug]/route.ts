import { NextRequest, NextResponse } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SLUG_RE = /^[a-z2-9]{4,12}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SB_URL || !SB_KEY || !SLUG_RE.test(slug)) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
  try {
    const r = await fetch(`${SB_URL}/rest/v1/links?select=url&slug=eq.${slug}&limit=1`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` },
      cache: "no-store",
    });
    const rows = await r.json();
    const url = Array.isArray(rows) && typeof rows[0]?.url === "string" ? rows[0].url : null;
    if (url && url.startsWith("https://mytips.fun/tx/")) {
      return NextResponse.redirect(url, 302);
    }
  } catch {}
  return NextResponse.redirect(new URL("/", req.url), 302);
}
