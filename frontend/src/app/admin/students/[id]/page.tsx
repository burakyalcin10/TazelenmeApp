"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CreditCard, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { apiRequest } from "@/lib/api";
import { formatDate, formatDateTime, formatPercentage, healthConditionLabel } from "@/lib/format";
import type { CardItem, CardStatus, StudentDetail } from "@/lib/types";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardUid, setCardUid] = useState("");
  const [pendingCardCreate, setPendingCardCreate] = useState(false);
  const [pendingCardStatus, setPendingCardStatus] = useState<{ card: CardItem; status: CardStatus } | null>(null);
  const [cardStatusDraft, setCardStatusDraft] = useState<Record<string, CardStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!params?.id) {
      return;
    }

    void loadStudent();
  }, [params?.id]);

  async function loadStudent() {
    setLoading(true);
    try {
      const data = await apiRequest<StudentDetail>(`/api/v1/students/${params.id}`);
      setStudent(data);
      setCardStatusDraft(
        Object.fromEntries(data.rfidCards.map((card) => [card.id, card.status]))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ogrenci detayi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  function openCardDialog() {
    setCardUid("");
    setCardDialogOpen(true);
  }

  function requestStatusChange(card: CardItem) {
    const nextStatus = cardStatusDraft[card.id];
    if (!nextStatus || nextStatus === card.status) {
      return;
    }

    setPendingCardStatus({ card, status: nextStatus });
  }

  async function handleAssignCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cardUid.trim()) {
      toast.error("Kart UID alani bos birakilamaz.");
      return;
    }

    setPendingCardCreate(true);
  }

  async function confirmAssignCard() {
    if (!student?.profile) {
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/v1/cards", {
        method: "POST",
        body: JSON.stringify({
          uid: cardUid.trim(),
          studentId: student.profile.id,
        }),
      });
      toast.success("Yeni kart ogrenciye atandi.");
      setCardDialogOpen(false);
      setPendingCardCreate(false);
      setCardUid("");
      await loadStudent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kart atanamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmStatusChange() {
    if (!pendingCardStatus) {
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/v1/cards/${pendingCardStatus.card.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pendingCardStatus.status }),
      });
      toast.success("Kart durumu guncellendi.");
      setPendingCardStatus(null);
      await loadStudent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kart durumu degistirilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingBlock description="Ogrenci detayi yukleniyor..." />;
  }

  if (!student) {
    return (
      <EmptyState
        title="Ogrenci detayi bulunamadi"
        description="Istenen ogrenci kaydi bulunamadi veya size gosterilemiyor."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.user.firstName} ${student.user.lastName}`}
        description="Iletisim, saglik, yoklama, ders kaydi ve kart yonetimini tek ekrandan takip edin."
        actions={
          <>
            <Button asChild size="lg" variant="outline">
              <Link href="/admin/students">
                <ArrowLeft className="size-5" />
                Listeye don
              </Link>
            </Button>
            <Button size="lg" onClick={openCardDialog}>
              <Plus className="size-5" />
              Kart ata
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <StatCard
          title="Katilim orani"
          value={formatPercentage(student.attendanceStats?.attendanceRate || 0)}
          description="Ogrencinin kayitli oturumlara katilim ozeti."
          icon={ShieldAlert}
          tone={student.profile?.isAtRisk ? "warning" : "success"}
        />
        <StatCard
          title="Toplam yoklama"
          value={student.attendanceStats?.total || 0}
          description="Sistemde bulunan toplam yoklama kaydi."
          icon={ShieldAlert}
        />
        <StatCard
          title="Ders kaydi"
          value={student.enrollments.length}
          description="Aktif veya gecmis ders kayit adedi."
          icon={CreditCard}
        />
        <StatCard
          title="Kart sayisi"
          value={student.rfidCards.length}
          description="Bu ogrenciye atanmis kart gecmisi."
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Temel bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base">
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Kimlik</div>
              <div className="mt-2 space-y-2">
                <div>TC: {student.user.tcNo || "-"}</div>
                <div>Telefon: {student.user.phone || "-"}</div>
                <div>E-posta: {student.user.email || "-"}</div>
                <div>Kayit tarihi: {formatDate(student.user.createdAt)}</div>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Acil durum</div>
              <div className="mt-2 space-y-2">
                <div>Kisi: {student.profile?.emergencyContactName || "-"}</div>
                <div>Telefon: {student.profile?.emergencyContactPhone || "-"}</div>
                <div>Adres: {student.profile?.address || "-"}</div>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-secondary/55 p-4">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Saglik notlari</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {student.profile?.healthConditions.length ? (
                  student.profile.healthConditions.map((condition) => (
                    <Badge key={condition} variant="secondary" className="px-3 py-1 text-sm">
                      {healthConditionLabel(condition)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="px-3 py-1 text-sm">
                    Saglik kaydi yok
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {student.profile?.otherHealthNotes || "Ek saglik notu bulunmuyor."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Kart yonetimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.rfidCards.length === 0 ? (
              <EmptyState
                title="Kart kaydi yok"
                description="Bu ogrenciye henuz RFID kart atanmis degil."
                actionLabel="Kart ata"
                onAction={openCardDialog}
              />
            ) : (
              student.rfidCards.map((card) => (
                <div key={card.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="text-xl font-semibold">{card.uid}</div>
                      <div className="text-sm text-muted-foreground">
                        Atama: {formatDate(card.assignedAt)}
                        {card.revokedAt ? ` · Iptal tarihi: ${formatDate(card.revokedAt)}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Select
                        value={cardStatusDraft[card.id] || card.status}
                        onValueChange={(value) =>
                          setCardStatusDraft((current) => ({
                            ...current,
                            [card.id]: value as CardStatus,
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 w-full min-w-48 rounded-xl bg-white">
                          <SelectValue placeholder="Kart durumu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="LOST">Kayip</SelectItem>
                          <SelectItem value="REVOKED">Iptal</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="lg"
                        variant="outline"
                        disabled={(cardStatusDraft[card.id] || card.status) === card.status}
                        onClick={() => requestStatusChange(card)}
                      >
                        Durumu guncelle
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Ders kayitlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.enrollments.length === 0 ? (
              <EmptyState
                title="Ders kaydi bulunmuyor"
                description="Bu ogrencinin bagli oldugu bir ders kaydi yok."
              />
            ) : (
              student.enrollments.map((enrollment) => (
                <div key={enrollment.id} className="rounded-[1.5rem] bg-secondary/55 p-4">
                  <div className="text-lg font-semibold">
                    {enrollment.course?.name || `${enrollment.firstName} ${enrollment.lastName}`}
                  </div>
                  <div className="mt-1 text-base text-muted-foreground">
                    {enrollment.course?.term || "-"} · Kayit: {formatDate(enrollment.enrolledAt)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Son yoklamalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.recentAttendances.length === 0 ? (
              <EmptyState
                title="Yoklama kaydi yok"
                description="Bu ogrenci icin son yoklama verisi bulunmuyor."
              />
            ) : (
              student.recentAttendances.map((attendance) => (
                <div key={attendance.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{attendance.session.course.name}</div>
                      <div className="text-base text-muted-foreground">
                        {attendance.session.classroom.name} · Hafta {attendance.session.weekNumber}
                      </div>
                    </div>
                    <Badge variant={attendance.status === "ABSENT" ? "destructive" : "secondary"} className="px-3 py-1 text-sm">
                      {attendance.status === "PRESENT"
                        ? "Geldi"
                        : attendance.status === "EXCUSED"
                          ? "Izinli"
                          : "Gelmedi"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {formatDateTime(attendance.timestamp)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold">Yeni kart atama</DialogTitle>
            <DialogDescription className="text-base leading-7">
              Yeni kart UID bilgisini girin. Kaydetmeden once sistem sizden ek onay isteyecek.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleAssignCard}>
            <FormField label="Kart UID" htmlFor="cardUid">
              <Input
                id="cardUid"
                placeholder="RFID kart numarasini girin"
                value={cardUid}
                onChange={(event) => setCardUid(event.target.value)}
              />
            </FormField>

            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setCardDialogOpen(false)}>
                Vazgec
              </Button>
              <Button type="submit" size="lg">
                Kart atama adimina gec
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingCardCreate}
        onOpenChange={setPendingCardCreate}
        loading={submitting}
        title="Kart atama onayi"
        description={`Bu kart UID bilgisi ${student.user.firstName} ${student.user.lastName} isimli ogrenciye atanacak. Devam etmek istiyor musunuz?`}
        confirmLabel="Karti ata"
        onConfirm={confirmAssignCard}
      />

      <ConfirmDialog
        open={Boolean(pendingCardStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCardStatus(null);
          }
        }}
        loading={submitting}
        destructive={pendingCardStatus?.status !== "ACTIVE"}
        title="Kart durumu guncelleme onayi"
        description={
          pendingCardStatus
            ? `${pendingCardStatus.card.uid} kartinin durumu ${pendingCardStatus.status} olarak guncellenecek. Devam etmek istiyor musunuz?`
            : ""
        }
        confirmLabel="Durumu uygula"
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
