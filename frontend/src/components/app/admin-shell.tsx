"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

const navItems = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/students", label: "Öğrenciler", icon: Users },
  { href: "/admin/attendance", label: "Yoklama", icon: Bell },
  { href: "/admin/courses", label: "Dersler", icon: BookOpen },
  { href: "/admin/cards", label: "Kartlar", icon: CreditCard },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isExact = pathname === href;
        const isNested = pathname.startsWith(`${href}/`);
        const isActive = href === "/admin" ? isExact : isExact || isNested;

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-6 py-4 text-sm font-medium transition-all duration-200",
              isActive
                ? "border-l-4 border-[#1D9E75] bg-[#1a5240] font-bold text-[#86f8c9]"
                : "border-l-4 border-transparent text-white/70 hover:bg-[#1a5240] hover:text-white"
            )}
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserInitials({ user }: { user: AdminUser }) {
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-[#1a5240] text-sm font-bold text-[#86f8c9]">
      {initials || "AD"}
    </div>
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AdminUser;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-60 flex-col overflow-y-auto bg-[#0F3D2E] py-8 lg:flex">
        {/* Logo */}
        <div className="mb-10 px-6">
          <h1 className="font-serif text-xl font-bold tracking-tight text-white">
            Tazelenme Üni.
          </h1>
          <p className="mt-1 text-xs font-medium text-white/50">
            Akademik Portal
          </p>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* Bottom section */}
        <div className="mt-auto border-t border-white/10 pt-4">
          <Link
            href="#"
            className="flex items-center gap-3 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
          >
            <Settings className="size-5" />
            <span>Ayarlar</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
            >
              <LogOut className="size-5" />
              <span>Çıkış Yap</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#0F3D2E] py-8 shadow-2xl">
            <div className="mb-8 flex items-center justify-between px-6">
              <div>
                <h1 className="font-serif text-xl font-bold text-white">
                  Tazelenme Üni.
                </h1>
                <p className="mt-1 text-xs text-white/50">Akademik Portal</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-white/60 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto border-t border-white/10 pt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-6 py-3 text-sm text-white/50 hover:text-white"
                >
                  <LogOut className="size-5" />
                  <span>Çıkış Yap</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="lg:ml-60">
        {/* Sticky Header */}
        <header className="glass-header sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-10">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-forest hover:bg-secondary lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <span className="hidden font-serif text-lg italic text-forest lg:inline">
              Academic Curator
            </span>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Hızlı Arama..."
                className="h-9 rounded-full border-none bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="rounded-lg p-2 text-forest transition-colors hover:text-accent">
              <Bell className="size-5" />
            </button>

            {/* User avatar */}
            <UserInitials user={user} />
          </div>
        </header>

        {/* Page Content */}
        <main className="px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
