import { verifyAdminSession } from "@/components/app/admin-guard";
import { AdminShell } from "@/components/app/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side oturum doğrulama — geçersizse /login'e redirect
  const user = await verifyAdminSession();

  return <AdminShell user={user}>{children}</AdminShell>;
}
