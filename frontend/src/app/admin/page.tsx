"use client";

import { useEffect, useState } from "react";
import { BellRing, BookOpen, CalendarClock, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { AttendanceTrendChart } from "@/components/app/attendance-trend-chart";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedCourseId, setSelectedCourseId] = useState("");

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

        if (ignore) {
          return;
        }

        setSelectedCourseId(firstCourseId);
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
        toast.error(error instanceof Error ? error.message : "Dashboard verileri yuklenemedi.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCourseChange(courseId: string) {
    setSelectedCourseId(courseId);

    if (!courseId) {
      setState((current) => ({
        ...current,
        trend: null,
      }));
      return;
    }

    try {
      const trend = await apiRequest<AttendanceSummary>(`/api/v1/reports/attendance-summary?courseId=${courseId}`);
      setState((current) => ({
        ...current,
        trend,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ders trend bilgisi yuklenemedi.");
    }
  }

  if (loading) {
    return <LoadingBlock description="Dashboard verileri yukleniyor..." />;
  }

  const activeCourses = state.courses.filter((course) => course.isActive).length;
  const upcomingSessions = state.sessions.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Koordinator Dashboard"
        description="Bugun icin en onemli ogrenci, bildirim ve ders hareketlerini tek ekranda takip edin."
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard
          title="Toplam ogrenci"
          value={state.students.length}
          description="Aktif kayitli ogrenci sayisi."
          icon={Users}
        />
        <StatCard
          title="Riskli ogrenci"
          value={state.riskStudents.length}
          description="Devamsizlik nedeniyle yakindan takip edilmesi gereken ogrenciler."
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard
          title="Aktif ders"
          value={activeCourses}
          description="Panelde yonetilen aktif ders adedi."
          icon={BookOpen}
        />
        <StatCard
          title="Okunmamis bildirim"
          value={state.unreadCount}
          description="Henuz gozden gecirilmeyen bildirim sayisi."
          icon={BellRing}
          tone={state.unreadCount > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AttendanceTrendChart
          title="Derse gore katilim trendi"
          description={
            state.trend
              ? `${state.trend.course.name} dersi icin ortalama katilim ${formatPercentage(state.trend.averageAttendanceRate)}`
              : "Katilim trendini gormek icin bir ders secin."
          }
          data={state.trend?.weeklyTrend.map((item) => ({
            weekNumber: item.weekNumber,
            attendanceRate: item.attendanceRate,
            classroom: item.classroom,
          })) || []}
        />

        <Card className="surface-panel-strong">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold">Ders secimi</CardTitle>
              <p className="text-base leading-7 text-muted-foreground">
                Dashboard grafikleri secili derse gore yenilenir.
              </p>
            </div>
            <Select value={selectedCourseId} onValueChange={(value) => void handleCourseChange(value || "")}>
              <SelectTrigger className="h-12 w-full max-w-sm rounded-xl bg-white text-base">
                <SelectValue placeholder="Bir ders secin" />
              </SelectTrigger>
              <SelectContent>
                {state.courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} - {course.term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="surface-muted p-5">
              <div className="panel-label">Ozet</div>
              <div className="mt-2 text-3xl font-semibold">
                {state.trend ? formatPercentage(state.trend.averageAttendanceRate) : "%0"}
              </div>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                Ortalama katilim orani ve haftalik degisim grafigi burada gosterilir.
              </p>
            </div>
            <Button size="lg" variant="outline" onClick={() => handleCourseChange(selectedCourseId)}>
              Veriyi yenile
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="surface-panel xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Riskli ogrenciler</CardTitle>
            <p className="text-base leading-7 text-muted-foreground">
              Bu liste devamsizlik riski nedeniyle oncelikli takip gerektirir.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.riskStudents.length === 0 ? (
              <EmptyState
                title="Riskli ogrenci bulunmuyor"
                description="Su anda bildirilmis devamsizlik riski gorunmuyor."
              />
            ) : (
              state.riskStudents.map((student) => (
                <div key={student.id} className="surface-muted p-4">
                  <div className="text-xl font-semibold">
                    {student.firstName} {student.lastName}
                  </div>
                  <div className="mt-1 text-base text-muted-foreground">
                    Kayit tarihi: {formatDate(student.createdAt)}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Kart: {student.activeCard?.uid || "Aktif kart yok"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Okunmamis bildirimler</CardTitle>
            <p className="text-base leading-7 text-muted-foreground">
              En son gelen uyarilar ve koordinator notlari.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.notifications.length === 0 ? (
              <EmptyState
                title="Bildirim bulunmuyor"
                description="Sistem su anda yeni bildirim uretmedi."
              />
            ) : (
              state.notifications.map((notification) => (
                <div key={notification.id} className="surface-muted p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">{formatDateTime(notification.createdAt)}</div>
                    </div>
                    <div className="rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                      {notification.isRead ? "Okundu" : "Yeni"}
                    </div>
                  </div>
                  <p className="mt-3 text-base leading-7 text-muted-foreground">{notification.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Yaklasan oturumlar</CardTitle>
            <p className="text-base leading-7 text-muted-foreground">
              Yakindaki ders oturumlarini ve yoklama hazirligini buradan takip edin.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <EmptyState
                title="Oturum bulunmuyor"
                description="Goruntulenecek planli oturum bulunamadi."
              />
            ) : (
              upcomingSessions.map((session) => (
                <div key={session.id} className="surface-muted p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CalendarClock className="size-6" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="text-lg font-semibold">{session.course.name}</div>
                      <div className="text-base text-muted-foreground">
                        {session.classroom.name} - Hafta {session.weekNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(session.sessionDate)} / {formatDateTime(session.startTime)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
