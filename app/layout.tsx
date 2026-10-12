import "./globals.css";

// Root layout is a pass-through; (main) renders its own <html>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
