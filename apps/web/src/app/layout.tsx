import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#F7F4EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://memoria.app"),
  title: "Memoria — Your memories, made timeless.",
  description: "A personal and family memory preservation and publishing platform. Preserve your life stories, family milestones, and meaningful memories in heirloom-quality digital and physical books.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Memoria — Your memories, made timeless.",
    description: "Preserve your life stories, family milestones, and meaningful memories in heirloom-quality digital and physical books.",
    url: "https://memoria.app",
    siteName: "Memoria",
    images: [
      {
        url: "/branding/memoria-app-icon-1024.png",
        width: 1024,
        height: 1024,
        alt: "Memoria — Archival Memory Book with Tree of Life",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memoria — Your memories, made timeless.",
    description: "Preserve your life stories, family milestones, and meaningful memories in heirloom-quality digital and physical books.",
    images: ["/branding/memoria-app-icon-1024.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <body className="antialiased bg-[#F7F4EE] text-[#28272A] min-h-screen selection:bg-[#76556F]/20 selection:text-[#20242C]">
        {children}
      </body>
    </html>
  );
}
