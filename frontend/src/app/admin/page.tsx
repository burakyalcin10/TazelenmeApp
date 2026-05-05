"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { LoadingBlock } from "@/components/app/loading-block";
import { EmptyState } from "@/components/app/empty-state";
import { apiRequest } from "@/lib/api";
import { formatDate, formatPercentage } from "@/lib/format";
import type {
  AttendanceSummary,
  CourseListItem,
  NotificationItem,
  SessionListItem,
  StudentListItem,
} from "@/lib/types";

interface DashboardState {
  students: StudentListItem[];
  riskStudents: StudentListItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  courses: CourseListItem[];
  sessions: SessionListItem[];
  trend: AttendanceSummary | null;
}

const initialState: DashboardState = {
  students: [],
  riskStudents: [],
  notifications: [],
  unreadCount: 0,
  courses: [],
  sessions: [],
  trend: null,
};

export default function AdminDashboardPage() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [studentsData, riskData, notificationsData, unreadData, coursesData, sessionsData] =
          await Promise.all([
            apiRequest<{ students: StudentListItem[]; pagination: { total: number } }>("/api/v1/students?limit=100"),
            apiRequest<{ students: StudentListItem[] }>("/api/v1/students?isAtRisk=true&limit=6"),
            apiRequest<{ notifications: NotificationItem[] }>("/api/v1/notifications?limit=5"),
            apiRequest<{ unreadCount: number }>("/api/v1/notifications/unread-count"),
            apiRequest<{ courses: CourseListItem[] }>("/api/v1/courses?isActive=true&limit=100"),
            apiRequest<{ sessions: SessionListItem[] }>("/api/v1/sessions?limit=12"),
          ]);

        const firstCourseId = coursesData.courses[0]?.id || "";
        const trend = firstCourseId
          ? await apiRequest<AttendanceSummary>(`/api/v1/reports/attendance-summary?courseId=${firstCourseId}`)
          : null;

        if (ignore) return;

        setState({
          students: studentsData.students,
          riskStudents: riskData.students,
          notifications: notificationsData.notifications,
          unreadCount: unreadData.unreadCount,
          courses: coursesData.courses,
          sessions: sessionsData.sessions,
          trend,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dashboard verileri yüklenemedi.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();
    return () => { ignore = true; };
  }, []);

  if (loading) {
    return <LoadingBlock description="Dashboard verileri yükleniyor..." />;
  }

  const totalStudents = state.students.length;
  const todaySessions = state.sessions.slice(0, 6);
  const activeCourses = state.courses.filter((c) => c.isActive).length;
  const attendanceRate = state.trend?.averageAttendanceRate ?? 0;
  const latestStudents = state.students.slice(0, 3);

  const unreadAlerts = state.notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner ─── */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl text-forest sm:text-3xl">
          Hoş geldiniz, Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="surface-kpi">
          <p className="panel-label">Toplam Öğrenci</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">
            {totalStudents}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Aktif kayıt</p>
        </div>
        <div className="surface-kpi">
          <p className="panel-label">Aktif Ders</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">
            {activeCourses}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Dönem boyu</p>
        </div>
        <div className="surface-kpi">
          <p className="panel-label">Yaklaşan Oturum</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">
            {todaySessions.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Sonraki 6</p>
        </div>
        <div className="surface-kpi">
          <p className="panel-label">Bildirim</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl tracking-tight text-forest">
              {state.unreadCount}
            </span>
            {state.unreadCount > 0 ? (
              <span className="rounded-md bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-foreground">
                YENİ
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Okunmamış</p>
        </div>
      </div>

      {/* ─── Hero Row: Attendance Trend + Risk Notifications ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hero Metric — Attendance */}
        <div className="surface-card relative overflow-hidden lg:col-span-2">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="panel-label">Ortalama Katılım</p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-serif text-4xl tracking-tight text-primary sm:text-5xl">
                  {formatPercentage(attendanceRate)}
                </span>
                {state.trend ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary/80">
                    <TrendingUp className="size-3.5" />
                    Aktif dönem
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {state.courses[0]?.name
                  ? `${state.courses[0].name} dersi referans alındı`
                  : "Henüz aktif ders yok"}
              </p>
            </div>
            <Link
              href="/admin/courses"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
            >
              Detaylı rapor
              <ChevronRight className="ml-1 size-4" />
            </Link>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/[0.06] to-transparent" />
        </div>

        {/* Risk Notifications */}
        <div className="surface-alert flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/admin/risks"
              className="flex items-center gap-2 text-sm font-semibold text-amber-foreground hover:underline"
            >
              <ShieldAlert className="size-4" />
              Risk bildirimleri
            </Link>
            {unreadAlerts > 0 ? (
              <span className="rounded-md bg-amber px-1.5 py-0.5 text-[10px] font-semibold text-amber-foreground">
                {unreadAlerts} YENİ
              </span>
            ) : null}
          </div>
          <div className="flex-1 space-y-2">
            {state.riskStudents.length === 0 && state.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Şu an risk bildirimi yok.</p>
            ) : (
              <>
                {state.riskStudents.slice(0, 2).map((s) => (
                  <div key={s.id} className="rounded-lg border border-amber/20 bg-white/60 p-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Devamsızlık eşiğine ulaştı
                    </p>
                  </div>
                ))}
                {state.notifications.slice(0, 2).map((n) => (
                  <div key={n.id} className="rounded-lg border border-amber/20 bg-white/60 p-2.5">
                    <p className="line-clamp-1 text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
              </>
            )}
          </div>
          <Link
            href="/admin/risks"
            className="mt-3 inline-flex items-center text-xs font-semibold text-amber-foreground hover:underline"
          >
            TÃ¼m riskleri gÃ¶r
            <ChevronRight className="ml-1 size-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── Recent Students Table ─── */}
      <div className="surface-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Son kayıtlı öğrenciler</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sisteme en son eklenen profiller
            </p>
          </div>
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tümünü gör
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {latestStudents.length === 0 ? (
          <EmptyState
            title="Öğrenci bulunamadı"
            description="Henüz sisteme kayıtlı öğrenci bulunmuyor."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 pb-3 font-semibold">Öğrenci</th>
                  <th className="px-3 pb-3 font-semibold">Sağlık</th>
                  <th className="px-3 pb-3 font-semibold">Kayıt</th>
                  <th className="px-3 pb-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestStudents.map((student) => {
                  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
                  return (
                    <tr key={student.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-forest">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {student.tcNo || student.id.slice(0, 8)}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {student.healthConditions.length > 0
                          ? `${student.healthConditions.length} durum`
                          : "Normal"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        {student.isAtRisk ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            <span className="size-1.5 rounded-full bg-red-500" />
                            Riskli
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <span className="size-1.5 rounded-full bg-primary" />
                            Aktif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
