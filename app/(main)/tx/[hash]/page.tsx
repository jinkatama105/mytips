import { notFound } from "next/navigation";
import TxView from "./tx-view";
import { fetchOgImage, curlRedirect } from "@/lib/ogimage";
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
  const host = process.env.VERCEL_URL ?? "mytips-self.vercel.app";
  const proto = "https";
  let poster: string | null = null;
  let videoEmbed: string | null = null;
  if (media?.platform === "youtube") {
    // maxres doesn't exist for many videos (404 -> blank preview); probe and fall back
    const max = `https://i.ytimg.com/vi/${media.id}/maxresdefault.jpg`;
    const hq = `https://i.ytimg.com/vi/${media.id}/hqdefault.jpg`;
    let useMax = true;
    try {
      const r = await fetch(max, { method: "HEAD", signal: AbortSignal.timeout(4000) });
      useMax = r.ok;
    } catch {
      useMax = false;
    }
    poster = useMax ? max : hq;
    videoEmbed = `https://www.youtube.com/embed/${media.id}?autoplay=1${play("1")}`;
  } else if (media && media.platform !== "twitter") {
    // scrape the source page's og:image so chat previews show the real thumbnail
    let target = media.id;
    if (media.platform === "facebook" && /facebook\.com\/share\//i.test(target)) {
      target = (await curlRedirect(target)) ?? target;
    }
    const direct = await fetchOgImage(target);
    // route through our own proxy: FB/IG CDNs expire their signed URLs quickly
    poster = direct ? `${proto}://${host}/api/og-proxy?url=${encodeURIComponent(target)}` : `https://mytips-self.vercel.app/mytips-icon.png`;
    if (media.platform === "facebook" && direct) {
      videoEmbed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(target.split("?")[0] + (target.includes("idorvanity") ? `?idorvanity=${new URL(target).searchParams.get("idorvanity")}` : ""))}&show_text=false&width=560`;
    }
  }
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: poster
        ? [{ url: poster, width: 1280, height: 720 }]
        : [{ url: "/mytips-icon.png" }],
      ...(videoEmbed
        ? { videos: [{ url: videoEmbed, width: media!.vertical ? 360 : 640, height: media!.vertical ? 640 : 360 }] }
        : {}),
    },
    twitter: {
      card: videoEmbed ? "player" : poster ? "summary_large_image" : "summary_large_image",
      title,
      description: desc,
      images: poster ? [poster] : ["/mytips-icon.png"],
      player: videoEmbed ?? undefined,
      playerWidth: media?.vertical ? 360 : 640,
      playerHeight: media?.vertical ? 640 : 360,
    },
    other: videoEmbed
      ? {
          "og:video": videoEmbed,
          "og:video:secure_url": videoEmbed,
          "og:video:type": "text/html",
          "og:video:width": String(media!.vertical ? 360 : 640),
          "og:video:height": String(media!.vertical ? 640 : 360),
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
