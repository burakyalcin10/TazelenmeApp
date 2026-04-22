"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
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
      } catch (err) {
        setError("Yoklama bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
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
              className="h-40 animate-pulse rounded-2xl bg-secondary"
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
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Derslerim & Yoklama
          </h1>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <XCircle className="mx-auto size-10 text-destructive" />
          <p className="mt-3 text-lg font-semibold text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
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

      {/* Ders yoklama kartları */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto size-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            Kayıtlı ders bulunamadı
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Henüz herhangi bir derse kayıtlı değilsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.courseId}
              className={`rounded-2xl border-2 bg-card p-5 transition-all ${
                course.status === "AT_RISK"
                  ? "border-destructive/30"
                  : "border-border"
              }`}
            >
              {/* Ders başlığı ve risk badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {course.courseName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{course.term}</p>
                </div>
                {course.status === "AT_RISK" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Risk
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <CheckCircle2 className="size-3.5" />
                    Geçiyor
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Katılım Oranı
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      course.attendanceRate >= 70
                        ? "text-primary"
                        : "text-destructive"
                    }`}
                  >
                    %{course.attendanceRate}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      course.attendanceRate >= 70
                        ? "bg-gradient-to-r from-primary to-accent"
                        : "bg-gradient-to-r from-destructive/80 to-destructive"
                    }`}
                    style={{ width: `${Math.min(course.attendanceRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Detay sayıları */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3">
                  <CheckCircle2 className="size-5 text-primary" />
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {course.present}
                    </div>
                    <div className="text-xs text-muted-foreground">Katıldı</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-amber/10 p-3">
                  <Clock className="size-5 text-amber-foreground" />
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {course.excused}
                    </div>
                    <div className="text-xs text-muted-foreground">İzinli</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-destructive/5 p-3">
                  <XCircle className="size-5 text-destructive" />
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {course.absent}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Katılmadı
                    </div>
                  </div>
                </div>
              </div>

              {/* Toplam oturum */}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Toplam {course.totalSessions} ders oturumu
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
