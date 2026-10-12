// Multi-platform video detection + embed URLs for MYTIPS gift links.
// Supported: YouTube, Facebook, X/Twitter, TikTok, Instagram.

export type Platform = "youtube" | "facebook" | "twitter" | "tiktok" | "instagram";

export type Media = {
  platform: Platform;
  /** youtube: 11-char video id · twitter/tiktok: numeric id · instagram: shortcode · facebook: full original URL */
  id: string;
  /** true for vertical (9:16) videos */
  vertical: boolean;
  /** label shown in UI */
  label: string;
};

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;

export function detectMedia(link: string): Media | null {
  const raw = link.trim();
  if (!raw) return null;

  // YouTube
  const yt = raw.match(YT_RE);
  if (yt) {
    return { platform: "youtube", id: yt[1], vertical: /\/shorts\//i.test(raw), label: "YouTube" };
  }

  // X / Twitter — status id is what the embed needs
  const tw = raw.match(
    /(?:twitter\.com|x\.com)\/(?:#!\/)?\w+\/status(?:es)?\/(\d{6,25})/i
  );
  if (tw) return { platform: "twitter", id: tw[1], vertical: false, label: "X (Twitter)" };

  // TikTok — full URLs only (vm./vt. short links can't be resolved client-side)
  const tk = raw.match(/tiktok\.com\/@[\w.\-]+\/video\/(\d{6,25})/i);
  if (tk) return { platform: "tiktok", id: tk[1], vertical: true, label: "TikTok" };

  // Instagram — posts and reels
  const ig = raw.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]{6,15})/i);
  if (ig) {
    return {
      platform: "instagram",
      id: ig[1],
      vertical: /\/reels?\//i.test(raw),
      label: "Instagram",
    };
  }

  // Facebook — watch / videos / reels; the plugin needs the ORIGINAL url
  if (
    /(?:facebook\.com|fb\.watch)\/.*(?:videos?|reels?|watch)/i.test(raw) ||
    /^https:\/\/fb\.watch\//i.test(raw)
  ) {
    return { platform: "facebook", id: raw, vertical: /\/reels?\//i.test(raw), label: "Facebook" };
  }

  return null;
}

/** iframe src for the embed player. `muted`/`autoplay` only honored by YouTube. */
export function embedSrc(m: Media, opts: { autoplay?: boolean; muted?: boolean; start?: number | null; end?: number | null; enableJsApi?: boolean } = {}): string {
  switch (m.platform) {
    case "youtube": {
      const qs = [
        m.vertical ? "rel=0&modestbranding=1" : "rel=0&modestbranding=1",
        opts.enableJsApi ? "enablejsapi=1" : "",
        `autoplay=${opts.autoplay ? 1 : 0}`,
        `mute=${opts.autoplay && opts.muted !== false ? 1 : 0}`,
        opts.start != null ? `start=${Math.floor(opts.start)}` : "",
        opts.end != null && opts.end > (opts.start ?? 0) ? `end=${Math.floor(opts.end)}` : "",
      ]
        .filter(Boolean)
        .join("&");
      return `https://www.youtube-nocookie.com/embed/${m.id}?${qs}`;
    }
    case "facebook":
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(m.id)}&show_text=false&autoplay=${opts.autoplay ? "true" : "false"}&width=560`;
    case "twitter":
      return `https://platform.twitter.com/embed/Tweet.html?id=${m.id}&theme=light&cards=hidden`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${m.id}?lang=en-US`;
    case "instagram":
      return `https://www.instagram.com/${m.vertical ? "reel" : "p"}/${m.id}/embed/captioned/`;
  }
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X",
  tiktok: "TikTok",
  instagram: "Instagram",
};
