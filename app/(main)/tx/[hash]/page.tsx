import { notFound } from "next/navigation";
import TxView from "./tx-view";
import type { Media, Platform } from "@/lib/media";

const TX_RE = /^0x[0-9a-fA-F]{64}$/;
const PLATFORMS: Platform[] = ["facebook", "twitter", "tiktok", "instagram"];

type Ctx = { params: Promise<{ hash: string }>; searchParams: Promise<{ v?: string; f?: string; p?: string; sh?: string; t?: string; e?: string; ap?: string }> };

/** rebuild the Media descriptor from share-link params (youtube = legacy bare v id) */
export function mediaFromParams(sp: { v?: string; f?: string; p?: string; sh?: string }): Media | null {
  const v = sp?.v;
  if (!v) return null;
  const vertical = sp?.sh === "1";
  if (sp.p === "facebook" || v === "fb") {
    const url = sp.f;
    if (!url || !/^(https?:\/\/)?([\w-]+\.)*(facebook\.com|fb\.watch)\/\S+/i.test(url)) return null;
    return { platform: "facebook", id: url.startsWith("http") ? url : `https://${url.replace(/^\/\//, "")}`, vertical, label: "Facebook" };
  }
  if (sp.p && PLATFORMS.includes(sp.p as Platform)) {
    if (!/^[\w-]{6,30}$/.test(v)) return null;
    const labels: Record<string, string> = { facebook: "Facebook", twitter: "X", tiktok: "TikTok", instagram: "Instagram" };
    return { platform: sp.p as Platform, id: v, vertical, label: labels[sp.p] ?? sp.p };
  }
  if (v !== "fb" && /^[\w-]{11}$/.test(v)) {
    return { platform: "youtube", id: v, vertical, label: "YouTube" };
  }
  return null;
}

export async function generateMetadata({ searchParams }: Ctx) {
  const sp = await searchParams;
  const media = mediaFromParams(sp);
  const v = media?.id;
  const sh = sp?.sh === "1";
  const tRaw = parseFloat(sp?.t ?? ""); const eRaw = parseFloat(sp?.e ?? "");
  const t = Number.isFinite(tRaw) && tRaw >= 0 ? Math.floor(tRaw) : null;
  const e = Number.isFinite(eRaw) && eRaw >= 0 ? Math.floor(eRaw) : null;
  const play = (auto: string) => (t != null ? `&start=${t}` : "") + (e != null && (t == null || e > t) ? `&end=${e}` : "");
  const title = v
    ? "Someone sent you a gift 🎁 — with a video"
    : "On-chain gift sent 🎁 — view the transaction";
  const desc = "Sent on Monad with MYTIPS — tap to watch the video and see the transaction.";
  const ytPoster = media?.platform === "youtube" ? `https://i.ytimg.com/vi/${media.id}/maxresdefault.jpg` : null;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: ytPoster
        ? [{ url: ytPoster, width: 1280, height: 720 }]
        : [{ url: "/mytips-icon.png" }],
    },
    twitter: {
      card: ytPoster ? "player" : "summary_large_image",
      title,
      description: desc,
      images: ytPoster ? [ytPoster] : ["/mytips-icon.png"],
      player: ytPoster ? `https://www.youtube.com/embed/${media!.id}?autoplay=1${play("1")}` : undefined,
      playerWidth: sh ? 360 : 640,
      playerHeight: sh ? 640 : 360,
    },
    other: ytPoster
      ? {
          "og:video": `https://www.youtube.com/embed/${media!.id}?autoplay=1${play("1")}`,
          "og:video:secure_url": `https://www.youtube.com/embed/${media!.id}?autoplay=1${play("1")}`,
          "og:video:type": "text/html",
          "og:video:width": sh ? "360" : "640",
          "og:video:height": sh ? "640" : "360",
        }
      : {},
  };
}

export default async function TxPage({ params, searchParams }: Ctx) {
  const [{ hash }, sp] = await Promise.all([params, searchParams]);
  if (!TX_RE.test(hash)) notFound();
  const tRaw = parseFloat(sp?.t ?? ""); const eRaw = parseFloat(sp?.e ?? "");
  const t = Number.isFinite(tRaw) && tRaw >= 0 ? Math.floor(tRaw) : null;
  const e = Number.isFinite(eRaw) && eRaw >= 0 ? Math.floor(eRaw) : null;
  return <TxView hash={hash} media={mediaFromParams(sp)} start={t} end={e != null && e > (t ?? 0) ? e : null} autoplay={sp?.ap === "1"} />;
}
