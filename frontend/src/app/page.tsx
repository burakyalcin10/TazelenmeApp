import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session?.accessToken) {
    redirect("/login");
  }

  // Role'a göre doğru panele yönlendir
  if (session.user?.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/student");
  }
}
