"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Phone, Save, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/empty-state";
import { LoadingBlock } from "@/components/app/loading-block";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { formatDateTime, healthConditionLabel } from "@/lib/format";
import type { NotificationItem, StudentListItem } from "@/lib/types";

interface RiskRecord {
  profileId: string;
  userId?: string;
  name: string;
  phone?: string | null;
  tcNo?: string | null;
  isAtRisk: boolean;
  healthConditions: string[];
  notifications: NotificationItem[];
}

function buildRiskRecords(students: StudentListItem[], notifications: NotificationItem[]) {
  const records = new Map<string, RiskRecord>();

  students.forEach((student) => {
    const profileId = student.profileId || student.id;
    records.set(profileId, {
      profileId,
      userId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      phone: student.phone,
      tcNo: student.tcNo,
      isAtRisk: student.isAtRisk,
      healthConditions: student.healthConditions,
      notifications: [],
    });
  });

  notifications.forEach((notification) => {
    if (!notification.studentProfileId) {
      return;
    }

    const existing = records.get(notification.studentProfileId);
    if (existing) {
      existing.notifications.push(notification);
      return;
    }

    records.set(notification.studentProfileId, {
      profileId: notification.studentProfileId,
      name: notification.studentName || "Öğrenci",
      isAtRisk: false,
      healthConditions: [],
      notifications: [notification],
    });
  });

  return Array.from(records.values()).sort((a, b) => {
    if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

export default function AdminRisksPage() {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [riskStudents, setRiskStudents] = useState<StudentListItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [actionDrafts, setActionDrafts] = useState<Record<string, string>>({});

  async function loadRisks() {
    setLoading(true);
    try {
      const [studentData, notificationData] = await Promise.all([
        apiRequest<{ students: StudentListItem[] }>("/api/v1/students?isAtRisk=true&limit=100"),
        apiRequest<{ notifications: NotificationItem[] }>("/api/v1/notifications?type=ISOLATION_RISK&limit=100"),
      ]);

      setRiskStudents(studentData.students);
      setNotifications(notificationData.notifications);

      const records = buildRiskRecords(studentData.students, notificationData.notifications);
      setSelectedProfileId((current) => current || records[0]?.profileId || "");
      setActionDrafts(
        notificationData.notifications.reduce<Record<string, string>>((acc, notification) => {
          acc[notification.id] = notification.actionTaken || "";
          return acc;
        }, {})
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Risk bildirimleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRisks();
  }, []);

  const records = useMemo(() => buildRiskRecords(riskStudents, notifications), [riskStudents, notifications]);
  const selectedRecord = records.find((record) => record.profileId === selectedProfileId) || records[0];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const selectedHasActiveRisk = Boolean(selectedRecord?.isAtRisk);

  async function updateNotification(notificationId: string, payload: { isRead?: boolean; actionTaken?: string }) {
    setSubmittingId(notificationId);
    try {
      await apiRequest(`/api/v1/notifications/${notificationId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success("Bildirim güncellendi.");
      await loadRisks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bildirim güncellenemedi.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return <LoadingBlock description="Risk bildirimleri yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Bildirimleri"
        description="Devamsızlık ve izolasyon risklerini öğrenci bazında takip edin."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="surface-kpi">
          <p className="panel-label">Riskli Öğrenci</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">{riskStudents.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">Aktif risk bayrağı</p>
        </div>
        <div className="surface-kpi">
          <p className="panel-label">Toplam Risk Kaydı</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">{records.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">İzolasyon geçmişi</p>
        </div>
        <div className="surface-kpi">
          <p className="panel-label">İzolasyon Bildirimi</p>
          <div className="mt-2 font-serif text-3xl tracking-tight text-forest">{notifications.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">{unreadCount} okunmamış</p>
        </div>
      </div>

      {records.length === 0 ? (
        <Card className="rounded-xl border border-border shadow-none">
          <CardContent className="p-6">
            <EmptyState title="Risk bildirimi yok" description="Şu anda takip gerektiren öğrenci veya izolasyon bildirimi bulunmuyor." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
          <Card className="rounded-xl border border-border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldAlert className="size-4 text-amber-600" />
                Öğrenciler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {records.map((record) => {
                const isSelected = selectedRecord?.profileId === record.profileId;
                const recordUnread = record.notifications.filter((notification) => !notification.isRead).length;

                return (
                  <button
                    key={record.profileId}
                    type="button"
                    onClick={() => setSelectedProfileId(record.profileId)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-amber/40 bg-amber/10"
                        : "border-border bg-white hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{record.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.isAtRisk ? "Aktif risk" : "Geçmiş bildirim"} · {record.notifications.length} bildirim
                        </p>
                      </div>
                      {recordUnread > 0 ? (
                        <Badge className="rounded px-1.5 py-0 text-[10px]">{recordUnread} yeni</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border shadow-none">
            {selectedRecord ? (
              <>
                <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <UserRound className="size-4 text-primary" />
                      {selectedRecord.name}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {selectedRecord.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5" />
                          {selectedRecord.phone}
                        </span>
                      ) : null}
                      {selectedRecord.tcNo ? <span>TC: {selectedRecord.tcNo}</span> : null}
                    </div>
                    {selectedRecord.healthConditions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedRecord.healthConditions.map((condition) => (
                          <Badge key={condition} variant="outline" className="rounded px-1.5 py-0 text-[10px]">
                            {healthConditionLabel(condition)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {selectedRecord.userId ? (
                    <Link
                      href={`/admin/students/${selectedRecord.userId}`}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-medium hover:bg-secondary/60"
                    >
                      Öğrenci kartı
                      <ChevronRight className="ml-1 size-4" />
                    </Link>
                  ) : null}
                </CardHeader>

                <CardContent className="space-y-3">
                  {selectedHasActiveRisk ? (
                    <div className="rounded-xl border border-amber/30 bg-amber/10 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 size-5 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-amber-foreground">Aktif risk kaydı</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Bu öğrenci devamsızlık eşiğinde takip listesinde. Ayrı bir izolasyon bildirimi olmasa bile risk kaydı olarak görüntülenir.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {selectedRecord.notifications.length === 0 ? (
                    <EmptyState title="Ayrı bildirim yok" description="Bu öğrenci için kayıtlı izolasyon bildirimi bulunmuyor; aktif risk kaydı üstte gösterilir." />
                  ) : (
                    selectedRecord.notifications.map((notification) => (
                      <div key={notification.id} className="rounded-xl border border-border bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <AlertTriangle className="size-4 text-amber-600" />
                              <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                              <Badge variant={notification.isRead ? "outline" : "secondary"} className="rounded px-1.5 py-0 text-[10px]">
                                {notification.isRead ? "Okundu" : "Yeni"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.message}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                          </div>
                          {!notification.isRead ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submittingId === notification.id}
                              onClick={() => void updateNotification(notification.id, { isRead: true })}
                            >
                              <CheckCircle2 className="size-4" />
                              Okundu yap
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-4 space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">Aksiyon notu</label>
                          <Textarea
                            value={actionDrafts[notification.id] || ""}
                            onChange={(event) => setActionDrafts((current) => ({ ...current, [notification.id]: event.target.value }))}
                            placeholder="Arandı, aile yakınına ulaşıldı, ziyaret planlandı..."
                          />
                          <Button
                            size="sm"
                            disabled={submittingId === notification.id}
                            onClick={() => void updateNotification(notification.id, { actionTaken: actionDrafts[notification.id] || "" })}
                          >
                            <Save className="size-4" />
                            Notu kaydet
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-6">
                <EmptyState title="Öğrenci seçilmedi" description="Detayları görüntülemek için listeden bir öğrenci seçin." />
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
