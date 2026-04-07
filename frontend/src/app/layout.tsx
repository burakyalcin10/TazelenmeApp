import type { Metadata } from "next";
import { Fira_Mono, Manrope } from "next/font/google";

import { Providers } from "@/components/app/providers";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TazelenmeApp Admin Panel",
  description: "Tazelenme Universitesi icin ogrenci, yoklama ve materyal yonetim paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${manrope.variable} ${firaMono.variable} min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
