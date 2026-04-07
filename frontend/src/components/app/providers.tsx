"use client";

import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/components/app/auth-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <AuthProvider>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
