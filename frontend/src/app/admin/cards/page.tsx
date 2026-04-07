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
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CardItem, CardStatus, StudentListItem } from "@/lib/types";

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

  if (loading) {
    return <LoadingBlock description="Kart yonetimi verileri yukleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kart Yonetimi"
        description="Tum RFID kartlarini tek listede izleyin, yeni kart atayin ve kart durumlarini guvenli sekilde degistirin."
        actions={
          <Button size="xl" onClick={openAssignDialog}>
            <Plus className="size-5" />
            Yeni kart ata
          </Button>
        }
      />

      <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-2xl font-semibold">Kart listesi</CardTitle>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "ALL")}>
            <SelectTrigger className="h-12 w-full max-w-xs rounded-xl bg-white">
              <SelectValue placeholder="Duruma gore filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tum kartlar</SelectItem>
              <SelectItem value="ACTIVE">Aktif kartlar</SelectItem>
              <SelectItem value="LOST">Kayip kartlar</SelectItem>
              <SelectItem value="REVOKED">Iptal kartlar</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleCards.length === 0 ? (
            <EmptyState
              title="Kart bulunamadi"
              description="Secili filtreye uygun kart kaydi yok."
              actionLabel="Yeni kart ata"
              onAction={openAssignDialog}
            />
          ) : (
            visibleCards.map((card) => {
              const linkedStudent = studentByProfileId[card.studentId];

              return (
                <div key={card.id} className="rounded-[1.5rem] border border-border bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CreditCard className="size-6" />
                        </div>
                        <div>
                          <div className="text-xl font-semibold">{card.uid}</div>
                          <div className="text-sm text-muted-foreground">
                            {card.student?.user
                              ? `${card.student.user.firstName} ${card.student.user.lastName}`
                              : "Ogrenci bilgisi"}
                          </div>
                        </div>
                        <Badge
                          variant={
                            card.status === "ACTIVE"
                              ? "secondary"
                              : card.status === "LOST"
                                ? "destructive"
                                : "outline"
                          }
                          className="px-3 py-1 text-sm"
                        >
                          {card.status === "ACTIVE" ? "Aktif" : card.status === "LOST" ? "Kayip" : "Iptal"}
                        </Badge>
                      </div>
                      <div className="text-sm leading-7 text-muted-foreground">
                        Atama: {formatDate(card.assignedAt)}
                        {card.revokedAt ? ` · Son degisim: ${formatDate(card.revokedAt)}` : ""}
                      </div>
                      {linkedStudent ? (
                        <Link
                          href={`/admin/students/${linkedStudent.id}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Link2 className="size-4" />
                          Ogrenci detayina git
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Select
                        value={statusDraft[card.id] || card.status}
                        onValueChange={(value) =>
                          setStatusDraft((current) => ({
                            ...current,
                            [card.id]: value as CardStatus,
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 min-w-44 rounded-xl bg-white">
                          <SelectValue placeholder="Yeni durum" />
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
                        disabled={(statusDraft[card.id] || card.status) === card.status}
                        onClick={() => queueStatusUpdate(card)}
                      >
                        Durumu guncelle
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-6 sm:max-w-2xl">
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
                  <SelectValue placeholder="Kartin atanacagi ogrenciyi secin" />
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
