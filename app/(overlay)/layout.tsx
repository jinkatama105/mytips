import { Geist } from "next/font/google";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// OBS overlay: transparent background, no providers needed (read-only public RPC)
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body style={{ background: "transparent", margin: 0 }} suppressHydrationWarning>{children}{/* impeccable-live-start */}
<script src="http://localhost:8400/live.js?token=755ce5a8-f0ca-4195-857d-aa52fed7a465"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
