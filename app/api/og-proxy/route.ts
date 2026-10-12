import { NextResponse } from "next/server";
import { fetchOgImage, curlRedirect } from "@/lib/ogimage";

// Streams a source-platform og:image through our own domain so chat previews
// (Telegram/X/WhatsApp) render it reliably, with sane cache headers.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!/^https:\/\/(www\.|m\.|web\.)?(facebook\.com|instagram\.com|tiktok\.com)\/\S+/i.test(url) || url.length > 300) {
    return new NextResponse("bad url", { status: 400 });
  }
  let target = url;
  if (/facebook\.com\/share\//i.test(target)) {
    const loc = await curlRedirect(target);
    if (!loc) return new NextResponse("unresolvable", { status: 422 });
    target = loc.split("?")[0] + (loc.includes("idorvanity") ? `?idorvanity=${new URL(loc).searchParams.get("idorvanity")}` : "");
  }
  const img = await fetchOgImage(target);
  if (!img) return new NextResponse("no og:image", { status: 404 });
  try {
    const res = await fetch(encodeURI(img), { headers: { "User-Agent": "Mozilla/5.0", Referer: new URL(target).origin }, signal: AbortSignal.timeout(8000) });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return new NextResponse("fetch failed", { status: 502 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": res.headers.get("content-type")!,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
