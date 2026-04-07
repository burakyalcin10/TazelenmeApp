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
              "flex min-h-14 items-center gap-4 rounded-2xl px-4 text-lg font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white/70 text-foreground hover:bg-white"
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
          <aside className="hidden rounded-[2rem] bg-sidebar p-5 shadow-sm ring-1 ring-foreground/10 lg:block">
            <div className="mb-8 space-y-2 px-2">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
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
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-white/90 px-5 py-4 shadow-sm ring-1 ring-foreground/10">
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
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{currentSection}</div>
                  <div className="text-xl font-semibold">Hos geldiniz, {user?.firstName || "Yonetici"}</div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="lg" variant="outline" />}>
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
