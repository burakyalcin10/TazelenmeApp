import { verifyStudentSession } from "@/components/app/student/student-guard";
import { StudentShell } from "@/components/app/student/student-shell";
import { SessionSyncer } from "@/components/app/session-syncer";
import { getServerSession } from "@/lib/session";

export default async function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side oturum doğrulama — geçersizse /login'e redirect
  const user = await verifyStudentSession();
  // Client-side apiRequest'in cookie'ye erişebilmesi için session'ı senkronize et
  const session = await getServerSession();

  return (
    <>
      <SessionSyncer session={session} />
      <StudentShell user={user}>{children}</StudentShell>
    </>
  );
}
