import { notFound } from "next/navigation";
import TxView from "./tx-view";

const TX_RE = /^0x[0-9a-fA-F]{64}$/;

type Ctx = { params: Promise<{ hash: string }>; searchParams: Promise<{ v?: string; sh?: string; t?: string; e?: string; ap?: string }> };

export async function generateMetadata({ searchParams }: Ctx) {
  const sp = await searchParams;
  const v = sp?.v;
  const sh = sp?.sh === "1";
  const tRaw = parseFloat(sp?.t ?? ""); const eRaw = parseFloat(sp?.e ?? "");
  const t = Number.isFinite(tRaw) && tRaw >= 0 ? Math.floor(tRaw) : null;
  const e = Number.isFinite(eRaw) && eRaw >= 0 ? Math.floor(eRaw) : null;
  const play = (auto: string) => (t != null ? `&start=${t}` : "") + (e != null && (t == null || e > t) ? `&end=${e}` : "");
  const title = v
    ? "Someone sent you a gift 🎁 — with a video"
    : "On-chain gift sent 🎁 — view the transaction";
  const desc = "Sent on Monad with MYTIPS — tap to watch the video and see the transaction.";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: v
        ? [
            {
              url: `https://i.ytimg.com/vi/${v}/maxresdefault.jpg`,
              width: 1280,
              height: 720,
            },
          ]
        : [{ url: "/mytips-icon.png" }],
    },
    twitter: {
      card: v ? "player" : "summary_large_image",
      title,
      description: desc,
      images: v
        ? [`https://i.ytimg.com/vi/${v}/maxresdefault.jpg`]
        : ["/mytips-icon.png"],
      player: v ? `https://www.youtube.com/embed/${v}?autoplay=1${play("1")}` : undefined,
      playerWidth: sh ? 360 : 640,
      playerHeight: sh ? 640 : 360,
    },
    other: v
      ? {
          "og:video": `https://www.youtube.com/embed/${v}?autoplay=1${play("1")}`,
          "og:video:secure_url": `https://www.youtube.com/embed/${v}?autoplay=1${play("1")}`,
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
  return <TxView hash={hash} vid={sp?.v ?? null} short={sp?.sh === "1"} start={t} end={e != null && e > (t ?? 0) ? e : null} autoplay={sp?.ap === "1"} />;
}
