import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LocalApiBootstrap } from "@/components/local-api-bootstrap";
import { ThemeSync } from "@/components/theme-sync";
import { SyncInit } from "@/components/sync-init";
import { ElectronBridge } from "@/components/electron-bridge";
import { PwaInit } from "@/components/pwa-init";

// Base path for static assets on GitHub Pages (/open-writer/).
// Inlined at build time; empty locally.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manifestPath = `${BASE_PATH}/manifest.webmanifest`;

export const metadata: Metadata = {
  title: "Open Writer — Local-First Writing Studio",
  description: "An autonomous open-source local-first writing studio with story intelligence, AI agent, and design intelligence.",
  keywords: ["writing", "novel", "creative writing", "local-first", "open source", "story intelligence"],
  manifest: manifestPath,
  icons: {
    icon: [
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: `${BASE_PATH}/icons/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Open Writer",
  },
  applicationName: "Open Writer",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#d97706",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocalApiBootstrap />
          <ThemeSync />
          <SyncInit />
          <ElectronBridge />
          <PwaInit />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
