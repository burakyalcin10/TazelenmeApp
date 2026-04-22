"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Heart,
} from "lucide-react";
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

export default function StudentHomePage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const session = getStoredSession();
  const user = session?.user;

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiRequest<{
          courseAttendance: CourseAttendanceItem[];
        }>("/api/v1/student/my-attendance");
        const courses = data.courseAttendance;
        const totalCourses = courses.length;
        const atRiskCount = courses.filter(
          (c) => c.status === "AT_RISK"
        ).length;
        const overallRate =
          totalCourses > 0
            ? Math.round(
                courses.reduce((sum, c) => sum + c.attendanceRate, 0) /
                  totalCourses
              )
            : 0;

        setStats({ totalCourses, atRiskCount, overallRate });
      } catch {
        // Sessiz hata
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="space-y-6">
      {/* ─── Greeting Card ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F1EFE8] to-[#E8E5D8] p-6">
        {/* Decorative */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-primary/5" />
        <div className="pointer-events-none absolute bottom-2 right-4 opacity-10">
          <Sparkles className="size-20 text-primary" />
        </div>

        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary/70">
            {greeting}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-foreground">
            {user?.firstName || "Öğrenci"} 👋
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Bugün öğrenci portalınıza hoş geldiniz.
          </p>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      {!loading && stats && (
        <div className="grid grid-cols-3 gap-3">
          {/* Derslerim */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.03] transition-all hover:shadow-md">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
              <BookOpen className="size-5 text-blue-600" />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-foreground">
              {stats.totalCourses}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              Aktif Ders
            </div>
          </div>

          {/* Katılım */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.03] transition-all hover:shadow-md">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <div
              className={`mt-3 text-2xl font-extrabold ${
                stats.overallRate >= 70
                  ? "text-emerald-600"
                  : "text-orange-500"
              }`}
            >
              %{stats.overallRate}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              Katılım
            </div>
          </div>

          {/* Risk */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.03] transition-all hover:shadow-md">
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${
                stats.atRiskCount > 0
                  ? "bg-gradient-to-br from-red-50 to-red-100"
                  : "bg-gradient-to-br from-emerald-50 to-emerald-100"
              }`}
            >
              {stats.atRiskCount > 0 ? (
                <AlertTriangle className="size-5 text-red-500" />
              ) : (
                <Heart className="size-5 text-emerald-600" />
              )}
            </div>
            <div
              className={`mt-3 text-2xl font-extrabold ${
                stats.atRiskCount > 0 ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {stats.atRiskCount}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              Riskli Ders
            </div>
          </div>
        </div>
      )}

      {/* ─── Skeleton loading ─── */}
      {loading && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      )}

      {/* ─── Risk Alert ─── */}
      {stats && stats.atRiskCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50 to-orange-50 p-5">
          <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-red-100/40" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100">
              <AlertTriangle className="size-6 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-700">
                Devamsızlık Uyarısı
              </p>
              <p className="mt-1 text-sm leading-relaxed text-red-600/80">
                {stats.atRiskCount} dersinizde katılım oranınız %70&apos;in
                altında. Yoklama sayfanızdan detayları inceleyebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation Cards ─── */}
      <div className="space-y-3">
        <p className="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Hızlı Erişim
        </p>

        {/* Derslerim & Yoklama */}
        <Link
          href="/student/attendance"
          className="group flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:shadow-lg hover:ring-primary/20 active:scale-[0.98]"
        >
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 transition-transform duration-200 group-hover:scale-105">
            <ClipboardCheck className="size-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              Derslerim & Yoklama
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Devamsızlık durumunuzu ve katılım oranlarınızı görüntüleyin
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Ders Materyalleri */}
        <Link
          href="/student/materials"
          className="group flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:shadow-lg hover:ring-accent/20 active:scale-[0.98]"
        >
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 transition-transform duration-200 group-hover:scale-105">
            <FileText className="size-8 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              Ders Materyalleri
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ders notlarını, videoları ve dokümanları indirin
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* ─── Footer info ─── */}
      <div className="pb-2 pt-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Tazelenme Üniversitesi © 2026
        </p>
      </div>
    </div>
  );
}
