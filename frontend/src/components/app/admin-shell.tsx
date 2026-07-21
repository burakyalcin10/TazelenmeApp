"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

const navGroups = [
  {
    title: "Genel",
    items: [{ href: "/admin", label: "Panel", icon: LayoutDashboard }],
  },
  {
    title: "Yönetim",
    items: [
      { href: "/admin/students", label: "Öğrenciler", icon: Users },
      { href: "/admin/courses", label: "Dersler", icon: BookOpen },
      { href: "/admin/cards", label: "Kartlar", icon: CreditCard },
    ],
  },
  {
    title: "İzleme",
    items: [
      { href: "/admin/attendance", label: "Yoklama", icon: ClipboardCheck },
      { href: "/admin/risks", label: "Riskler", icon: ShieldAlert },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const headerNav = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/students", label: "Öğrenciler" },
  { href: "/admin/attendance", label: "Yoklama" },
  { href: "/admin/courses", label: "Dersler" },
  { href: "/admin/risks", label: "Riskler" },
  { href: "/admin/cards", label: "Kartlar" },
];

function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="ph__nav hidden lg:flex">
      {headerNav.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn("ph__navlink", isItemActive(pathname, href) && "is-active")}
          aria-current={isItemActive(pathname, href) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1">
      {navGroups.map((group) => (
        <div key={group.title} className="sn__group">
          <div className="sn__title">{group.title}</div>
          {group.items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn("sn__item", isItemActive(pathname, href) && "is-active")}
              aria-current={isItemActive(pathname, href) ? "page" : undefined}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function HeaderSearch() {
  const router = useRouter();
  return (
    <form
      className="ph__search hidden xl:flex"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") || "").trim();
        router.push(
          q ? `/admin/students?q=${encodeURIComponent(q)}` : "/admin/students"
        );
      }}
    >
      <Search className="size-4" />
      <input
        name="q"
        placeholder="Öğrenci ara — ad, soyad, TC"
        aria-label="Öğrenci ara"
      />
    </form>
  );
}

function LogoutItem() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="sn__item">
        <LogOut />
        <span>Çıkış Yap</span>
      </button>
    </form>
  );
}

function BrandWordmark() {
  return (
    <Link href="/admin" className="ph__brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/akdeniz-logo.png" alt="Akdeniz Üniversitesi" className="ph__logo" />
      <span className="ph__name">
        <span className="ph__name-line1">AKDENİZ</span>
        <span className="ph__name-line2">Üniversitesi · Tazelenme</span>
      </span>
    </Link>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  return <div className="ph__avatar">{initials || "AD"}</div>;
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
      {/* ─── Top header (Akdeniz portal chrome) ─── */}
      <header className="ph sticky top-0 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="ph__icon lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="size-5" />
        </button>

        <BrandWordmark />

        <HeaderNav />

        <div className="ph__spacer" />

        <HeaderSearch />

        <button className="ph__icon" title="Bildirimler" aria-label="Bildirimler">
          <Bell className="size-5" />
        </button>

        <UserAvatar user={user} />

        <form action={logoutAction}>
          <button
            type="submit"
            className="ph__icon"
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <LogOut className="size-5" />
          </button>
        </form>
      </header>

      {/* ─── Content (full width — nav lives in the top header) ─── */}
      <main>
        <div className="page-container px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      {/* ─── Mobile drawer ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="sn absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-3 pb-3">
              <BrandWordmark />
              <button
                onClick={() => setMobileOpen(false)}
                className="ph__icon"
                aria-label="Menüyü kapat"
              >
                <X className="size-5" />
              </button>
            </div>
            <SideNav onNavigate={() => setMobileOpen(false)} />
            <div className="mt-4 border-t border-[color:var(--border-akd)] pt-2">
              <LogoutItem />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
