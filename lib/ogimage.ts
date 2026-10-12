// Server-side: scrape the source page's og:image so Telegram/X/WhatsApp link
// previews show the actual video thumbnail instead of a generic icon.
// Uses curl because Facebook/Instagram/TikTok bot-filter Node's fetch.
import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);
const UA = "Mozilla/5.0";

async function curlHtml(url: string): Promise<string> {
  const { stdout } = await run(
    "curl",
    ["-sL", "-A", UA, "--max-time", "8", "-H", "Accept-Language: en-US,en;q=0.9", url],
    { timeout: 10000, maxBuffer: 4 * 1024 * 1024 }
  );
  return stdout;
}

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const html = await curlHtml(url);
    // property first, then name; content may come before the attribute name too
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (!m) return null;
    const img = m[1].replace(/&amp;/g, "&");
    return /^https?:\/\/.+/.test(img) && !/\.gif$|placeholder|sprite/i.test(img) ? img : null;
  } catch {
    return null;
  }
}

/** facebook.com/share/… -> canonical URL via one redirect hop (Node fetch gets 400'd) */
export async function curlRedirect(url: string): Promise<string | null> {
  try {
    const { stdout } = await run(
      "curl",
      ["-s", "-o", "/dev/null", "-w", "%{redirect_url}", "-A", UA, "--max-time", "8", url],
      { timeout: 10000 }
    );
    const loc = stdout.trim();
    return /facebook\.com/.test(loc) ? loc : null;
  } catch {
    return null;
  }
}
