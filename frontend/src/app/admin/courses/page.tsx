"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, GraduationCap, Layers3, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  return "Islem sisteme kaydedilecek. Devam etmek istiyor musunuz?";
}

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
        title="Ders ve Materyal Yonetimi"
        description="Dersler, siniflar, oturumlar, kayitlar ve materyalleri tek ekrandan yonetin."
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value || "courses")}>
        <TabsList className="h-auto flex-wrap rounded-[1.5rem] bg-white/90 p-2 shadow-sm ring-1 ring-foreground/10">
          <TabsTrigger className="min-h-11 px-4 text-base" value="courses">Dersler</TabsTrigger>
          <TabsTrigger className="min-h-11 px-4 text-base" value="sessions">Oturumlar</TabsTrigger>
          <TabsTrigger className="min-h-11 px-4 text-base" value="classrooms">Siniflar</TabsTrigger>
          <TabsTrigger className="min-h-11 px-4 text-base" value="enrollments">Ders kayitlari</TabsTrigger>
          <TabsTrigger className="min-h-11 px-4 text-base" value="materials">Materyaller</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-2xl font-semibold">Ders listesi</CardTitle>
              <Button size="lg" onClick={() => { setCourseForm(emptyCourseForm); setCourseDialogOpen(true); }}>
                <Plus className="size-5" />
                Yeni ders
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {courses.length === 0 ? <EmptyState title="Ders kaydi yok" description="Ilk dersi olusturarak yonetim akisini baslatabilirsiniz." /> : courses.map((course) => (
                <div key={course.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-xl font-semibold">{course.name}</div>
                        <Badge variant={course.isActive ? "secondary" : "outline"} className="px-3 py-1 text-sm">{course.isActive ? "Aktif" : "Pasif"}</Badge>
                      </div>
                      <div className="text-base text-muted-foreground">{course.term} · {course.enrollmentCount} kayit · {course.sessionCount} oturum · {course.materialCount} materyal</div>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Button size="xl" onClick={() => { setSessionForm(emptySessionForm); setSessionDialogOpen(true); }}>
              <Plus className="size-5" />
              Tek oturum olustur
            </Button>
            <Button size="xl" variant="outline" onClick={() => { setGenerateForm(emptyGenerateForm); setGenerateDialogOpen(true); }}>
              <Layers3 className="size-5" />
              Toplu oturum uret
            </Button>
          </div>
          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader><CardTitle className="text-2xl font-semibold">Oturumlar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {sessions.length === 0 ? <EmptyState title="Oturum yok" description="Derslere bagli oturum planlamak icin yeni kayit olusturun." /> : sessions.map((session) => (
                <div key={session.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-xl font-semibold">{session.course.name}</div>
                      <div className="text-base text-muted-foreground">{session.classroom.name} · Hafta {session.weekNumber}</div>
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
          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-2xl font-semibold">Siniflar</CardTitle>
              <Button size="lg" onClick={() => { setClassroomForm(emptyClassroomForm); setClassroomDialogOpen(true); }}>
                <Plus className="size-5" />
                Yeni sinif
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {classrooms.length === 0 ? <EmptyState title="Sinif yok" description="Ilk sinif kaydini olusturarak oturum planlamaya baslayin." /> : classrooms.map((classroom) => (
                <div key={classroom.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-xl font-semibold">{classroom.name}</div>
                      <div className="text-base text-muted-foreground">Kod: {classroom.code} · Kapasite: {classroom.capacity || "-"} · Oturum: {classroom.sessionCount || 0}</div>
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
          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-2xl font-semibold">Ders kayitlari</CardTitle>
              <Button size="lg" onClick={() => { setEnrollmentForm(emptyEnrollmentForm); setEnrollmentDialogOpen(true); }}>
                <GraduationCap className="size-5" />
                Yeni kayit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.length === 0 ? <EmptyState title="Kayit yok" description="Ogrencileri derslere baglamak icin yeni kayit ekleyin." /> : enrollments.map((enrollment) => (
                <div key={enrollment.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="text-xl font-semibold">{enrollment.studentName}</div>
                      <div className="text-base text-muted-foreground">{enrollment.courseName} · {enrollment.term} · {formatDate(enrollment.enrolledAt)}</div>
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
          <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-2xl font-semibold">Materyaller</CardTitle>
              <Button size="lg" onClick={() => { setMaterialForm(emptyMaterialForm); setMaterialDialogOpen(true); }}>
                <Upload className="size-5" />
                Yeni materyal
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {materials.length === 0 ? <EmptyState title="Materyal yok" description="Derslere PDF, baglanti veya video materyali ekleyebilirsiniz." /> : materials.map((material) => (
                <div key={material.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-xl font-semibold">{material.title}</div>
                        <Badge variant="secondary" className="px-3 py-1 text-sm">{material.type}</Badge>
                      </div>
                      <div className="text-base text-muted-foreground">{material.course?.name || "Ders"} · {formatDate(material.uploadedAt)} · {bytesToMb(material.fileSize)}</div>
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
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">{courseForm.id ? "Dersi duzenle" : "Yeni ders"}</DialogTitle><DialogDescription className="text-base leading-7">Ders bilgilerini kaydetmeden once ikinci onay alinacaktir.</DialogDescription></DialogHeader>
          <div className="space-y-6">
            <FormField label="Ders adi"><Input value={courseForm.name} onChange={(event) => setCourseForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
            <FormField label="Donem"><Input value={courseForm.term} onChange={(event) => setCourseForm((current) => ({ ...current, term: event.target.value }))} /></FormField>
            <FormField label="Durum">
              <Select value={courseForm.isActive ? "ACTIVE" : "PASSIVE"} onValueChange={(value) => setCourseForm((current) => ({ ...current, isActive: value === "ACTIVE" }))}>
                <SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="PASSIVE">Pasif</SelectItem></SelectContent>
              </Select>
            </FormField>
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setCourseDialogOpen(false)}>Vazgec</Button>
              <Button type="button" size="lg" onClick={() => setPendingAction({ kind: "course-save", payload: { id: courseForm.id || undefined, name: courseForm.name, term: courseForm.term, isActive: courseForm.isActive } })}>Onay adimina gec</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={classroomDialogOpen} onOpenChange={setClassroomDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">{classroomForm.id ? "Sinifi duzenle" : "Yeni sinif"}</DialogTitle><DialogDescription className="text-base leading-7">Sinif kodu cihaz eslestirmesinde kullanilir.</DialogDescription></DialogHeader>
          <div className="space-y-6">
            <FormField label="Sinif adi"><Input value={classroomForm.name} onChange={(event) => setClassroomForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
            <FormField label="Kod"><Input value={classroomForm.code} onChange={(event) => setClassroomForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></FormField>
            <FormField label="Kapasite"><Input value={classroomForm.capacity} onChange={(event) => setClassroomForm((current) => ({ ...current, capacity: event.target.value.replace(/\D/g, "") }))} /></FormField>
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setClassroomDialogOpen(false)}>Vazgec</Button>
              <Button type="button" size="lg" onClick={() => setPendingAction({ kind: "classroom-save", payload: classroomForm })}>Onay adimina gec</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Tek oturum olustur</DialogTitle><DialogDescription className="text-base leading-7">Ders, sinif, tarih ve saat secerek tekil bir oturum planlayin.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={sessionForm.courseId} onValueChange={(value) => setSessionForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Ders secin" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Sinif"><Select value={sessionForm.classroomId} onValueChange={(value) => setSessionForm((current) => ({ ...current, classroomId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Sinif secin" /></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Tarih"><Input type="date" value={sessionForm.sessionDate} onChange={(event) => setSessionForm((current) => ({ ...current, sessionDate: event.target.value }))} /></FormField>
            <FormField label="Hafta numarasi"><Input value={sessionForm.weekNumber} onChange={(event) => setSessionForm((current) => ({ ...current, weekNumber: event.target.value.replace(/\D/g, "") }))} /></FormField>
            <FormField label="Baslangic saati"><Input type="time" value={sessionForm.startClock} onChange={(event) => setSessionForm((current) => ({ ...current, startClock: event.target.value }))} /></FormField>
            <FormField label="Bitis saati"><Input type="time" value={sessionForm.endClock} onChange={(event) => setSessionForm((current) => ({ ...current, endClock: event.target.value }))} /></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" size="lg" variant="outline" onClick={() => setSessionDialogOpen(false)}>Vazgec</Button>
            <Button type="button" size="lg" onClick={() => setPendingAction({ kind: "session-create", payload: sessionForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Toplu oturum uret</DialogTitle><DialogDescription className="text-base leading-7">Haftalik plana gore toplu oturumlar olusturun.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={generateForm.courseId} onValueChange={(value) => setGenerateForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Ders secin" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Sinif"><Select value={generateForm.classroomId} onValueChange={(value) => setGenerateForm((current) => ({ ...current, classroomId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Sinif secin" /></SelectTrigger><SelectContent>{classrooms.map((classroom) => <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Haftanin gunu"><Select value={generateForm.dayOfWeek} onValueChange={(value) => setGenerateForm((current) => ({ ...current, dayOfWeek: value || "1" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Pazar</SelectItem><SelectItem value="1">Pazartesi</SelectItem><SelectItem value="2">Sali</SelectItem><SelectItem value="3">Carsamba</SelectItem><SelectItem value="4">Persembe</SelectItem><SelectItem value="5">Cuma</SelectItem><SelectItem value="6">Cumartesi</SelectItem></SelectContent></Select></FormField>
            <FormField label="Donem baslangici"><Input type="date" value={generateForm.semesterStart} onChange={(event) => setGenerateForm((current) => ({ ...current, semesterStart: event.target.value }))} /></FormField>
            <FormField label="Baslangic saati"><Input type="time" value={generateForm.startTime} onChange={(event) => setGenerateForm((current) => ({ ...current, startTime: event.target.value }))} /></FormField>
            <FormField label="Bitis saati"><Input type="time" value={generateForm.endTime} onChange={(event) => setGenerateForm((current) => ({ ...current, endTime: event.target.value }))} /></FormField>
            <FormField label="Donem bitisi"><Input type="date" value={generateForm.semesterEnd} onChange={(event) => setGenerateForm((current) => ({ ...current, semesterEnd: event.target.value }))} /></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" size="lg" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Vazgec</Button>
            <Button type="button" size="lg" onClick={() => setPendingAction({ kind: "session-generate", payload: generateForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Yeni ders kaydi</DialogTitle><DialogDescription className="text-base leading-7">Bir ogrenciyi secili derse ekleyin.</DialogDescription></DialogHeader>
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Ders"><Select value={enrollmentForm.courseId} onValueChange={(value) => setEnrollmentForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Ders secin" /></SelectTrigger><SelectContent>{courses.filter((course) => course.isActive).map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
            <FormField label="Ogrenci"><Select value={enrollmentForm.studentId} onValueChange={(value) => setEnrollmentForm((current) => ({ ...current, studentId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Ogrenci secin" /></SelectTrigger><SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.profileId || student.id}>{student.firstName} {student.lastName}</SelectItem>)}</SelectContent></Select></FormField>
          </div>
          <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
            <Button type="button" size="lg" variant="outline" onClick={() => setEnrollmentDialogOpen(false)}>Vazgec</Button>
            <Button type="button" size="lg" onClick={() => setPendingAction({ kind: "enrollment-create", payload: enrollmentForm })}>Onay adimina gec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-6 sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-3xl font-semibold">Yeni materyal</DialogTitle><DialogDescription className="text-base leading-7">PDF dosyasi veya baglanti tipi materyali secili derse baglayin.</DialogDescription></DialogHeader>
          <form className="space-y-6" onSubmit={submitMaterial}>
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField label="Ders"><Select value={materialForm.courseId} onValueChange={(value) => setMaterialForm((current) => ({ ...current, courseId: value || "" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue placeholder="Ders secin" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></FormField>
              <FormField label="Tur"><Select value={materialForm.type} onValueChange={(value) => setMaterialForm((current) => ({ ...current, type: (value as "PDF" | "LINK" | "VIDEO") || "PDF" }))}><SelectTrigger className="h-12 w-full rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="LINK">Link</SelectItem><SelectItem value="VIDEO">Video</SelectItem></SelectContent></Select></FormField>
            </div>
            <FormField label="Baslik"><Input value={materialForm.title} onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))} /></FormField>
            {materialForm.type === "PDF" ? <FormField label="PDF dosyasi"><Input type="file" accept="application/pdf" onChange={(event) => setMaterialForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></FormField> : <FormField label="Baglanti adresi"><Textarea value={materialForm.url} onChange={(event) => setMaterialForm((current) => ({ ...current, url: event.target.value }))} /></FormField>}
            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setMaterialDialogOpen(false)}>Vazgec</Button>
              <Button type="submit" size="lg">Onay adimina gec</Button>
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
