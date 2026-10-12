import { NextResponse } from "next/server";

// Resolves facebook.com/share/v/… (and fb.watch) shortlinks to the canonical
// /videos/ URL that plugins/video.php accepts. Node's fetch gets 400'd by
// Facebook's bot filter; curl's TLS fingerprint passes. Server-side only.

// Facebook's bot filter: full Chrome UA strings get 400'd, the short
// "Mozilla/5.0" goes through. Server-side only — Node fetch is blocked.
const UA = "Mozilla/5.0";

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!/(?:facebook\.com|fb\.watch)\/share\/[a-z]\/[\w-]+/i.test(url) || url.length > 200) {
    return NextResponse.json({ error: "not a facebook share link" }, { status: 400 });
  }
  const target = /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const run = promisify(execFile);
    const { stdout } = await run(
      "curl",
      ["-s", "-o", "/dev/null", "-w", "%{redirect_url}", "-A", UA, "--max-time", "10", target],
      { timeout: 12000 }
    );
    const loc = stdout.trim();
    if (!/facebook\.com/.test(loc)) return NextResponse.json({ error: "unresolvable" }, { status: 422 });
    // canonical video path + keep idorvanity query (the plugin's embed uses it)
    const canon = loc.match(/https:\/\/[^"?#]*facebook\.com\/[^?#]*\/(?:videos?|reels?)\/\d+\/?/) ?? loc.match(/https:\/\/[^"?#]*facebook\.com\/[^?#]*\/videos?\/[\w-]+\/?/);
    const base = canon ? canon[0] : loc.split("?")[0];
    const qs = (() => { try { const u = new URL(loc); const keep = new URLSearchParams(); for (const k of ["idorvanity"]) if (u.searchParams.has(k)) keep.set(k, u.searchParams.get(k)!); return keep.toString(); } catch { return ""; } })();
    const final = qs ? `${base}?${qs}` : base;
    return NextResponse.json({ url: final });
  } catch {
    return NextResponse.json({ error: "resolve failed" }, { status: 502 });
  }
}
