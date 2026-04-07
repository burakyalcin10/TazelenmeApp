"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, Search, ShieldAlert, Trash2, Upload } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { formatDate, healthConditionLabel } from "@/lib/format";
import type { HealthCondition, StudentCreatePayload, StudentListItem } from "@/lib/types";

const healthOptions: { value: HealthCondition; label: string }[] = [
  { value: "DIABETES", label: "Diyabet" },
  { value: "HYPERTENSION", label: "Hipertansiyon" },
  { value: "HEART_DISEASE", label: "Kalp Hastaligi" },
  { value: "DEMENTIA", label: "Demans" },
  { value: "PHYSICAL_ISSUE", label: "Fiziksel Destek Ihtiyaci" },
  { value: "OTHER", label: "Diger" },
];

const emptyForm: StudentCreatePayload = {
  tcNo: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  healthConditions: [],
  otherHealthNotes: "",
};

interface StudentImportSuccessItem {
  line: number;
  userId: string;
  tcNo: string;
  firstName: string;
  lastName: string;
  generatedPin: string;
}

interface StudentImportErrorItem {
  line: number;
  error: string;
  data?: {
    tcNo?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface StudentImportResult {
  success: StudentImportSuccessItem[];
  errors: StudentImportErrorItem[];
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, "\"\"");
  return `"${normalized}"`;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [healthFilter, setHealthFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentListItem | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [form, setForm] = useState<StudentCreatePayload>(emptyForm);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !search ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        student.tcNo?.includes(search);

      const matchesRisk =
        riskFilter === "ALL" ||
        (riskFilter === "RISK" && student.isAtRisk) ||
        (riskFilter === "SAFE" && !student.isAtRisk);

      const matchesHealth =
        healthFilter === "ALL" || student.healthConditions.includes(healthFilter as HealthCondition);

      return matchesSearch && matchesRisk && matchesHealth;
    });
  }, [healthFilter, riskFilter, search, students]);

  useEffect(() => {
    void loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await apiRequest<{ students: StudentListItem[] }>("/api/v1/students?limit=100");
      setStudents(data.students);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ogrenci listesi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingStudent(null);
    setGeneratedPin(null);
    setPendingSave(false);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function exportStudentsCsv() {
    if (!filteredStudents.length) {
      toast.error("Disa aktarilacak ogrenci bulunmuyor.");
      return;
    }

    const rows = [
      [
        "tcNo",
        "firstName",
        "lastName",
        "phone",
        "email",
        "riskStatus",
        "healthConditions",
        "activeCardUid",
        "createdAt",
      ],
      ...filteredStudents.map((student) => [
        student.tcNo || "",
        student.firstName,
        student.lastName,
        student.phone || "",
        student.email || "",
        student.isAtRisk ? "Riskli" : "Normal",
        student.healthConditions.map((condition) => healthConditionLabel(condition)).join(" | "),
        student.activeCard?.uid || "",
        formatDate(student.createdAt),
      ]),
    ];

    const csvContent = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ogrenciler-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Ogrenci listesi CSV olarak indirildi.");
  }

  function downloadImportTemplate() {
    const template = [
      "tcNo,firstName,lastName,phone,email,emergencyContactName,emergencyContactPhone",
      "11111111111,Ayse,Yilmaz,05551234567,ayse@example.com,Fatma Yilmaz,05557654321",
    ].join("\n");

    const blob = new Blob([`\uFEFF${template}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ogrenci-import-sablonu.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function openEditDialog(student: StudentListItem) {
    setEditingStudent(student);
    setGeneratedPin(null);
    setForm({
      tcNo: student.tcNo || "",
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone || "",
      email: student.email || "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      healthConditions: student.healthConditions,
      otherHealthNotes: "",
    });
    setDialogOpen(true);
  }

  function toggleHealthCondition(condition: HealthCondition, checked: boolean) {
    setForm((current) => ({
      ...current,
      healthConditions: checked
        ? [...current.healthConditions, condition]
        : current.healthConditions.filter((item) => item !== condition),
    }));
  }

  function validateForm() {
    if (form.tcNo.length !== 11) {
      toast.error("TC kimlik numarasi 11 haneli olmalidir.");
      return false;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Ad ve soyad alanlari zorunludur.");
      return false;
    }

    return true;
  }

  async function handleConfirmedSave() {
    setSubmitting(true);
    try {
      if (editingStudent) {
        await apiRequest(`/api/v1/students/${editingStudent.id}`, {
          method: "PUT",
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || null,
            email: form.email || null,
            address: form.address || null,
            emergencyContactName: form.emergencyContactName || null,
            emergencyContactPhone: form.emergencyContactPhone || null,
            healthConditions: form.healthConditions,
            otherHealthNotes: form.otherHealthNotes || null,
          }),
        });
        toast.success("Ogrenci bilgileri guncellendi.");
      } else {
        const created = await apiRequest<{
          user: { id: string };
          generatedPin: string;
        }>("/api/v1/students", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            phone: form.phone || null,
            email: form.email || null,
            address: form.address || null,
            emergencyContactName: form.emergencyContactName || null,
            emergencyContactPhone: form.emergencyContactPhone || null,
            otherHealthNotes: form.otherHealthNotes || null,
          }),
        });
        setGeneratedPin(created.generatedPin);
        toast.success("Yeni ogrenci olusturuldu.");
      }

      await loadStudents();
      setPendingSave(false);

      if (editingStudent) {
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kayit islemi tamamlanamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/v1/students/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast.success("Ogrenci pasif duruma alindi.");
      setPendingDelete(null);
      await loadStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ogrenci pasif yapilamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmedImport() {
    if (!importFile) {
      toast.error("Once bir CSV dosyasi secin.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", importFile);

      const response = await apiRequest<StudentImportResult>("/api/v1/students/import", {
        method: "POST",
        body: formData,
      });

      setImportResult(response);
      setPendingImport(false);
      setImportDialogOpen(false);
      setImportFile(null);
      await loadStudents();
      toast.success("Toplu ogrenci import islemi tamamlandi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import islemi tamamlanamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    setPendingSave(true);
  }

  if (loading) {
    return <LoadingBlock description="Ogrenci listesi yukleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ogrenci Yonetimi"
        description="Ogrenci kayitlarini arayin, yeni ogrenci ekleyin ve riskli profilleri rahat bir ekrandan yonetin."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button size="xl" variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="size-5" />
              CSV import
            </Button>
            <Button size="xl" variant="outline" onClick={exportStudentsCsv}>
              <Download className="size-5" />
              CSV disa aktar
            </Button>
            <Button size="xl" onClick={openCreateDialog}>
              <Plus className="size-5" />
              Yeni ogrenci ekle
            </Button>
          </div>
        }
      />

      <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">Toplu islemler</CardTitle>
            <p className="text-base leading-7 text-muted-foreground">
              Ogrenci listesini CSV olarak disa aktarabilir veya hazir sablon ile toplu import yapabilirsiniz.
            </p>
          </div>
          <Button size="lg" variant="outline" onClick={downloadImportTemplate}>
            <Download className="size-5" />
            Import sablonunu indir
          </Button>
        </CardHeader>
        {importResult ? (
          <CardContent className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-[1.5rem] bg-secondary/60 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Son import ozeti</div>
              <div className="mt-3 text-3xl font-semibold">{importResult.success.length} basarili</div>
              <div className="mt-2 text-base text-muted-foreground">{importResult.errors.length} satir hata ile karsilasti.</div>
            </div>
            <div className="space-y-3">
              {importResult.success.slice(0, 4).map((item) => (
                <div key={`${item.userId}-${item.line}`} className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-base font-semibold">
                    Satir {item.line}: {item.firstName} {item.lastName}
                  </div>
                  <div className="mt-1 text-sm text-emerald-800">Olusan ilk PIN: {item.generatedPin}</div>
                </div>
              ))}
              {importResult.errors.slice(0, 3).map((item) => (
                <div key={`error-${item.line}`} className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
                  <div className="text-base font-semibold">Satir {item.line}</div>
                  <div className="mt-1 text-sm text-amber-900">{item.error}</div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader className="gap-4">
          <CardTitle className="text-2xl font-semibold">Arama ve filtreler</CardTitle>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-12"
                placeholder="Ad, soyad veya TC ile arayin"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value || "ALL")}>
              <SelectTrigger className="h-12 w-full rounded-xl bg-white">
                <SelectValue placeholder="Risk durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum ogrenciler</SelectItem>
                <SelectItem value="RISK">Sadece riskli</SelectItem>
                <SelectItem value="SAFE">Riskte olmayanlar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={healthFilter} onValueChange={(value) => setHealthFilter(value || "ALL")}>
              <SelectTrigger className="h-12 w-full rounded-xl bg-white">
                <SelectValue placeholder="Saglik filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum saglik durumlari</SelectItem>
                {healthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            Ogrenci listesi ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <EmptyState
              title="Ogrenci bulunamadi"
              description="Arama ve filtrelere uygun ogrenci yok. Isterseniz yeni bir kayit olusturabilirsiniz."
              actionLabel="Yeni ogrenci ekle"
              onAction={openCreateDialog}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="px-4 py-4 text-base">Ogrenci</TableHead>
                  <TableHead className="px-4 py-4 text-base">Durum</TableHead>
                  <TableHead className="px-4 py-4 text-base">Kart</TableHead>
                  <TableHead className="px-4 py-4 text-base">Kayit tarihi</TableHead>
                  <TableHead className="px-4 py-4 text-right text-base">Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className="border-border">
                    <TableCell className="px-4 py-5 align-top">
                      <div className="space-y-2">
                        <div className="text-lg font-semibold">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          TC: {student.tcNo || "-"} {student.phone ? `· Tel: ${student.phone}` : ""}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {student.healthConditions.length > 0 ? (
                            student.healthConditions.map((condition) => (
                              <Badge key={condition} variant="secondary" className="px-3 py-1 text-sm">
                                {healthConditionLabel(condition)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="px-3 py-1 text-sm">
                              Saglik notu yok
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-5 align-top">
                      {student.isAtRisk ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
                          <ShieldAlert className="size-4" />
                          Riskli
                        </div>
                      ) : (
                        <div className="inline-flex rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
                          Takipte sorun yok
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-5 align-top text-base">
                      {student.activeCard?.uid || "Kart atanmadi"}
                    </TableCell>
                    <TableCell className="px-4 py-5 align-top text-base">
                      {formatDate(student.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-5 align-top">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Eye className="size-4" />
                          Detay
                        </Link>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(student)}>
                          <Pencil className="size-4" />
                          Duzenle
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setPendingDelete(student)}>
                          <Trash2 className="size-4" />
                          Pasif yap
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[2rem] p-6 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold">
              {editingStudent ? "Ogrenci bilgilerini duzenle" : "Yeni ogrenci olustur"}
            </DialogTitle>
            <DialogDescription className="text-base leading-7">
              Formu doldurup kaydet butonuna bastiginizda sistem ikinci bir onay isteyecektir.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField label="TC Kimlik Numarasi" htmlFor="student-tc">
                <Input
                  id="student-tc"
                  disabled={Boolean(editingStudent)}
                  value={form.tcNo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tcNo: event.target.value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                />
              </FormField>
              <FormField label="Telefon" htmlFor="student-phone">
                <Input
                  id="student-phone"
                  value={form.phone || ""}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </FormField>
              <FormField label="Ad" htmlFor="student-first-name">
                <Input
                  id="student-first-name"
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                />
              </FormField>
              <FormField label="Soyad" htmlFor="student-last-name">
                <Input
                  id="student-last-name"
                  value={form.lastName}
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                />
              </FormField>
              <FormField label="E-posta" htmlFor="student-email">
                <Input
                  id="student-email"
                  value={form.email || ""}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </FormField>
              <FormField label="Acil kisi adi" htmlFor="student-emergency-name">
                <Input
                  id="student-emergency-name"
                  value={form.emergencyContactName || ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergencyContactName: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Acil kisi telefonu" htmlFor="student-emergency-phone">
                <Input
                  id="student-emergency-phone"
                  value={form.emergencyContactPhone || ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, emergencyContactPhone: event.target.value }))
                  }
                />
              </FormField>
            </div>

            <FormField
              label="Adres"
              description="Kisa ve net bir adres notu yeterlidir."
              htmlFor="student-address"
            >
              <Textarea
                id="student-address"
                value={form.address || ""}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </FormField>

            <div className="space-y-3">
              <div>
                <div className="text-base font-semibold">Saglik durumlari</div>
                <div className="text-sm leading-6 text-muted-foreground">
                  Gereken durumlari isaretleyin. Birden fazla secim yapabilirsiniz.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {healthOptions.map((option) => {
                  const checked = form.healthConditions.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-base"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleHealthCondition(option.value, Boolean(value))}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <FormField label="Diger saglik notlari" htmlFor="student-notes">
              <Textarea
                id="student-notes"
                value={form.otherHealthNotes || ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, otherHealthNotes: event.target.value }))
                }
              />
            </FormField>

            {generatedPin ? (
              <div className="rounded-[1.75rem] bg-primary/10 p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  Yeni PIN Kodu
                </div>
                <div className="mt-2 text-5xl font-semibold tracking-[0.22em] text-primary">{generatedPin}</div>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  Bu PIN sadece ilk olusturma sonrasinda gosterilir. Lutfen guvenli sekilde not alin.
                </p>
              </div>
            ) : null}

            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setDialogOpen(false)}>
                Vazgec
              </Button>
              <Button type="submit" size="lg">
                {editingStudent ? "Degisiklikleri kaydet" : "Ogrenciyi kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold">CSV ile toplu ogrenci import</DialogTitle>
            <DialogDescription className="text-base leading-7">
              Dosya yuklenmeden once ikinci bir onay istenir. Ilk satir baslik olmali ve alanlar virgulle ayrilmalidir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] bg-secondary/60 p-5 text-base leading-7 text-muted-foreground">
              Beklenen kolonlar: <span className="font-semibold text-foreground">tcNo, firstName, lastName, phone, email, emergencyContactName, emergencyContactPhone</span>
            </div>

            <FormField label="CSV dosyasi" htmlFor="student-import-file">
              <Input
                id="student-import-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              />
            </FormField>

            {importFile ? (
              <div className="rounded-[1.5rem] border border-border bg-white p-4 text-base">
                Secilen dosya: <span className="font-semibold">{importFile.name}</span>
              </div>
            ) : null}

            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setImportDialogOpen(false)}>
                Vazgec
              </Button>
              <Button type="button" size="lg" onClick={() => setPendingImport(true)} disabled={!importFile}>
                Onay adimina gec
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingSave}
        onOpenChange={setPendingSave}
        loading={submitting}
        title={editingStudent ? "Guncelleme onayi" : "Yeni ogrenci onayi"}
        description={
          editingStudent
            ? `${form.firstName} ${form.lastName} isimli ogrencinin bilgileri guncellenecek. Devam etmek istiyor musunuz?`
            : `${form.firstName} ${form.lastName} icin yeni ogrenci kaydi ve ilk PIN kodu olusturulacak. Devam etmek istiyor musunuz?`
        }
        confirmLabel={editingStudent ? "Guncellemeyi tamamla" : "Kaydi olustur"}
        onConfirm={handleConfirmedSave}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        loading={submitting}
        destructive
        title="Ogrenciyi pasif yap"
        description={
          pendingDelete
            ? `${pendingDelete.firstName} ${pendingDelete.lastName} pasif duruma alinacak ve aktif kartlari iptal edilecek. Devam etmek istiyor musunuz?`
            : ""
        }
        confirmLabel="Pasif yap"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={pendingImport}
        onOpenChange={setPendingImport}
        loading={submitting}
        title="CSV import onayi"
        description={
          importFile
            ? `${importFile.name} dosyasindaki ogrenciler sisteme aktarilacak. Gecerli satirlarda yeni ogrenci ve ilk PIN kodu olusturulur. Devam etmek istiyor musunuz?`
            : ""
        }
        confirmLabel="Import islemini baslat"
        onConfirm={handleConfirmedImport}
      />
    </div>
  );
}
