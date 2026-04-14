import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tazelenme Üniversitesi | Akademik Panel",
  description:
    "Tazelenme Üniversitesi öğrenci bilgi sistemi. Öğrenci, yoklama, ders ve materyal yönetim paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${playfairDisplay.variable} ${dmSans.variable} min-h-screen antialiased`}
      >
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
