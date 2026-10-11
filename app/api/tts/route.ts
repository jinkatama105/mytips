import { NextRequest } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { Readable } from "stream";

// GET /api/tts?text=... -> MP3 voiceover for overlay tips (Edge TTS, free)

export async function GET(req: NextRequest) {
  const text = (req.nextUrl.searchParams.get("text") || "").slice(0, 300);
  if (!text) return new Response("missing text", { status: 400 });

  const voice =
    req.nextUrl.searchParams.get("voice") ||
    (/[\u0600-\u06FF]/.test(text)
      ? "ar-SA-ZariyahNeural"
      : /[\u4E00-\u9FFF]/.test(text)
        ? "zh-CN-XiaoxiaoNeural"
        : /[\u3040-\u30FF]/.test(text)
          ? "ja-JP-NanamiNeural"
          : "en-US-AriaNeural");

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    // Node Readable -> Web ReadableStream
    const web = Readable.toWeb(audioStream) as unknown as ReadableStream;
    return new Response(web, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
        "X-Voice": voice,
      },
    });
  } catch (e: any) {
    console.error("[tts]", e?.message || e);
    return new Response("tts failed", { status: 500 });
  }
}
