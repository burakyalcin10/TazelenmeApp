"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, GraduationCap, Layers3, Plus, Search, Trash2, Upload, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, downloadAuthenticatedFile } from "@/lib/api";
import { bytesToMb, combineDateAndTime, formatDate, formatDateTime } from "@/lib/format";
import type {
  ClassroomItem,
  CourseListItem,
  EnrollmentItem,
  MaterialItem,
  SessionListItem,
  StudentListItem,
} from "@/lib/types";

type PendingAction =
  | { kind: "course-save"; payload: { id?: string; name: string; term: string; isActive: boolean } }
  | { kind: "course-delete"; payload: { id: string; name: string } }
  | { kind: "classroom-save"; payload: { id?: string; name: string; code: string; capacity: string } }
  | { kind: "classroom-delete"; payload: { id: string; name: string } }
  | { kind: "session-create"; payload: typeof emptySessionForm }
  | { kind: "session-generate"; payload: typeof emptyGenerateForm }
  | { kind: "session-delete"; payload: { id: string; title: string } }
  | { kind: "enrollment-create"; payload: typeof emptyEnrollmentForm }
  | { kind: "enrollment-bulk"; payload: { courseId: string; studentIds: string[] } }
  | { kind: "enrollment-delete"; payload: { id: string; title: string } }
  | { kind: "material-upload"; payload: FormData }
  | { kind: "material-delete"; payload: { id: string; title: string } };

const emptyCourseForm = { id: "", name: "", term: "", isActive: true };
const emptyClassroomForm = { id: "", name: "", code: "", capacity: "" };
const emptySessionForm = {
  courseId: "",
  classroomId: "",
  sessionDate: "",
  startClock: "",
  endClock: "",
  weekNumber: "1",
};
const emptyGenerateForm = {
  courseId: "",
  classroomId: "",
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "11:00",
  semesterStart: "",
  semesterEnd: "",
};
const emptyEnrollmentForm = { courseId: "", studentId: "" };
const emptyMaterialForm = {
  courseId: "",
  title: "",
  type: "PDF" as "PDF" | "LINK" | "VIDEO",
  url: "",
  file: null as File | null,
};

function descriptionForAction(action: PendingAction | null) {
  if (!action) return "";
  if (action.kind === "course-delete") return `"${action.payload.name}" dersi pasif duruma alinacak. Devam etmek istiyor musunuz?`;
  if (action.kind === "classroom-delete") return `"${action.payload.name}" sinifi silinecek. Devam etmek istiyor musunuz?`;
  if (action.kind === "session-delete") return `${action.payload.title} oturumu silinecek. Devam etmek istiyor musunuz?`;
  if (action.kind === "enrollment-delete") return `${action.payload.title} kaydi silinecek. Devam etmek istiyor musunuz?`;
  if (action.kind === "material-delete") return `"${action.payload.title}" materyali silinecek. Devam etmek istiyor musunuz?`;
  if (action.kind === "session-generate") return "Secili tarih araliginda haftalik oturumlar toplu olarak olusturulacak. Devam etmek istiyor musunuz?";
  if (action.kind === "material-upload") return "Materyal secili derse yuklenecek ve kullanima acilacak. Devam etmek istiyor musunuz?";
  if (action.kind === "enrollment-bulk") return `${action.payload.studentIds.length} ogrenci secili derse toplu olarak atanacak. Zaten kayitli olanlar atlanir. Devam etmek istiyor musunuz?`;
  return "Islem sisteme kaydedilecek. Devam etmek istiyor musunuz?";
}

interface PassFailReportData {
  course: {
    id: string;
    name: string;
    term: string;
  };
  totalSessions: number;
  passThreshold: number;
  report: {
    studentId: string;
    firstName: string;
    lastName: string;
    totalSessions: number;
    present: number;
    excused: number;
    absent: number;
    attendedCount: number;
    attendanceRate: number;
    result: "PASSED" | "FAILED";
  }[];
  summary: {
    totalStudents: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, "\"\"");
  return `"${normalized}"`;
}

function courseLabel(courses: CourseListItem[], courseId: string, fallback = "Ders secin") {
  const course = courses.find((item) => item.id === courseId);
  return course ? `${course.name} - ${course.term}` : fallback;
}

function classroomLabel(classrooms: ClassroomItem[], classroomId: string, fallback = "Sinif secin") {
  return classrooms.find((item) => item.id === classroomId)?.name || fallback;
}

function studentLabel(students: StudentListItem[], studentId: string, fallback = "Ogrenci secin") {
  const student = students.find((item) => (item.profileId || item.id) === studentId);
  return student ? `${student.firstName} ${student.lastName}` : fallback;
}

function studentProfileId(student: StudentListItem) {
  return student.profileId || student.id;
}

const courseStatusLabels = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
};

const weekdayLabels: Record<string, string> = {
  "0": "Pazar",
  "1": "Pazartesi",
  "2": "Sali",
  "3": "Carsamba",
  "4": "Persembe",
  "5": "Cuma",
  "6": "Cumartesi",
};

const materialTypeLabels = {
  PDF: "PDF",
  LINK: "Link",
  VIDEO: "Video",
};

export default function CoursesPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("courses");
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [reportCourseId, setReportCourseId] = useState("");
  const [reportExporting, setReportExporting] = useState(false);
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [bulkStudentSearch, setBulkStudentSearch] = useState("");
  const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<string[]>([]);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [classroomDialogOpen, setClassroomDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [classroomForm, setClassroomForm] = useState(emptyClassroomForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [generateForm, setGenerateForm] = useState(emptyGenerateForm);
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm);
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [courseData, classroomData, sessionData, enrollmentData, materialData, studentData] = await Promise.all([
        apiRequest<{ courses: CourseListItem[] }>("/api/v1/courses?limit=100"),
        apiRequest<{ classrooms: ClassroomItem[] }>("/api/v1/classrooms?limit=100"),
        apiRequest<{ sessions: SessionListItem[] }>("/api/v1/sessions?limit=100"),
        apiRequest<{ enrollments: EnrollmentItem[] }>("/api/v1/enrollments?limit=100"),
        apiRequest<{ materials: MaterialItem[] }>("/api/v1/materials?limit=100"),
        apiRequest<{ students: StudentListItem[] }>("/api/v1/students?limit=100"),
      ]);
      setCourses(courseData.courses);
      setReportCourseId((current) => current || courseData.courses[0]?.id || "");
      setBulkCourseId((current) => current || courseData.courses.find((course) => course.isActive)?.id || courseData.courses[0]?.id || "");
      setClassrooms(classroomData.classrooms);
      setSessions(sessionData.sessions);
      setEnrollments(enrollmentData.enrollments);
      setMaterials(materialData.materials);
      setStudents(studentData.students.filter((student) => Boolean(student.profileId)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ders yonetimi verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    setSubmitting(true);
    try {
      if (pendingAction.kind === "course-save") {
        await apiRequest(pendingAction.payload.id ? `/api/v1/courses/${pendingAction.payload.id}` : "/api/v1/courses", {
          method: pendingAction.payload.id ? "PUT" : "POST",
          body: JSON.stringify(pendingAction.payload),
        });
        setCourseDialogOpen(false);
        setCourseForm(emptyCourseForm);
      }
      if (pendingAction.kind === "course-delete") {
        await apiRequest(`/api/v1/courses/${pendingAction.payload.id}`, { method: "DELETE" });
      }
      if (pendingAction.kind === "classroom-save") {
        await apiRequest(
          pendingAction.payload.id ? `/api/v1/classrooms/${pendingAction.payload.id}` : "/api/v1/classrooms",
          {
            method: pendingAction.payload.id ? "PUT" : "POST",
            body: JSON.stringify({
              name: pendingAction.payload.name,
              code: pendingAction.payload.code,
              capacity: pendingAction.payload.capacity ? Number(pendingAction.payload.capacity) : null,
            }),
          }
        );
        setClassroomDialogOpen(false);
        setClassroomForm(emptyClassroomForm);
      }
      if (pendingAction.kind === "classroom-delete") {
        await apiRequest(`/api/v1/classrooms/${pendingAction.payload.id}`, { method: "DELETE" });
      }
      if (pendingAction.kind === "session-create") {
        await apiRequest("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({
            courseId: pendingAction.payload.courseId,
            classroomId: pendingAction.payload.classroomId,
            sessionDate: pendingAction.payload.sessionDate,
            startTime: combineDateAndTime(pendingAction.payload.sessionDate, pendingAction.payload.startClock),
            endTime: combineDateAndTime(pendingAction.payload.sessionDate, pendingAction.payload.endClock),
            weekNumber: Number(pendingAction.payload.weekNumber),
          }),
        });
        setSessionDialogOpen(false);
        setSessionForm(emptySessionForm);
      }
      if (pendingAction.kind === "session-generate") {
        await apiRequest("/api/v1/sessions/generate", {
          method: "POST",
          body: JSON.stringify({
            ...pendingAction.payload,
            dayOfWeek: Number(pendingAction.payload.dayOfWeek),
          }),
        });
        setGenerateDialogOpen(false);
        setGenerateForm(emptyGenerateForm);
      }
      if (pendingAction.kind === "session-delete") {
        await apiRequest(`/api/v1/sessions/${pendingAction.payload.id}`, { method: "DELETE" });
      }
      if (pendingAction.kind === "enrollment-create") {
        await apiRequest("/api/v1/enrollments", {
          method: "POST",
          body: JSON.stringify(pendingAction.payload),
        });
        setEnrollmentDialogOpen(false);
        setEnrollmentForm(emptyEnrollmentForm);
      }
      if (pendingAction.kind === "enrollment-bulk") {
        await apiRequest("/api/v1/enrollments/bulk", {
          method: "POST",
          body: JSON.stringify(pendingAction.payload),
        });
        setSelectedBulkStudentIds([]);
      }
      if (pendingAction.kind === "enrollment-delete") {
        await apiRequest(`/api/v1/enrollments/${pendingAction.payload.id}`, { method: "DELETE" });
      }
      if (pendingAction.kind === "material-upload") {
        await apiRequest("/api/v1/materials", {
          method: "POST",
          body: pendingAction.payload,
        });
        setMaterialDialogOpen(false);
        setMaterialForm(emptyMaterialForm);
      }
      if (pendingAction.kind === "material-delete") {
        await apiRequest(`/api/v1/materials/${pendingAction.payload.id}`, { method: "DELETE" });
      }

      toast.success("Islem basariyla tamamlandi.");
      setPendingAction(null);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Islem tamamlanamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("courseId", materialForm.courseId);
    formData.set("title", materialForm.title);
    formData.set("type", materialForm.type);

    if (materialForm.type === "PDF") {
      if (!materialForm.file) {
        toast.error("PDF yuklemek icin dosya secmelisiniz.");
        return;
      }
      formData.set("file", materialForm.file);
    } else {
      if (!materialForm.url.trim()) {
        toast.error("Baglanti veya video icin URL zorunludur.");
        return;
      }
      formData.set("url", materialForm.url.trim());
    }

    setPendingAction({ kind: "material-upload", payload: formData });
  }

  async function exportPassFailCsv() {
    if (!reportCourseId) {
      toast.error("Rapor almak icin once bir ders secin.");
      return;
    }

    setReportExporting(true);
    try {
      const reportData = await apiRequest<PassFailReportData>(
        `/api/v1/reports/pass-fail?courseId=${encodeURIComponent(reportCourseId)}`
      );

      const rows = [
        ["courseName", reportData.course.name],
        ["term", reportData.course.term],
        ["totalSessions", reportData.totalSessions],
        ["passThreshold", reportData.passThreshold],
        ["totalStudents", reportData.summary.totalStudents],
        ["passed", reportData.summary.passed],
        ["failed", reportData.summary.failed],
        ["passRate", `${reportData.summary.passRate}%`],
        [],
        [
          "studentId",
          "firstName",
          "lastName",
          "present",
          "excused",
          "absent",
          "attendedCount",
          "totalSessions",
          "attendanceRate",
          "result",
        ],
        ...reportData.report.map((item) => [
          item.studentId,
          item.firstName,
          item.lastName,
          item.present,
          item.excused,
          item.absent,
          item.attendedCount,
          item.totalSessions,
          `${item.attendanceRate}%`,
          item.result === "PASSED" ? "GECTI" : "KALDI",
        ]),
      ];

      const csvContent = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n");
      const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gecti-kaldi-${reportData.course.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Gecti-kaldi raporu CSV olarak indirildi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rapor disa aktarilamadi.");
    } finally {
      setReportExporting(false);
    }
  }

  function toggleBulkStudent(studentId: string, checked: boolean) {
    setSelectedBulkStudentIds((current) => {
      if (checked) {
        return current.includes(studentId) ? current : [...current, studentId];
      }

      return current.filter((id) => id !== studentId);
    });
  }

  function selectAllVisibleBulkStudents(studentIds: string[]) {
    setSelectedBulkStudentIds((current) => Array.from(new Set([...current, ...studentIds])));
  }

  const selectedBulkCourse = courses.find((course) => course.id === bulkCourseId);
  const bulkCourseEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.courseId === bulkCourseId),
    [bulkCourseId, enrollments]
  );
  const enrolledBulkStudentIds = useMemo(
    () => new Set(bulkCourseEnrollments.map((enrollment) => enrollment.studentId)),
    [bulkCourseEnrollments]
  );
  const filteredBulkStudents = useMemo(() => {
    const normalizedSearch = bulkStudentSearch.trim().toLowerCase();

    return students.filter((student) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(normalizedSearch) ||
        (student.tcNo || "").includes(normalizedSearch)
      );
    });
  }, [bulkStudentSearch, students]);
  const visibleAssignableStudentIds = filteredBulkStudents
    .map(studentProfileId)
    .filter((studentId) => !enrolledBulkStudentIds.has(studentId));

  if (loading) {
    return <LoadingBlock description="Ders ve materyal ekranlari yukleniyor..." />;
  }

  const dialogTitle =
    pendingAction?.kind === "course-save"
      ? "Ders kayit onayi"
      : pendingAction?.kind === "classroom-save"
        ? "Sinif kayit onayi"
        : pendingAction?.kind === "session-create"
          ? "Oturum olusturma onayi"
          : pendingAction?.kind === "session-generate"
            ? "Toplu oturum onayi"
            : pendingAction?.kind === "enrollment-create"
              ? "Ders kaydi onayi"
              : pendingAction?.kind === "enrollment-bulk"
                ? "Toplu ders kaydi onayi"
                : pendingAction?.kind === "material-upload"
                  ? "Materyal yukleme onayi"
                  : pendingAction?.kind === "material-delete"
                    ? "Materyal silme onayi"
                    : pendingAction?.kind === "classroom-delete"
                      ? "Sinif silme onayi"
                      : pendingAction?.kind === "session-delete"
                        ? "Oturum silme onayi"
                        : pendingAction?.kind === "enrollment-delete"
                          ? "Kayit silme onayi"
                          : "Ders pasif yapma onayi";

  const destructiveKinds = ["course-delete", "classroom-delete", "session-delete", "enrollment-delete", "material-delete"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ders ve Materyal Yönetimi"
        description="Dersler, sınıflar, oturumlar, kayıtlar ve materyalleri tek ekrandan yönetin."
      />

      <Card className="rounded-xl border border-border shadow-none">
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">Geçti-kaldı raporu</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Seçili dersin katılım raporunu CSV olarak indirin.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:max-w-md md:flex-row">
            <Select value={reportCourseId} onValueChange={(value) => setReportCourseId(value || "")}>
              <SelectTrigger className="h-10 w-full bg-white">
                <span className="min-w-0 truncate text-left">
                  {courseLabel(courses, reportCourseId)}
                </span>
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} - {course.term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportPassFailCsv()}
              disabled={!reportCourseId || reportExporting}
            >
              <Download className="size-4" />
              {reportExporting ? "Hazırlanıyor..." : "CSV indir"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value || "courses")}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto w-auto rounded-lg border border-border bg-card p-1">
            <TabsTrigger className="h-9 px-3 text-sm" value="courses">Dersler</TabsTrigger>
            <TabsTrigger className="h-9 px-3 text-sm" value="sessions">Oturumlar</TabsTrigger>
            <TabsTrigger className="h-9 px-3 text-sm" value="classrooms">Sınıflar</TabsTrigger>
            <TabsTrigger className="h-9 px-3 text-sm" value="enrollments">Kayıtlar</TabsTrigger>
            <TabsTrigger className="h-9 px-3 text-sm" value="materials">Materyaller</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="courses" className="space-y-6">
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base font-semibold">Ders listesi</CardTitle>
              <Button size="sm" onClick={() => { setCourseForm(emptyCourseForm); setCourseDialogOpen(true); }}>
                <Plus className="size-4" />
                Yeni ders
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {courses.length === 0 ? <EmptyState title="Ders kaydi yok" description="Ilk dersi olusturarak yonetim akisini baslatabilirsiniz." /> : courses.map((course) => (
                <div key={course.id} className="rounded-xl border border-border bg-white p-3.5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-base font-semibold">{course.name}</div>
                        <Badge variant={course.isActive ? "secondary" : "outline"} className="rounded px-1.5 py-0 text-[10px] font-medium">{course.isActive ? "Aktif" : "Pasif"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{course.term} · {course.enrollmentCount} kayit · {course.sessionCount} oturum · {course.materialCount} materyal</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setCourseForm({ id: course.id, name: course.name, term: course.term, isActive: course.isActive }); setCourseDialogOpen(true); }}>Duzenle</Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingAction({ kind: "course-delete", payload: { id: course.id, name: course.name } })}>
                        <Trash2 className="size-4" />
                        Pasif yap
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => { setSessionForm(emptySessionForm); setSessionDialogOpen(true); }}>
              <Plus className="size-4" />
              Tek oturum oluştur
            </Button>
            <Button variant="outline" onClick={() => { setGenerateForm(emptyGenerateForm); setGenerateDialogOpen(true); }}>
              <Layers3 className="size-4" />
              Toplu oturum üret
            </Button>
          </div>
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader><CardTitle className="text-base font-semibold">Oturumlar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {sessions.length === 0 ? <EmptyState title="Oturum yok" description="Derslere bagli oturum planlamak icin yeni kayit olusturun." /> : sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border bg-white p-3.5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-base font-semibold">{session.course.name}</div>
                      <div className="text-xs text-muted-foreground">{session.classroom.name} · Hafta {session.weekNumber}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(session.sessionDate)} · {formatDateTime(session.startTime)} · Yoklama kaydi: {session.attendanceCount}</div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => setPendingAction({ kind: "session-delete", payload: { id: session.id, title: `${session.course.name} / Hafta ${session.weekNumber}` } })}>
                      <Trash2 className="size-4" />
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classrooms" className="space-y-6">
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base font-semibold">Siniflar</CardTitle>
              <Button size="sm" onClick={() => { setClassroomForm(emptyClassroomForm); setClassroomDialogOpen(true); }}>
                <Plus className="size-4" />
                Yeni sınıf
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {classrooms.length === 0 ? <EmptyState title="Sinif yok" description="Ilk sinif kaydini olusturarak oturum planlamaya baslayin." /> : classrooms.map((classroom) => (
                <div key={classroom.id} className="rounded-xl border border-border bg-white p-3.5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-base font-semibold">{classroom.name}</div>
                      <div className="text-xs text-muted-foreground">Kod: {classroom.code} · Kapasite: {classroom.capacity || "-"} · Oturum: {classroom.sessionCount || 0}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setClassroomForm({ id: classroom.id, name: classroom.name, code: classroom.code, capacity: classroom.capacity ? String(classroom.capacity) : "" }); setClassroomDialogOpen(true); }}>Duzenle</Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingAction({ kind: "classroom-delete", payload: { id: classroom.id, name: classroom.name } })}>
                        <Trash2 className="size-4" />
                        Sil
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">Toplu ogrenci atama</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bir ders secin, ogrencileri isaretleyin ve tek adimda ders kaydi olusturun.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="font-semibold text-foreground">{students.length}</div>
                    <div className="text-muted-foreground">ogrenci</div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="font-semibold text-foreground">{bulkCourseEnrollments.length}</div>
                    <div className="text-muted-foreground">kayitli</div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="font-semibold text-foreground">{selectedBulkStudentIds.length}</div>
                    <div className="text-muted-foreground">secili</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr_auto]">
                <Select
                  value={bulkCourseId}
                  onValueChange={(value) => {
                    setBulkCourseId(value || "");
                    setSelectedBulkStudentIds([]);
                  }}
                >
                  <SelectTrigger className="h-11 w-full bg-white">
                    <span className="min-w-0 truncate text-left">
                      {courseLabel(courses, bulkCourseId, "Ders secin")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {courses.filter((course) => course.isActive).map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} - {course.term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 pl-10"
                    placeholder="Ogrenci adi, soyadi veya TC ile ara"
                    value={bulkStudentSearch}
                    onChange={(event) => setBulkStudentSearch(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  disabled={!bulkCourseId || selectedBulkStudentIds.length === 0}
                  onClick={() =>
                    setPendingAction({
                      kind: "enrollment-bulk",
                      payload: { courseId: bulkCourseId, studentIds: selectedBulkStudentIds },
                    })
                  }
                >
                  <UsersRound className="size-4" />
                  Secilenleri ata
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedBulkCourse
                    ? `${selectedBulkCourse.name} dersi icin ${filteredBulkStudents.length} ogrenci gorunuyor.`
                    : "Toplu atama yapmak icin once ders secin."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!visibleAssignableStudentIds.length}
                    onClick={() => selectAllVisibleBulkStudents(visibleAssignableStudentIds)}
                  >
                    Gorunen uygunlari sec
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!selectedBulkStudentIds.length}
                    onClick={() => setSelectedBulkStudentIds([])}
                  >
                    Secimi temizle
                  </Button>
                </div>
              </div>

              {!bulkCourseId ? (
                <EmptyState title="Ders secilmedi" description="Ogrencileri toplu atamak icin once aktif bir ders secin." />
              ) : filteredBulkStudents.length === 0 ? (
                <EmptyState title="Ogrenci bulunamadi" description="Arama kriterine uygun ogrenci yok." />
              ) : (
                <div className="max-h-[460px] overflow-y-auto rounded-xl border border-border bg-white">
                  {filteredBulkStudents.map((student) => {
                    const profileId = studentProfileId(student);
                    const isEnrolled = enrolledBulkStudentIds.has(profileId);
                    const isChecked = isEnrolled || selectedBulkStudentIds.includes(profileId);

                    return (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 data-[disabled=true]:cursor-default data-[disabled=true]:bg-secondary/30"
                        data-disabled={isEnrolled}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isEnrolled}
                          onCheckedChange={(value) => toggleBulkStudent(profileId, Boolean(value))}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            TC: {student.tcNo || "-"}
                            {student.activeCard?.uid ? ` - Kart: ${student.activeCard.uid}` : ""}
                          </div>
                        </div>
                        {isEnrolled ? (
                          <Badge variant="secondary" className="shrink-0 rounded px-2 py-0.5 text-[10px]">
                            Kayitli
                          </Badge>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base font-semibold">Ders kayitlari</CardTitle>
              <Button size="sm" onClick={() => { setEnrollmentForm(emptyEnrollmentForm); setEnrollmentDialogOpen(true); }}>
                <GraduationCap className="size-4" />
                Yeni kayıt
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.length === 0 ? <EmptyState title="Kayit yok" description="Ogrencileri derslere baglamak icin yeni kayit ekleyin." /> : enrollments.map((enrollment) => (
                <div key={enrollment.id} className="rounded-xl border border-border bg-white p-3.5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-base font-semibold">{enrollment.studentName}</div>
                      <div className="text-xs text-muted-foreground">{enrollment.courseName} · {enrollment.term} · {formatDate(enrollment.enrolledAt)}</div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => setPendingAction({ kind: "enrollment-delete", payload: { id: enrollment.id, title: `${enrollment.studentName} / ${enrollment.courseName}` } })}>
                      <Trash2 className="size-4" />
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base font-semibold">Materyaller</CardTitle>
              <Button size="sm" onClick={() => { setMaterialForm(emptyMaterialForm); setMaterialDialogOpen(true); }}>
                <Upload className="size-4" />
                Yeni materyal
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {materials.length === 0 ? <EmptyState title="Materyal yok" description="Derslere PDF, baglanti veya video materyali ekleyebilirsiniz." /> : materials.map((material) => (
                <div key={material.id} className="rounded-xl border border-border bg-white p-3.5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-base font-semibold">{material.title}</div>
                        <Badge variant="secondary" className="rounded px-1.5 py-0 text-[10px] font-medium">{material.type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{material.course?.name || "Ders"} · {formatDate(material.uploadedAt)} · {bytesToMb(material.fileSize)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {material.type === "PDF" ? (
                        <Button size="sm" variant="outline" onClick={() => void downloadAuthenticatedFile(`/api/v1/materials/${material.id}/download`, `${material.title}.pdf`)}>
                          <Download className="size-4" />
                          Indir
                        </Button>
                      ) : (
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Ac
                        </a>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => setPendingAction({ kind: "material-delete", payload: { id: material.id, title: material.title } })}>
                        <Trash2 className="size-4" />
                        Sil
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl p-6 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">{courseForm.id ? "Dersi duzenle" : "Yeni ders"}</DialogTitle><DialogDescription className="text-base leading-7">Ders bilgilerini kaydetmeden once ikinci onay alinacaktir.</DialogDescription></DialogHeader>
          <div className="space-y-6">
            <FormField label="Ders adi"><Input value={courseForm.name} onChange={(event) => setCourseForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
            <FormField label="Donem"><Input value={courseForm.term} onChange={(event) => setCourseForm((current) => ({ ...current, term: event.target.value }))} /></FormField>
            <FormField label="Durum">
              <Select value={courseForm.isActive ? "ACTIVE" : "PASSIVE"} onValueChange={(value) => setCourseForm((current) => ({ ...current, isActive: value === "ACTIVE" }))}>
                <SelectTrigger className="h-11 w-full bg-white">
                  <span className="min-w-0 truncate text-left">
                    {courseStatusLabels[courseForm.isActive ? "ACTIVE" : "PASSIVE"]}
                  </span>
                </SelectTrigger>
                <SelectContent><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="PASSIVE">Pasif</SelectItem></SelectContent>
              </Select>
            </FormField>
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>Vazgec</Button>
              <Button type="button" onClick={() => setPendingAction({ kind: "course-save", payload: { id: courseForm.id || undefined, name: courseForm.name, term: courseForm.term, isActive: courseForm.isActive } })}>Onay adimina gec</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={classroomDialogOpen} onOpenChange={setClassroomDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl p-6 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">{classroomForm.id ? "Sinifi duzenle" : "Yeni sinif"}</DialogTitle><DialogDescription className="text-base leading-7">Sinif kodu cihaz eslestirmesinde kullanilir.</DialogDescription></DialogHeader>
          <div className="space-y-6">
            <FormField label="Sinif adi"><Input value={classroomForm.name} onChange={(event) => setClassroomForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
            <FormField label="Kod"><Input value={classroomForm.code} onChange={(event) => setClassroomForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></FormField>
            <FormField label="Kapasite"><Input value={classroomForm.capacity} onChange={(event) => setClassroomForm((current) => ({ ...current, capacity: event.target.value.replace(/\D/g, "") }))} /></FormField>
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" variant="outline" onClick={() => setClassroomDialogOpen(false)}>Vazgec</Button>
              <Button type="button" onClick={() => setPendingAction({ kind: "classroom-save", payload: classroomForm })}>Onay adimina gec</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Tek oturum olustur</DialogTitle><DialogDescription className="text-base leading-7">Ders, sinif, tarih ve saat secerek tekil bir oturum planlayin.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={sessionForm.courseId} onValueChange={(value) => setSessionForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{courseLabel(courses, sessionForm.courseId)}</span></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Sinif"><Select value={sessionForm.classroomId} onValueChange={(value) => setSessionForm((current) => ({ ...current, classroomId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{classroomLabel(classrooms, sessionForm.classroomId)}</span></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Tarih"><Input type="date" value={sessionForm.sessionDate} onChange={(event) => setSessionForm((current) => ({ ...current, sessionDate: event.target.value }))} /></FormField>
            <FormField label="Hafta numarasi"><Input value={sessionForm.weekNumber} onChange={(event) => setSessionForm((current) => ({ ...current, weekNumber: event.target.value.replace(/\D/g, "") }))} /></FormField>
            <FormField label="Baslangic saati"><Input type="time" value={sessionForm.startClock} onChange={(event) => setSessionForm((current) => ({ ...current, startClock: event.target.value }))} /></FormField>
            <FormField label="Bitis saati"><Input type="time" value={sessionForm.endClock} onChange={(event) => setSessionForm((current) => ({ ...current, endClock: event.target.value }))} /></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => setSessionDialogOpen(false)}>Vazgec</Button>
            <Button type="button" onClick={() => setPendingAction({ kind: "session-create", payload: sessionForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Toplu oturum uret</DialogTitle><DialogDescription className="text-base leading-7">Haftalik plana gore toplu oturumlar olusturun.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={generateForm.courseId} onValueChange={(value) => setGenerateForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{courseLabel(courses, generateForm.courseId)}</span></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Sinif"><Select value={generateForm.classroomId} onValueChange={(value) => setGenerateForm((current) => ({ ...current, classroomId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{classroomLabel(classrooms, generateForm.classroomId)}</span></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Haftanin gunu"><Select value={generateForm.dayOfWeek} onValueChange={(value) => setGenerateForm((current) => ({ ...current, dayOfWeek: value || "1" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{weekdayLabels[generateForm.dayOfWeek]}</span></SelectTrigger><SelectContent><SelectItem value="0">Pazar</SelectItem><SelectItem value="1">Pazartesi</SelectItem><SelectItem value="2">Sali</SelectItem><SelectItem value="3">Carsamba</SelectItem><SelectItem value="4">Persembe</SelectItem><SelectItem value="5">Cuma</SelectItem><SelectItem value="6">Cumartesi</SelectItem></SelectContent></Select></FormField>
            <FormField label="Donem baslangici"><Input type="date" value={generateForm.semesterStart} onChange={(event) => setGenerateForm((current) => ({ ...current, semesterStart: event.target.value }))} /></FormField>
            <FormField label="Baslangic saati"><Input type="time" value={generateForm.startTime} onChange={(event) => setGenerateForm((current) => ({ ...current, startTime: event.target.value }))} /></FormField>
            <FormField label="Bitis saati"><Input type="time" value={generateForm.endTime} onChange={(event) => setGenerateForm((current) => ({ ...current, endTime: event.target.value }))} /></FormField>
            <FormField label="Donem bitisi"><Input type="date" value={generateForm.semesterEnd} onChange={(event) => setGenerateForm((current) => ({ ...current, semesterEnd: event.target.value }))} /></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Vazgec</Button>
            <Button type="button" onClick={() => setPendingAction({ kind: "session-generate", payload: generateForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Yeni ders kaydi</DialogTitle><DialogDescription className="text-base leading-7">Bir ogrenciyi secili derse ekleyin.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={enrollmentForm.courseId} onValueChange={(value) => setEnrollmentForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{courseLabel(courses, enrollmentForm.courseId)}</span></SelectTrigger><SelectContent>{courses.filter((course) => course.isActive).map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Ogrenci"><Select value={enrollmentForm.studentId} onValueChange={(value) => setEnrollmentForm((current) => ({ ...current, studentId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{studentLabel(students, enrollmentForm.studentId)}</span></SelectTrigger><SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.profileId || student.id}>{student.firstName} {student.lastName}</SelectItem>)}</SelectContent></Select></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => setEnrollmentDialogOpen(false)}>Vazgec</Button>
            <Button type="button" onClick={() => setPendingAction({ kind: "enrollment-create", payload: enrollmentForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Yeni materyal</DialogTitle><DialogDescription className="text-base leading-7">PDF dosyasi veya baglanti tipi materyali secili derse baglayin.</DialogDescription></DialogHeader>
          <form className="space-y-6" onSubmit={submitMaterial}>
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField label="Ders"><Select value={materialForm.courseId} onValueChange={(value) => setMaterialForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{courseLabel(courses, materialForm.courseId)}</span></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
              <FormField label="Tur"><Select value={materialForm.type} onValueChange={(value) => setMaterialForm((current) => ({ ...current, type: (value as "PDF" | "LINK" | "VIDEO") || "PDF" }))}><SelectTrigger className="h-11 w-full bg-white"><span className="min-w-0 truncate text-left">{materialTypeLabels[materialForm.type]}</span></SelectTrigger><SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="LINK">Link</SelectItem><SelectItem value="VIDEO">Video</SelectItem></SelectContent></Select></FormField>
            </div>
            <FormField label="Baslik"><Input value={materialForm.title} onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))} /></FormField>
            {materialForm.type === "PDF" ? <FormField label="PDF dosyasi"><Input type="file" accept="application/pdf" onChange={(event) => setMaterialForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></FormField> : <FormField label="Baglanti adresi"><Textarea value={materialForm.url} onChange={(event) => setMaterialForm((current) => ({ ...current, url: event.target.value }))} /></FormField>}
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" variant="outline" onClick={() => setMaterialDialogOpen(false)}>Vazgec</Button>
              <Button type="submit">Onay adımına geç</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        loading={submitting}
        destructive={Boolean(pendingAction && destructiveKinds.includes(pendingAction.kind))}
        title={dialogTitle}
        description={descriptionForAction(pendingAction)}
        confirmLabel="Islemi uygula"
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
