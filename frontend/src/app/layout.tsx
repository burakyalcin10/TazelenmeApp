import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Akdeniz Üniversitesi design system uses Gotham (proprietary); Inter Tight
// is the system's declared fallback and drives both body and display type.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tazelenme Üniversitesi — Akdeniz Üniversitesi",
  description:
    "Akdeniz Üniversitesi Tazelenme Üniversitesi (yaşlılar için akademi) öğrenci bilgi sistemi. Öğrenci, yoklama, ders ve materyal yönetim paneli.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tazelenme",
  },
};

export const viewport: Viewport = {
  themeColor: "#1D366A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${interTight.variable} min-h-screen antialiased`}
      >
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
