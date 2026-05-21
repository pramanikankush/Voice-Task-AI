import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Tasks — Memos to Tasks",
  description: "Convert spoken audio into structured, categorized tasks using AI.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="h-16 flex items-center px-6 border-b border-hairline bg-canvas">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#f54e00" />
              <path
                d="M14 8c1.66 0 3 1.34 3 3v2c0 1.66-1.34 3-3 3s-3-1.34-3-3v-2c0-1.66 1.34-3 3-3z"
                fill="white"
              />
              <path
                d="M10 13c0 2.76 2.24 5 5 5s5-2.24 5-5h1c0 3.53-2.61 6.43-6 6.92V22h-2v-3.08c-3.39-.49-6-3.39-6-6.92h1z"
                fill="white"
              />
            </svg>
            <span className="font-display text-title-md text-ink tracking-tight">
              Voice Tasks
            </span>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-section">
          {children}
        </main>
      </body>
    </html>
  );
}
