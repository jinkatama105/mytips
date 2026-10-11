import "./globals.css";

// Root layout is a pass-through; each route group ((main)/(overlay)) renders its own <html>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
