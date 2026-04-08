"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/app/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Ogrenciler", icon: Users },
  { href: "/admin/attendance", label: "Yoklama", icon: Bell },
  { href: "/admin/courses", label: "Dersler", icon: BookOpen },
  { href: "/admin/cards", label: "Kartlar", icon: CreditCard },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-15 items-center gap-4 rounded-[1.4rem] px-4 text-lg font-semibold transition-all duration-200",
              isActive
                ? "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_94%,white),color-mix(in_oklab,var(--primary)_78%,black_8%))] text-primary-foreground shadow-[0_20px_34px_-24px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                : "bg-white/70 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] hover:-translate-y-0.5 hover:bg-white"
            )}
          >
            <Icon className="size-6" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const currentSection =
    navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label || "Panel";

  return (
    <div className="min-h-screen">
      <div className="panel-shell">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--sidebar)_92%,white),color-mix(in_oklab,var(--sidebar)_82%,var(--secondary)))] p-5 shadow-[0_28px_70px_-42px_rgba(34,62,97,0.36)] lg:block">
            <div className="mb-8 space-y-2 px-2">
              <div className="panel-label">
                TazelenmeApp
              </div>
              <div className="text-3xl font-semibold">Admin Panel</div>
              <p className="text-base leading-7 text-muted-foreground">
                Ogrenci, yoklama ve ders yonetimini tek yerden sakin ve kolay bir sekilde yapin.
              </p>
            </div>
            <Navigation />
          </aside>

          <div className="space-y-6">
            <header className="surface-panel-strong flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger render={<Button size="icon-lg" variant="outline" className="lg:hidden" />}>
                    <Menu className="size-6" />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-sm bg-sidebar">
                    <SheetHeader>
                      <SheetTitle className="text-2xl">Menu</SheetTitle>
                    </SheetHeader>
                    <div className="px-4 pb-6">
                      <Navigation />
                    </div>
                  </SheetContent>
                </Sheet>
                <div>
                  <div className="panel-label">{currentSection}</div>
                  <div className="text-2xl font-semibold">Hos geldiniz, {user?.firstName || "Yonetici"}</div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="lg" variant="outline" className="min-w-52 justify-between" />}>
                  {user?.firstName} {user?.lastName}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-60">
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div>{user?.email || user?.phone || "Admin kullanici"}</div>
                  </div>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="size-4" />
                    Cikis yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <main className="space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
