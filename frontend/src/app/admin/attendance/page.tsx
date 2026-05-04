"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, PlayCircle, StopCircle, UserX } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type {
  AttendanceSessionDetail,
  AttendanceStatus,
  ClassroomItem,
  CourseListItem,
  SessionListItem,
} from "@/lib/types";

type AttendanceListFilter = "ALL" | "PRESENT" | "ABSENT";

export default function AttendancePage() {
  const autoRefreshIntervalMs = 1000;
  const autoRefreshLabel = "Canli yenileme (1 sn)";
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionDetail, setSessionDetail] = useState<AttendanceSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceListFilter>("ALL");
  const [attendanceWindowLoading, setAttendanceWindowLoading] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState<{
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const liveRefreshInFlightRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const [courseData, classroomData] = await Promise.all([
          apiRequest<{ courses: CourseListItem[] }>("/api/v1/courses?limit=100"),
          apiRequest<{ classrooms: ClassroomItem[] }>("/api/v1/classrooms?limit=100"),
        ]);

        if (ignore) {
          return;
        }

        setCourses(courseData.courses);
        setClassrooms(classroomData.classrooms);
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Yoklama filtreleri yuklenemedi.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!courses.length && !classrooms.length) {
      return;
    }

    let ignore = false;

    async function loadSessionsForFilters() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (courseFilter !== "ALL") {
          params.set("courseId", courseFilter);
        }
        if (classroomFilter !== "ALL") {
          params.set("classroomId", classroomFilter);
        }

        const data = await apiRequest<{ sessions: SessionListItem[] }>(`/api/v1/sessions?${params.toString()}`);
        if (ignore) {
          return;
        }

        setSessions(data.sessions);
        const nextSessionId =
          data.sessions.find((session) => session.id === selectedSessionId)?.id || data.sessions[0]?.id || "";
        setSelectedSessionId(nextSessionId);

        if (!nextSessionId) {
          setSessionDetail(null);
          return;
        }

        await loadSessionDetail(nextSessionId);
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Oturum listesi yuklenemedi.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSessionsForFilters();

    return () => {
      ignore = true;
    };
  }, [classroomFilter, classrooms.length, courseFilter, courses.length, selectedSessionId]);

  useEffect(() => {
    if (!autoRefreshEnabled || !selectedSessionId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || pendingAttendance || liveRefreshInFlightRef.current) {
        return;
      }

      liveRefreshInFlightRef.current = true;
      void loadSessionDetail(selectedSessionId, { silent: true }).finally(() => {
        liveRefreshInFlightRef.current = false;
      });
    }, autoRefreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, pendingAttendance, selectedSessionId]);

  async function loadSessionDetail(sessionId: string, options?: { silent?: boolean }) {
    if (options?.silent) {
      setLiveRefreshing(true);
    } else {
      setDetailLoading(true);
    }

    try {
      const data = await apiRequest<AttendanceSessionDetail>(`/api/v1/attendance/session/${sessionId}`);
      setSessionDetail(data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Oturum detaylari yuklenemedi.");
      }
    } finally {
      if (options?.silent) {
        setLiveRefreshing(false);
      } else {
        setDetailLoading(false);
      }
    }
  }

  async function confirmAttendanceUpdate() {
    if (!pendingAttendance || !selectedSessionId) {
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/v1/attendance/manual", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedSessionId,
          studentId: pendingAttendance.studentId,
          status: pendingAttendance.status,
        }),
      });
      toast.success("Manuel yoklama guncellendi.");
      setPendingAttendance(null);
      if (pendingAttendance.status !== attendanceFilter && attendanceFilter !== "ALL") {
        setAttendanceFilter(pendingAttendance.status === "EXCUSED" ? "ALL" : pendingAttendance.status);
      }
      await loadSessionDetail(selectedSessionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yoklama guncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setSessionAttendanceWindow(open: boolean) {
    if (!selectedSessionId) {
      return;
    }

    setAttendanceWindowLoading(true);
    try {
      const endpoint = open ? "start" : "stop";
      await apiRequest(`/api/v1/attendance/session/${selectedSessionId}/${endpoint}`, {
        method: "POST",
      });

      setSessions((currentSessions) =>
        currentSessions.map((session) => {
          if (session.id === selectedSessionId) {
            return { ...session, attendanceOpen: open };
          }

          return { ...session, attendanceOpen: open ? false : session.attendanceOpen };
        })
      );

      toast.success(open ? "RFID yoklamasi baslatildi." : "RFID yoklamasi durduruldu.");
      await loadSessionDetail(selectedSessionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "RFID yoklama durumu guncellenemedi.");
    } finally {
      setAttendanceWindowLoading(false);
    }
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const attendanceOpen = Boolean(sessionDetail?.session.attendanceOpen || selectedSession?.attendanceOpen);
  const attendanceWindowDescription = attendanceOpen
    ? "RFID okuyucular sadece secili oturum icin yoklama aliyor."
    : "RFID yoklamasi kapali. Kart okutmalari derse katilim yazmaz.";
  const selectedCourseLabel =
    courseFilter === "ALL"
      ? "Tum dersler"
      : courses.find((course) => course.id === courseFilter)?.name || "Ders secin";
  const selectedClassroomLabel =
    classroomFilter === "ALL"
      ? "Tum siniflar"
      : classrooms.find((classroom) => classroom.id === classroomFilter)?.name || "Sinif secin";
  const selectedSessionLabel = selectedSession
    ? `${selectedSession.course.name} · ${selectedSession.classroom.name} · ${formatDate(
        selectedSession.sessionDate
      )} · Hafta ${selectedSession.weekNumber}`
    : "Oturum secin";
  const visibleAttendanceList =
    attendanceFilter === "ALL"
      ? sessionDetail?.attendanceList || []
      : (sessionDetail?.attendanceList || []).filter((item) => item.status === attendanceFilter);
  const attendanceFilterTitle =
    attendanceFilter === "PRESENT"
      ? "Gelen ogrenciler"
      : attendanceFilter === "ABSENT"
        ? "Gelmeyen ogrenciler"
        : "Tum ogrenciler";

  if (loading && !sessions.length) {
    return <LoadingBlock description="Yoklama ekranlari yukleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yoklama Yonetimi"
        description="Oturumu secin, ogrenci listesini gorun ve geldi, gelmedi veya izinli durumunu onayli sekilde guncelleyin."
        actions={
          <>
            <Button
              variant={autoRefreshEnabled ? "secondary" : "outline"}
              onClick={() => setAutoRefreshEnabled((current) => !current)}
            >
              {autoRefreshEnabled ? "Canli yenileme acik" : "Canli yenilemeyi ac"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedSessionId) {
                  void loadSessionDetail(selectedSessionId);
                }
              }}
              disabled={!selectedSessionId}
            >
              Listeyi yenile
            </Button>
          </>
        }
      />

      <Card className="rounded-xl border border-border shadow-none">
        <CardHeader className="gap-3">
          <CardTitle className="text-base font-semibold">Oturum filtreleri</CardTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select value={courseFilter} onValueChange={(value) => setCourseFilter(value || "ALL")}>
              <SelectTrigger className="h-11 w-full bg-white">
                <span className="min-w-0 truncate text-left">{selectedCourseLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum dersler</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} - {course.term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classroomFilter} onValueChange={(value) => setClassroomFilter(value || "ALL")}>
              <SelectTrigger className="h-11 w-full bg-white">
                <span className="min-w-0 truncate text-left">{selectedClassroomLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum siniflar</SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedSessionId}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                setSelectedSessionId(value);
                setAttendanceFilter("ALL");
                void loadSessionDetail(value);
              }}
            >
              <SelectTrigger className="h-11 w-full bg-white">
                <span className="min-w-0 truncate text-left">{selectedSessionLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.course.name} · {session.classroom.name} · Hafta {session.weekNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/30 p-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {attendanceOpen ? "Yoklama aktif" : "Yoklama kapali"}
              </p>
              <p className="text-xs text-muted-foreground">{attendanceWindowDescription}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => void setSessionAttendanceWindow(true)}
                disabled={!selectedSessionId || attendanceOpen || attendanceWindowLoading}
                className="gap-2"
              >
                <PlayCircle className="size-4" />
                Yoklamayi baslat
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void setSessionAttendanceWindow(false)}
                disabled={!selectedSessionId || !attendanceOpen || attendanceWindowLoading}
                className="gap-2 bg-white"
              >
                <StopCircle className="size-4" />
                Yoklamayi durdur
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!selectedSession || !sessionDetail ? (
        <EmptyState
          title="Oturum secilmedi"
          description="Yoklama listesini acmak icin once bir ders oturumu secin."
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            <StatCard
              title="Toplam ogrenci"
              value={sessionDetail.stats.total}
              description="Tum yoklama listesini goster."
              icon={ClipboardList}
              active={attendanceFilter === "ALL"}
              onClick={() => setAttendanceFilter("ALL")}
            />
            <StatCard
              title="Gelen"
              value={sessionDetail.stats.present}
              description="Geldi olarak isaretlenenleri goster."
              icon={CheckCircle2}
              tone="success"
              active={attendanceFilter === "PRESENT"}
              onClick={() => setAttendanceFilter("PRESENT")}
            />
            <StatCard
              title="Gelmeyen"
              value={sessionDetail.stats.absent}
              description="Gelmedi olarak gorunenleri goster."
              icon={UserX}
              tone="warning"
              active={attendanceFilter === "ABSENT"}
              onClick={() => setAttendanceFilter("ABSENT")}
            />
            <StatCard
              title="Secili oturum"
              value={`H${selectedSession.weekNumber}`}
              description={`${formatDate(selectedSession.sessionDate)} tarihinde planlandi.`}
              icon={CalendarClock}
            />
          </div>

          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-lg font-semibold">
                  {sessionDetail.session.courseName}
                </CardTitle>
                <p className="text-xs font-semibold text-primary">
                  {attendanceFilterTitle}: {visibleAttendanceList.length} kisi
                </p>
                <p className="text-sm text-muted-foreground">
                  {sessionDetail.session.classroom} · {formatDate(sessionDetail.session.sessionDate)} ·{" "}
                  {formatDateTime(sessionDetail.session.startTime)} · Hafta {sessionDetail.session.weekNumber}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                <span
                  className={`size-2 rounded-full ${
                    autoRefreshEnabled ? "bg-emerald-500" : "bg-muted-foreground/40"
                  } ${liveRefreshing ? "animate-pulse" : ""}`}
                />
                <span className="font-medium">
                  {autoRefreshEnabled ? autoRefreshLabel : "Yenileme kapali"}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span>
                  Son yenileme: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "henuz yok"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <LoadingBlock description="Secili oturum yenileniyor..." />
              ) : visibleAttendanceList.length === 0 ? (
                <EmptyState
                  title="Liste bos"
                  description="Secili filtre icin ogrenci bulunmuyor."
                />
              ) : (
                visibleAttendanceList.map((item) => {
                  const studentName = `${item.firstName} ${item.lastName}`;
                  return (
                    <div
                      key={item.studentId}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="truncate text-base font-semibold">
                          {studentName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Kart: {item.activeCard || "yok"}
                          {item.timestamp ? ` · ${formatDateTime(item.timestamp)}` : ""}
                        </div>
                      </div>
                      <div className="segmented-group w-full md:w-auto md:shrink-0">
                        <button
                          type="button"
                          data-active={item.status === "PRESENT"}
                          data-tone="success"
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName,
                              status: "PRESENT",
                            })
                          }
                        >
                          Geldi
                        </button>
                        <button
                          type="button"
                          data-active={item.status === "ABSENT"}
                          data-tone="danger"
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName,
                              status: "ABSENT",
                            })
                          }
                        >
                          Gelmedi
                        </button>
                        <button
                          type="button"
                          data-active={item.status === "EXCUSED"}
                          data-tone="warning"
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName,
                              status: "EXCUSED",
                            })
                          }
                        >
                          İzinli
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingAttendance)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAttendance(null);
          }
        }}
        loading={submitting}
        destructive={pendingAttendance?.status === "ABSENT"}
        title="Manuel yoklama onayi"
        description={
          pendingAttendance
            ? `${pendingAttendance.studentName} icin yoklama durumu ${
                pendingAttendance.status === "PRESENT"
                  ? "Geldi"
                  : pendingAttendance.status === "EXCUSED"
                    ? "Izinli"
                    : "Gelmedi"
              } olarak guncellenecek. Devam etmek istiyor musunuz?`
            : ""
        }
        confirmLabel="Yoklamayi uygula"
        onConfirm={confirmAttendanceUpdate}
      />
    </div>
  );
}
