"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  BookOpen,
  ChevronRight,
  MoreVertical,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { LoadingBlock } from "@/components/app/loading-block";
import { EmptyState } from "@/components/app/empty-state";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime, formatPercentage } from "@/lib/format";
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

  return (
    <div className="space-y-8">
      {/* ─── Welcome Banner ─── */}
      <div>
        <h1 className="font-serif text-4xl text-forest">
          Hoş geldiniz, Admin.
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bugün {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}. Akademik süreçleriniz güncel.
        </p>
      </div>

      {/* ─── Hero Row: Yoklama Oranı + Risk Bildirimleri ─── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Hero Metric — Yoklama Oranı */}
        <div className="relative col-span-1 overflow-hidden rounded-xl bg-muted p-8 xl:col-span-8">
          <div className="relative z-10">
            <h3 className="font-serif text-lg text-forest">Yoklama Oranı</h3>
            <p className="mt-1 text-6xl font-bold tracking-tighter text-primary">
              {formatPercentage(attendanceRate)}
            </p>
            {state.trend && (
              <div className="mt-3 flex items-center gap-2 text-primary">
                <TrendingUp className="size-4" />
                <span className="text-sm font-medium">
                  Ortalama katılım oranı
                </span>
              </div>
            )}
          </div>
          <div className="mt-6 relative z-10">
            <button className="rounded-full bg-forest px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary">
              Detayları İncele
            </button>
          </div>
          {/* Dekoratif gradient */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2">
            <div className="h-full w-full bg-gradient-to-l from-primary/10 to-transparent" />
          </div>
        </div>

        {/* Risk Bildirimleri */}
        <div className="col-span-1 xl:col-span-4">
          <div className="surface-alert h-full">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-amber-foreground">
                <ShieldAlert className="size-5" />
                Risk Bildirimleri
              </h3>
              {state.notifications.filter((n) => !n.isRead).length > 0 && (
                <span className="rounded bg-amber px-2 py-1 text-xs font-bold text-amber-foreground">
                  {state.notifications.filter((n) => !n.isRead).length} Yeni
                </span>
              )}
            </div>
            <div className="space-y-3">
              {state.riskStudents.length === 0 && state.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Şu an risk bildirimi yok.</p>
              ) : (
                <>
                  {state.riskStudents.slice(0, 2).map((s) => (
                    <div key={s.id} className="rounded-lg bg-white/50 p-3 ghost-border">
                      <p className="text-sm font-bold text-foreground">Devamsızlık Sınırı</p>
                      <p className="text-xs text-muted-foreground">
                        {s.firstName} {s.lastName} kritik seviyeye ulaştı.
                      </p>
                    </div>
                  ))}
                  {state.notifications.slice(0, 2).map((n) => (
                    <div key={n.id} className="rounded-lg bg-white/50 p-3 ghost-border">
                      <p className="text-sm font-bold text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-kpi">
          <p className="panel-label mb-2">Toplam Öğrenci</p>
          <h2 className="font-serif text-5xl text-forest">{totalStudents}</h2>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-forest/60">
            <span>Aktif Kayıt</span>
            <span className="rounded-full bg-white px-2 py-1">Tüm Yıllar</span>
          </div>
        </div>

        <div className="surface-kpi">
          <p className="panel-label mb-2">Bugün: Oturum</p>
          <h2 className="font-serif text-5xl text-forest">{todaySessions.length}</h2>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-forest/60">
            <span>Kapasite Oranı</span>
            <span className="rounded-full bg-white px-2 py-1">
              {formatPercentage(attendanceRate)}
            </span>
          </div>
        </div>

        <div className="surface-kpi">
          <p className="panel-label mb-2">Aktif Ders</p>
          <h2 className="font-serif text-5xl text-forest">{activeCourses}</h2>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-forest/60">
            <span>Dönem Dersleri</span>
            <span className="rounded-full bg-white px-2 py-1">Güncel</span>
          </div>
        </div>

        <div className="surface-kpi">
          <p className="panel-label mb-2">Okunmamış Bildirim</p>
          <h2 className="font-serif text-5xl text-forest">{state.unreadCount}</h2>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-forest/60">
            <span>Bekleyen</span>
            <span className="rounded-full bg-white px-2 py-1">
              {state.unreadCount > 0 ? "Yeni" : "Temiz"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Son Kayıtlı Öğrenciler Tablosu ─── */}
      <div className="surface-card">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-serif text-2xl text-forest">Son Kayıtlı Öğrenciler</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sisteme en son giriş yapan veya yeni kayıt olan profiller.
            </p>
          </div>
          <button className="flex items-center gap-1 border-b-2 border-accent pb-1 text-sm font-bold text-primary">
            Tümünü Gör <ChevronRight className="size-4" />
          </button>
        </div>

        {latestStudents.length === 0 ? (
          <EmptyState
            title="Öğrenci bulunamadı"
            description="Henüz sisteme kayıtlı öğrenci bulunmuyor."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="ghost-border border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 pb-4">Öğrenci Profili</th>
                  <th className="px-4 pb-4">Sağlık Durumu</th>
                  <th className="px-4 pb-4">Kayıt Tarihi</th>
                  <th className="px-4 pb-4">Durum</th>
                  <th className="px-4 pb-4 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y ghost-border">
                {latestStudents.map((student) => {
                  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
                  return (
                    <tr
                      key={student.id}
                      className="transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex size-12 items-center justify-center rounded-full bg-accent/15 font-bold text-forest">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-forest">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {student.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <p className="text-sm font-medium">
                          {student.healthConditions.length > 0
                            ? `${student.healthConditions.length} durum`
                            : "Normal"}
                        </p>
                      </td>
                      <td className="px-4 py-6">
                        <p className="text-sm">{formatDate(student.createdAt)}</p>
                      </td>
                      <td className="px-4 py-6">
                        {student.isAtRisk ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                            <span className="size-2 rounded-full bg-red-500" />
                            Riskli
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            <span className="size-2 rounded-full bg-primary" />
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-6 text-right">
                        <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-forest">
                          <MoreVertical className="size-5" />
                        </button>
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
