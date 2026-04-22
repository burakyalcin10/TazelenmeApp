"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Shield,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";

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

export default function StudentAttendancePage() {
  const [courses, setCourses] = useState<CourseAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const data = await apiRequest<{
          courseAttendance: CourseAttendanceItem[];
        }>("/api/v1/student/my-attendance");
        setCourses(data.courseAttendance);
      } catch {
        setError("Yoklama bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  // Summary stats
  const totalSessions = courses.reduce((s, c) => s + c.totalSessions, 0);
  const totalPresent = courses.reduce((s, c) => s + c.present, 0);
  const overallRate =
    totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Derslerim & Yoklama
          </h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Derslerim & Yoklama
          </h1>
        </div>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <XCircle className="mx-auto size-12 text-red-400" />
          <p className="mt-4 text-lg font-bold text-foreground">{error}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
          aria-label="Geri dön"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Derslerim & Yoklama
          </h1>
          <p className="text-sm text-muted-foreground">
            {courses.length} kayıtlı ders
          </p>
        </div>
      </div>

      {/* ─── Overall Summary Card ─── */}
      {courses.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F3D2E] to-[#1a5240] p-6 text-white">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#1D9E75]/15" />
          <div className="pointer-events-none absolute -bottom-4 -left-4 size-20 rounded-full bg-[#1D9E75]/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-[#86f8c9]" />
              <p className="text-sm font-semibold text-white/70">
                Genel Katılım Özeti
              </p>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <span className="text-5xl font-extrabold">%{overallRate}</span>
              <span className="mb-1 text-lg text-white/60">
                ortalama katılım
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#86f8c9] to-[#1D9E75] transition-all duration-700"
                style={{ width: `${Math.min(overallRate, 100)}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-white/50">
              <span>{totalPresent} katılım</span>
              <span>{totalSessions} toplam oturum</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Course Cards ─── */}
      {courses.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <BookOpen className="mx-auto size-14 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-bold text-foreground">
            Kayıtlı ders bulunamadı
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Henüz herhangi bir derse kayıtlı değilsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const isRisk = course.status === "AT_RISK";

            return (
              <div
                key={course.courseId}
                className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                  isRisk
                    ? "ring-red-200/60"
                    : "ring-black/[0.03]"
                }`}
              >
                {/* Course header */}
                <div className="flex items-start justify-between gap-3 p-5 pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl ${
                        isRisk
                          ? "bg-gradient-to-br from-red-50 to-red-100"
                          : "bg-gradient-to-br from-emerald-50 to-emerald-100"
                      }`}
                    >
                      <BookOpen
                        className={`size-5 ${isRisk ? "text-red-500" : "text-emerald-600"}`}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {course.courseName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {course.term} · {course.totalSessions} oturum
                      </p>
                    </div>
                  </div>

                  {isRisk ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100">
                      <AlertTriangle className="size-3.5" />
                      Risk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-100">
                      <Shield className="size-3.5" />
                      Geçiyor
                    </span>
                  )}
                </div>

                {/* Progress section */}
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Katılım
                    </span>
                    <span
                      className={`text-2xl font-extrabold ${
                        course.attendanceRate >= 70
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      %{course.attendanceRate}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        course.attendanceRate >= 70
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : "bg-gradient-to-r from-red-400 to-orange-400"
                      }`}
                      style={{
                        width: `${Math.min(course.attendanceRate, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-px border-t border-gray-50 bg-gray-50">
                  <div className="flex flex-col items-center bg-white py-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span className="text-lg font-bold text-foreground">
                        {course.present}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Katıldı
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-4 text-amber-500" />
                      <span className="text-lg font-bold text-foreground">
                        {course.excused}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      İzinli
                    </span>
                  </div>
                  <div className="flex flex-col items-center bg-white py-3">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="size-4 text-red-400" />
                      <span className="text-lg font-bold text-foreground">
                        {course.absent}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Katılmadı
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
