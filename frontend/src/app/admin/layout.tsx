import { verifyAdminSession } from "@/components/app/admin-guard";
import { AdminShell } from "@/components/app/admin-shell";
import { SessionSyncer } from "@/components/app/session-syncer";
import { getServerSession } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side oturum doğrulama — geçersizse /login'e redirect
  const user = await verifyAdminSession();
  // Client-side apiRequest'in cookie'ye erişebilmesi için session'ı senkronize et
  const session = await getServerSession();

  return (
    <>
      <SessionSyncer session={session} />
      <AdminShell user={user}>{children}</AdminShell>
    </>
  );
}
