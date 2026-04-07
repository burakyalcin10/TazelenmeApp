import cron from 'node-cron';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

/**
 * İzolasyon Tarama Cron Job
 * Görev 5.1: Her Cuma 18:00 — 3 haftalık devamsızlık tarama
 * Görev 5.2: isAtRisk flag güncelleme + Notification kaydı oluşturma
 *
 * Mantık:
 * 1. Son 3 haftadaki tüm ders oturumlarını bul
 * 2. Her aktif öğrenci için bu oturumlardaki katılım durumunu kontrol et
 * 3. Eğer öğrenci kayıtlı olduğu derslerde son 3 haftada hiç katılmamışsa:
 *    - isAtRisk = true yap
 *    - Bildirim oluştur
 * 4. Daha önce riskli olup artık gelmeye başlayan öğrencileri güncelle
 */

export async function runIsolationCheck(): Promise<{
  scannedStudents: number;
  newRisks: number;
  resolvedRisks: number;
}> {
  const startTime = Date.now();
  logger.info('🔍 İzolasyon taraması başlıyor...');

  // Son 3 haftanın tarih aralığını hesapla
  const now = new Date();
  const threeWeeksAgo = new Date(now);
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  // Son 3 haftadaki ders oturumlarını bul
  const recentSessions = await prisma.lessonSession.findMany({
    where: {
      sessionDate: {
        gte: threeWeeksAgo,
        lte: now,
      },
    },
    select: { id: true, courseId: true },
  });

  if (recentSessions.length === 0) {
    logger.info('Son 3 haftada ders oturumu bulunamadı. Tarama atlandı.');
    return { scannedStudents: 0, newRisks: 0, resolvedRisks: 0 };
  }

  // Ders bazlı oturum ID'lerini grupla
  const sessionsByCourse = new Map<string, string[]>();
  for (const session of recentSessions) {
    if (!sessionsByCourse.has(session.courseId)) {
      sessionsByCourse.set(session.courseId, []);
    }
    sessionsByCourse.get(session.courseId)!.push(session.id);
  }

  // Tüm aktif öğrenci profillerini getir
  const studentProfiles = await prisma.studentProfile.findMany({
    where: {
      user: { isActive: true, role: 'STUDENT' },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      enrollments: { select: { courseId: true } },
    },
  });

  let newRisks = 0;
  let resolvedRisks = 0;

  for (const profile of studentProfiles) {
    // Öğrencinin kayıtlı olduğu derslerden son 3 haftadaki oturumları bul
    const relevantSessionIds: string[] = [];
    for (const enrollment of profile.enrollments) {
      const courseSessions = sessionsByCourse.get(enrollment.courseId);
      if (courseSessions) {
        relevantSessionIds.push(...courseSessions);
      }
    }

    // Kayıtlı olduğu derslerde son 3 haftada oturum yoksa atla
    if (relevantSessionIds.length === 0) {
      continue;
    }

    // Bu öğrencinin bu oturumlardaki katılım durumunu kontrol et
    const attendedCount = await prisma.attendance.count({
      where: {
        studentId: profile.id,
        sessionId: { in: relevantSessionIds },
        status: { in: ['PRESENT', 'EXCUSED'] },
      },
    });

    const isCurrentlyAtRisk = attendedCount === 0; // Hiçbir derse katılmamış

    if (isCurrentlyAtRisk && !profile.isAtRisk) {
      // YENİ RİSK: Bayrak yükselt + bildirim oluştur
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { isAtRisk: true },
      });

      await prisma.notification.create({
        data: {
          type: 'ISOLATION_RISK',
          title: 'Sosyal İzolasyon Uyarısı!',
          message: `${profile.user.firstName} ${profile.user.lastName} son 3 haftadır hiçbir derse katılmadı. İletişime geçilmesi önerilir.`,
          studentProfileId: profile.id,
        },
      });

      newRisks++;
      logger.warn(
        { studentId: profile.id, studentName: `${profile.user.firstName} ${profile.user.lastName}` },
        'İzolasyon riski tespit edildi'
      );
    } else if (!isCurrentlyAtRisk && profile.isAtRisk) {
      // RİSK ÇÖZÜLDÜ: Bayrak indir
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { isAtRisk: false },
      });

      resolvedRisks++;
      logger.info(
        { studentId: profile.id, studentName: `${profile.user.firstName} ${profile.user.lastName}` },
        'İzolasyon riski çözüldü — öğrenci derslere dönmüş'
      );
    }
  }

  const duration = Date.now() - startTime;
  logger.info(
    {
      scannedStudents: studentProfiles.length,
      newRisks,
      resolvedRisks,
      durationMs: duration,
    },
    `✅ İzolasyon taraması tamamlandı (${duration}ms)`
  );

  return {
    scannedStudents: studentProfiles.length,
    newRisks,
    resolvedRisks,
  };
}

/**
 * Cron Job'u başlat
 * Schedule: Her Cuma 18:00
 * Cron expression: 0 18 * * 5
 */
export function startIsolationCheckJob(): void {
  cron.schedule('0 18 * * 5', async () => {
    try {
      await runIsolationCheck();
    } catch (error) {
      logger.error({ error }, 'İzolasyon tarama cron job hatası');
    }
  }, {
    timezone: 'Europe/Istanbul',
  });

  logger.info('🕐 İzolasyon tarama cron job başlatıldı (Her Cuma 18:00 Europe/Istanbul)');
}
