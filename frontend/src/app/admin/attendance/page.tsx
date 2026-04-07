"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, UserX } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type {
  AttendanceSessionDetail,
  AttendanceStatus,
  ClassroomItem,
  CourseListItem,
  SessionListItem,
} from "@/lib/types";

export default function AttendancePage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionDetail, setSessionDetail] = useState<AttendanceSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [pendingAttendance, setPendingAttendance] = useState<{
    studentId: string;
    studentName: string;
    status: AttendanceStatus;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function loadSessionDetail(sessionId: string) {
    setDetailLoading(true);
    try {
      const data = await apiRequest<AttendanceSessionDetail>(`/api/v1/attendance/session/${sessionId}`);
      setSessionDetail(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oturum detaylari yuklenemedi.");
    } finally {
      setDetailLoading(false);
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
      await loadSessionDetail(selectedSessionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yoklama guncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);

  if (loading && !sessions.length) {
    return <LoadingBlock description="Yoklama ekranlari yukleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yoklama Yonetimi"
        description="Oturumu secin, ogrenci listesini gorun ve geldi, gelmedi veya izinli durumunu onayli sekilde guncelleyin."
      />

      <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader className="gap-4">
          <CardTitle className="text-2xl font-semibold">Oturum filtreleri</CardTitle>
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
            <Select value={courseFilter} onValueChange={(value) => setCourseFilter(value || "ALL")}>
              <SelectTrigger className="h-12 w-full rounded-xl bg-white">
                <SelectValue placeholder="Derse gore filtrele" />
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
              <SelectTrigger className="h-12 w-full rounded-xl bg-white">
                <SelectValue placeholder="Sinifa gore filtrele" />
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
                void loadSessionDetail(value);
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-xl bg-white">
                <SelectValue placeholder="Oturum secin" />
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
              description="Bu oturuma kayitli ogrenci sayisi."
              icon={ClipboardList}
            />
            <StatCard
              title="Gelen"
              value={sessionDetail.stats.present}
              description="Yoklamada geldi olarak isaretlenenler."
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              title="Gelmeyen"
              value={sessionDetail.stats.absent}
              description="Henuz gelmedi veya yok olarak gorunenler."
              icon={UserX}
              tone="warning"
            />
            <StatCard
              title="Secili oturum"
              value={`H${selectedSession.weekNumber}`}
              description={`${formatDate(selectedSession.sessionDate)} tarihinde planlandi.`}
              icon={CalendarClock}
            />
          </div>

          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                {sessionDetail.session.courseName} · {sessionDetail.session.classroom}
              </CardTitle>
              <p className="text-base leading-7 text-muted-foreground">
                {formatDate(sessionDetail.session.sessionDate)} · {formatDateTime(sessionDetail.session.startTime)} · Hafta{" "}
                {sessionDetail.session.weekNumber}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <LoadingBlock description="Secili oturum yenileniyor..." />
              ) : sessionDetail.attendanceList.length === 0 ? (
                <EmptyState
                  title="Yoklama listesi bos"
                  description="Bu oturuma bagli ogrenci kaydi gorunmuyor."
                />
              ) : (
                sessionDetail.attendanceList.map((item) => (
                  <div key={item.studentId} className="rounded-[1.5rem] border border-border bg-white p-4">
                    <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                      <div className="space-y-1">
                        <div className="text-xl font-semibold">
                          {item.firstName} {item.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Kart: {item.activeCard || "Aktif kart yok"} · Son islem: {item.timestamp ? formatDateTime(item.timestamp) : "Yok"}
                        </div>
                        <div className="inline-flex rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-primary">
                          Mevcut durum:{" "}
                          {item.status === "PRESENT" ? "Geldi" : item.status === "EXCUSED" ? "Izinli" : "Gelmedi"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          size="lg"
                          variant={item.status === "PRESENT" ? "secondary" : "outline"}
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName: `${item.firstName} ${item.lastName}`,
                              status: "PRESENT",
                            })
                          }
                        >
                          Geldi
                        </Button>
                        <Button
                          size="lg"
                          variant={item.status === "ABSENT" ? "destructive" : "outline"}
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName: `${item.firstName} ${item.lastName}`,
                              status: "ABSENT",
                            })
                          }
                        >
                          Gelmedi
                        </Button>
                        <Button
                          size="lg"
                          variant={item.status === "EXCUSED" ? "secondary" : "outline"}
                          onClick={() =>
                            setPendingAttendance({
                              studentId: item.studentId,
                              studentName: `${item.firstName} ${item.lastName}`,
                              status: "EXCUSED",
                            })
                          }
                        >
                          Izinli
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
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
