"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Home,
  LogOut,
  FileText,
} from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

const navItems = [
  { href: "/student", label: "Ana Sayfa", icon: Home },
  { href: "/student/attendance", label: "Yoklama", icon: ClipboardCheck },
  { href: "/student/materials", label: "Materyaller", icon: FileText },
];

function UserAvatar({ user }: { user: AdminUser }) {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="relative">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D9E75] to-[#00694C] text-base font-bold text-white shadow-md shadow-primary/20">
        {initials || "ÖĞ"}
      </div>
      {/* Online dot */}
      <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
    </div>
  );
}

export function StudentShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const pathname = usePathname();

  return (
    <div data-student-portal className="flex min-h-screen flex-col bg-[#F7F6F2]">
      {/* ─── Premium Top Header ─── */}
      <header className="relative overflow-hidden bg-gradient-to-r from-[#0F3D2E] to-[#1a5240] px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[#1D9E75]/15" />
        <div className="pointer-events-none absolute -left-6 bottom-0 size-24 rounded-full bg-[#1D9E75]/10" />

        <div className="relative z-10 mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3.5">
            <UserAvatar user={user} />
            <div>
              <p className="text-lg font-bold text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm font-medium text-white/60">
                Tazelenme Üniversitesi
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
              aria-label="Çıkış yap"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Page Content ─── */}
      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-lg">{children}</div>
      </main>

      {/* ─── Premium Bottom Navigation ─── */}
      <nav className="sticky bottom-0 z-40 border-t border-border/30 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-stretch">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/student"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all duration-200",
                  "min-h-[64px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 h-[3px] w-10 rounded-b-full bg-gradient-to-r from-primary to-accent" />
                )}

                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 shadow-sm"
                      : "bg-transparent"
                  )}
                >
                  <Icon
                    className={cn("size-5", isActive && "text-primary")}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    isActive && "font-bold text-primary"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
