"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  Home,
  LogOut,
  FileText,
  User,
} from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

const navItems = [
  { href: "/student", label: "Ana Sayfa", icon: Home },
  { href: "/student/attendance", label: "Yoklama", icon: ClipboardCheck },
  { href: "/student/materials", label: "Materyaller", icon: FileText },
];

function UserInitials({ user }: { user: AdminUser }) {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
      {initials || "ÖĞ"}
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
    <div data-student-portal className="flex min-h-screen flex-col bg-background">
      {/* ─── Top Header ─── */}
      <header className="glass-header sticky top-0 z-40 border-b border-border/50 px-5 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <UserInitials user={user} />
            <div>
              <p className="text-lg font-bold text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                Tazelenme Üniversitesi
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Çıkış yap"
            >
              <LogOut className="size-5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Page Content ─── */}
      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-lg">{children}</div>
      </main>

      {/* ─── Bottom Navigation (Mobile-first, large touch targets) ─── */}
      <nav className="glass-header sticky bottom-0 z-40 border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
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
                  "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors",
                  "min-h-[60px]", // A11Y: 60px touch target
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-6",
                    isActive && "text-primary"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[13px]">{label}</span>
                {isActive && (
                  <div className="absolute top-0 h-[3px] w-12 rounded-b-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
