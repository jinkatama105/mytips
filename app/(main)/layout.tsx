import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "@/lib/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MYTIPS — send onchain gifts with a video",
  description:
    "Send native MON on Monad with a YouTube/TikTok/X video attached — one shareable gift page with the video in the preview card on X, Telegram, and WhatsApp.",
  other: {
    // Hard signal for force-dark browsers (Samsung Internet, MIUI, Chrome flags):
    // this site is light-only; do not auto-darken it.
    "color-scheme": "light",
    "supported-color-schemes": "light",
  },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
        {/* impeccable-live-start */}
        {process.env.NODE_ENV === "development" && (
          <Script src={"http://localhost:8400/live.js?token=755ce5a8-f0ca-4195-857d-aa52fed7a465"} />
        )}
        {/* impeccable-live-end */}
      </body>
    </html>
  );
}
