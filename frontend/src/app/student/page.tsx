"use client";

import Link from "next/link";
import { ClipboardCheck, FileText, BookOpen, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { getStoredSession } from "@/lib/session";

interface CourseAttendanceItem {
  courseId: string;
  courseName: string;
  term: string;
  totalSessions: number;
  present: number;
  excused: number;
  absent: number;
  attendanceRate: number;
  status: "PASSING" | "AT_RISK";
}

interface QuickStats {
  totalCourses: number;
  atRiskCount: number;
  overallRate: number;
}

const menuItems = [
  {
    href: "/student/attendance",
    label: "Derslerim & Yoklama",
    description: "Devamsızlık durumunuzu görüntüleyin",
    icon: ClipboardCheck,
    color: "bg-primary/10 text-primary",
    borderColor: "border-primary/20 hover:border-primary/40",
  },
  {
    href: "/student/materials",
    label: "Ders Materyalleri",
    description: "Ders notlarını ve dokümanları indirin",
    icon: FileText,
    color: "bg-accent/10 text-accent",
    borderColor: "border-accent/20 hover:border-accent/40",
  },
];

export default function StudentHomePage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const session = getStoredSession();
  const user = session?.user;

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiRequest<{ courseAttendance: CourseAttendanceItem[] }>(
          "/api/v1/student/my-attendance"
        );
        const courses = data.courseAttendance;
        const totalCourses = courses.length;
        const atRiskCount = courses.filter((c) => c.status === "AT_RISK").length;
        const overallRate =
          totalCourses > 0
            ? Math.round(
                courses.reduce((sum, c) => sum + c.attendanceRate, 0) / totalCourses
              )
            : 0;

        setStats({ totalCourses, atRiskCount, overallRate });
      } catch {
        // Sessiz hata — istatistikler opsiyonel
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hoş geldin mesajı */}
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Merhaba, {user?.firstName || "Öğrenci"} 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Tazelenme Üniversitesi öğrenci portalına hoş geldiniz.
        </p>
      </div>

      {/* Özet kartlar */}
      {!loading && stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {stats.totalCourses}
            </div>
            <div className="text-xs text-muted-foreground">Dersim</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center">
              <ClipboardCheck className="size-5 text-accent" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              %{stats.overallRate}
            </div>
            <div className="text-xs text-muted-foreground">Katılım</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center">
              <AlertTriangle
                className={`size-5 ${stats.atRiskCount > 0 ? "text-destructive" : "text-accent"}`}
              />
            </div>
            <div
              className={`mt-2 text-2xl font-bold ${stats.atRiskCount > 0 ? "text-destructive" : "text-foreground"}`}
            >
              {stats.atRiskCount}
            </div>
            <div className="text-xs text-muted-foreground">Risk</div>
          </div>
        </div>
      )}

      {/* Risk uyarısı */}
      {stats && stats.atRiskCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-l-4 border-destructive bg-destructive/5 p-5">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-destructive" />
          <div>
            <p className="text-base font-bold text-destructive">
              Devamsızlık Uyarısı
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.atRiskCount} dersinizde katılım oranı %70&apos;in altında.
              Detaylar için yoklama sayfanızı kontrol edin.
            </p>
          </div>
        </div>
      )}

      {/* Büyük menü butonları — A11Y: min 80px height, large text */}
      <div className="space-y-4">
        {menuItems.map(({ href, label, description, icon: Icon, color, borderColor }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-5 rounded-2xl border-2 bg-card p-6 transition-all duration-200 hover:shadow-md active:scale-[0.98] ${borderColor}`}
          >
            <div
              className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${color}`}
            >
              <Icon className="size-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{label}</h2>
              <p className="mt-1 text-base text-muted-foreground">
                {description}
              </p>
            </div>
            <svg
              className="size-6 shrink-0 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
