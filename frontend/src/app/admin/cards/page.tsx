"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Link2, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CardItem, CardStatus, StudentListItem } from "@/lib/types";

const cardStatusLabels: Record<string, string> = {
  ALL: "Tum kartlar",
  ACTIVE: "Aktif",
  LOST: "Kayip",
  REVOKED: "Iptal",
};

export default function CardsPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cardUid, setCardUid] = useState("");
  const [studentProfileId, setStudentProfileId] = useState("");
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ card: CardItem; status: CardStatus } | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, CardStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cardsData, studentsData] = await Promise.all([
        apiRequest<{ cards: CardItem[] }>("/api/v1/cards?limit=100"),
        apiRequest<{ students: StudentListItem[] }>("/api/v1/students?limit=100"),
      ]);
      setCards(cardsData.cards);
      setStudents(studentsData.students.filter((student) => Boolean(student.profileId)));
      setStatusDraft(Object.fromEntries(cardsData.cards.map((card) => [card.id, card.status])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kart bilgileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  const visibleCards =
    statusFilter === "ALL" ? cards : cards.filter((card) => card.status === statusFilter);

  function openAssignDialog() {
    setCardUid("");
    setStudentProfileId("");
    setDialogOpen(true);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cardUid.trim() || !studentProfileId) {
      toast.error("Kart UID ve ogrenci secimi zorunludur.");
      return;
    }
    setPendingCreate(true);
  }

  async function confirmCreate() {
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/cards", {
        method: "POST",
        body: JSON.stringify({
          uid: cardUid.trim(),
          studentId: studentProfileId,
        }),
      });
      toast.success("Yeni kart atamasi tamamlandi.");
      setDialogOpen(false);
      setPendingCreate(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kart atanamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  function queueStatusUpdate(card: CardItem) {
    const nextStatus = statusDraft[card.id];
    if (!nextStatus || nextStatus === card.status) {
      return;
    }
    setPendingStatus({ card, status: nextStatus });
  }

  async function confirmStatusUpdate() {
    if (!pendingStatus) {
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/api/v1/cards/${pendingStatus.card.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: pendingStatus.status }),
      });
      toast.success("Kart durumu guncellendi.");
      setPendingStatus(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kart durumu guncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  const studentByProfileId = Object.fromEntries(
    students.map((student) => [student.profileId || "", student])
  );
  const selectedStudent = students.find((student) => (student.profileId || student.id) === studentProfileId);

  if (loading) {
    return <LoadingBlock description="Kart yonetimi verileri yukleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kart Yönetimi"
        description="RFID kartlarını listeleyin, yeni kart atayın ve durumlarını güncelleyin."
        actions={
          <Button onClick={openAssignDialog}>
            <Plus className="size-4" />
            Yeni kart ata
          </Button>
        }
      />

      <Card className="rounded-xl border border-border shadow-none">
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold">Kart listesi</CardTitle>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "ALL")}>
            <SelectTrigger className="h-11 w-full max-w-xs bg-white">
              <span className="min-w-0 truncate text-left">
                {cardStatusLabels[statusFilter] || "Duruma gore filtrele"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm kartlar</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="LOST">Kayıp</SelectItem>
              <SelectItem value="REVOKED">İptal</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleCards.length === 0 ? (
            <EmptyState
              title="Kart bulunamadı"
              description="Seçili filtreye uygun kart kaydı yok."
              actionLabel="Yeni kart ata"
              onAction={openAssignDialog}
            />
          ) : (
            visibleCards.map((card) => {
              const linkedStudent = studentByProfileId[card.studentId];
              const draftStatus = statusDraft[card.id] || card.status;
              const studentName = card.student?.user
                ? `${card.student.user.firstName} ${card.student.user.lastName}`
                : "Öğrenci bilgisi yok";

              return (
                <div
                  key={card.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3.5 lg:flex-row lg:items-center lg:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{card.uid}</span>
                        <Badge
                          variant={
                            card.status === "ACTIVE"
                              ? "secondary"
                              : card.status === "LOST"
                                ? "destructive"
                                : "outline"
                          }
                          className="rounded px-1.5 py-0 text-[10px] font-medium"
                        >
                          {card.status === "ACTIVE" ? "Aktif" : card.status === "LOST" ? "Kayıp" : "İptal"}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {linkedStudent ? (
                          <Link
                            href={`/admin/students/${linkedStudent.id}`}
                            className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                          >
                            {studentName}
                            <Link2 className="size-3" />
                          </Link>
                        ) : (
                          studentName
                        )}
                        <span className="mx-1">·</span>
                        Atama {formatDate(card.assignedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={draftStatus}
                      onValueChange={(value) =>
                        setStatusDraft((current) => ({
                          ...current,
                          [card.id]: value as CardStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 min-w-32 bg-white text-sm">
                        <span className="min-w-0 truncate text-left">
                          {cardStatusLabels[draftStatus]}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Aktif</SelectItem>
                        <SelectItem value="LOST">Kayıp</SelectItem>
                        <SelectItem value="REVOKED">İptal</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={draftStatus === card.status}
                      onClick={() => queueStatusUpdate(card)}
                    >
                      Güncelle
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-semibold">Yeni kart atama</DialogTitle>
            <DialogDescription className="text-base leading-7">
              Kart UID bilgisini girin ve kartin baglanacagi ogrenciyi secin.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleCreateSubmit}>
            <FormField label="Kart UID" htmlFor="card-uid">
              <Input
                id="card-uid"
                value={cardUid}
                onChange={(event) => setCardUid(event.target.value)}
              />
            </FormField>
            <FormField label="Ogrenci secimi" htmlFor="student-profile-id">
              <Select value={studentProfileId} onValueChange={(value) => setStudentProfileId(value || "")}>
                <SelectTrigger id="student-profile-id" className="h-12 w-full rounded-xl bg-white">
                  <span className="min-w-0 truncate text-left">
                    {selectedStudent
                      ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                      : "Kartin atanacagi ogrenciyi secin"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.profileId || student.id}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <DialogFooter className="gap-3 bg-transparent px-0 pb-0">
              <Button type="button" size="lg" variant="outline" onClick={() => setDialogOpen(false)}>
                Vazgec
              </Button>
              <Button type="submit" size="lg">
                Onay adimina gec
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingCreate}
        onOpenChange={setPendingCreate}
        loading={submitting}
        title="Kart atama onayi"
        description="Yeni kart secili ogrenciye atanacak. Devam etmek istiyor musunuz?"
        confirmLabel="Karti ata"
        onConfirm={confirmCreate}
      />

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
          }
        }}
        loading={submitting}
        destructive={pendingStatus?.status !== "ACTIVE"}
        title="Kart durum guncelleme onayi"
        description={
          pendingStatus
            ? `${pendingStatus.card.uid} kartinin durumu ${pendingStatus.status} olarak guncellenecek. Devam etmek istiyor musunuz?`
            : ""
        }
        confirmLabel="Durumu uygula"
        onConfirm={confirmStatusUpdate}
      />
    </div>
  );
}
