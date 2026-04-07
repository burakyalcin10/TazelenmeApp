import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Attendance Controller — Yoklama İşlemleri
 * RFID kart okutma, manuel yoklama, yoklama listesi
 */

// ── Helper: Aktif Ders Oturumu Bul ──────────────────────────

/**
 * findActiveSessionForLocation
 * Belirtilen sınıf koduna (deviceLocation) ve şu anki saate göre
 * aktif ders oturumunu bulur.
 *
 * Mantık: startTime <= şu an <= endTime && classroom.code === deviceLocation
 */
async function findActiveSessionForLocation(deviceLocation: string, currentTime?: Date) {
  const now = currentTime || new Date();

  // Sınıfı bul
  const classroom = await prisma.classroom.findUnique({
    where: { code: deviceLocation },
  });

  if (!classroom) {
    return null;
  }

  // O sınıfta, şu an aktif olan ders oturumunu bul
  const session: any = await prisma.lessonSession.findFirst({
    where: {
      classroomId: classroom.id,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      course: true,
      classroom: true,
    },
  });

  return session;
}

// ── 3.1 + 3.2 + 3.3 + 3.6: RFID Kart Okutma ──────────────

/**
 * POST /api/v1/attendance/scan
 * IoT cihazdan gelen kart okutma isteği
 * Body: { cardUid: string, deviceLocation: string }
 * Auth: x-api-key (IoT cihaz)
 */
export const scanCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardUid, deviceLocation } = req.body;

    if (!cardUid || !deviceLocation) {
      throw new AppError('cardUid ve deviceLocation zorunludur.', 400);
    }

    // 1. ADIM: Kartı bul
    const rfidCard: any = await prisma.rfidCard.findUnique({
      where: { uid: cardUid },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, id: true },
            },
          },
        },
      },
    });

    if (!rfidCard) {
      logger.warn({ cardUid, deviceLocation }, 'Kayıtsız kart okutuldu');
      throw new AppError('Kayıtsız Kart! Sistem tarafından tanınmayan kart.', 404);
    }

    // 2. ADIM: Kart durumu kontrol (3.6 — Kayıp/İptal kart)
    if (rfidCard.status === 'LOST' || rfidCard.status === 'REVOKED') {
      // Uyarı bildirimi oluştur
      await prisma.notification.create({
        data: {
          type: 'LOST_CARD',
          title: 'İptal Edilmiş Kart Okutuldu!',
          message: `${rfidCard.student.user.firstName} ${rfidCard.student.user.lastName} adlı öğrencinin ${rfidCard.status === 'LOST' ? 'kayıp' : 'iptal edilmiş'} kartı (${cardUid}) ${deviceLocation} lokasyonunda okutuldu. Güvenlik ihlali olabilir!`,
          studentProfileId: rfidCard.studentId,
        },
      });

      logger.warn(
        { cardUid, status: rfidCard.status, studentId: rfidCard.studentId, deviceLocation },
        'Kayıp/İptal kart okutma denemesi — Bildirim oluşturuldu'
      );

      throw new AppError(
        `İptal Edilmiş Kart! Bu kart "${rfidCard.status === 'LOST' ? 'Kayıp' : 'İptal'}" durumunda. Lütfen Koordinatöre başvurun.`,
        403
      );
    }

    // 3. ADIM: Aktif ders oturumu bul (3.3)
    const currentSession = await findActiveSessionForLocation(deviceLocation);

    if (!currentSession) {
      throw new AppError('Şu an bu sınıfta aktif bir ders bulunmuyor.', 400);
    }

    // 4. ADIM: Öğrenci bu derse kayıtlı mı kontrol et
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: rfidCard.studentId,
          courseId: currentSession.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError(
        `Bu öğrenci "${currentSession.course.name}" dersine kayıtlı değil.`,
        400
      );
    }

    // 5. ADIM: Anti-Passback kontrolü (3.2)
    // @@unique([sessionId, studentId]) şema seviyesinde mevcut
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: currentSession.id,
          studentId: rfidCard.studentId,
        },
      },
    });

    if (existingAttendance) {
      logger.info(
        { cardUid, sessionId: currentSession.id, studentId: rfidCard.studentId },
        'Anti-Passback: Zaten yoklama alınmış'
      );
      res.status(200).json({
        success: true,
        message: 'Zaten Yoklama Alındı',
        data: {
          studentName: `${rfidCard.student.user.firstName} ${rfidCard.student.user.lastName}`,
          courseName: currentSession.course.name,
          status: existingAttendance.status,
          alreadyRecorded: true,
        },
      });
      return;
    }

    // 6. ADIM: Yoklama kaydı oluştur
    const attendance = await prisma.attendance.create({
      data: {
        sessionId: currentSession.id,
        studentId: rfidCard.studentId,
        status: 'PRESENT',
        method: 'RFID',
      },
    });

    logger.info(
      {
        attendanceId: attendance.id,
        studentName: `${rfidCard.student.user.firstName} ${rfidCard.student.user.lastName}`,
        course: currentSession.course.name,
        classroom: deviceLocation,
      },
      'Yoklama başarılı — RFID'
    );

    res.status(201).json({
      success: true,
      message: 'Yoklama Başarılı ✅',
      data: {
        attendanceId: attendance.id,
        studentName: `${rfidCard.student.user.firstName} ${rfidCard.student.user.lastName}`,
        courseName: currentSession.course.name,
        classroom: currentSession.classroom.name,
        status: 'PRESENT',
        method: 'RFID',
        timestamp: attendance.timestamp,
        alreadyRecorded: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 3.7: Manuel Yoklama ─────────────────────────────────────

/**
 * POST /api/v1/attendance/manual
 * Koordinatörün elle yoklama yapması
 * Body: { sessionId: string, studentId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED' }
 * Auth: ADMIN
 */
export const manualAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, studentId, status } = req.body;

    if (!sessionId || !studentId || !status) {
      throw new AppError('sessionId, studentId ve status zorunludur.', 400);
    }

    // Status doğrulama
    const validStatuses = ['PRESENT', 'ABSENT', 'EXCUSED'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Geçersiz yoklama durumu. Geçerli değerler: ${validStatuses.join(', ')}`, 400);
    }

    // Ders oturumu var mı kontrol et
    const session: any = await prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { course: true },
    });

    if (!session) {
      throw new AppError('Ders oturumu bulunamadı.', 404);
    }

    // Öğrenci profili var mı kontrol et
    const studentProfile: any = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, id: true } },
      },
    });

    if (!studentProfile) {
      throw new AppError('Öğrenci profili bulunamadı.', 404);
    }

    // Upsert: Varsa güncelle, yoksa oluştur
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: session.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError(
        `"${studentProfile.user.firstName} ${studentProfile.user.lastName}" bu derse kayÄ±tlÄ± deÄŸil.`,
        400
      );
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
      update: {
        status,
        method: 'MANUAL',
        timestamp: new Date(),
      },
      create: {
        sessionId,
        studentId,
        status,
        method: 'MANUAL',
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'MANUAL_ATTENDANCE',
          entity: 'Attendance',
          entityId: attendance.id,
          details: JSON.stringify({
            sessionId,
            studentId,
            studentName: `${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
            status,
            courseName: session.course.name,
          }),
        },
      });
    }

    logger.info(
      {
        attendanceId: attendance.id,
        studentName: `${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
        status,
        method: 'MANUAL',
        userId: req.user?.userId,
      },
      'Manuel yoklama kaydedildi'
    );

    res.status(200).json({
      success: true,
      message: `Yoklama güncellendi: ${studentProfile.user.firstName} ${studentProfile.user.lastName} → ${status}`,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// ── 3.8: Ders Seansı Yoklama Listesi ────────────────────────

/**
 * GET /api/v1/attendance/session/:id
 * Belirli bir ders seansının yoklama listesi
 * Auth: ADMIN
 */
export const getSessionAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Ders oturumunu bul
    const session: any = await prisma.lessonSession.findUnique({
      where: { id: id as string },
      include: {
        course: true,
        classroom: true,
      },
    });

    if (!session) {
      throw new AppError('Ders oturumu bulunamadı.', 404);
    }

    // Bu derse kayıtlı tüm öğrencileri getir
    const enrollments: any[] = await prisma.enrollment.findMany({
      where: { courseId: session.courseId },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
            rfidCards: {
              where: { status: 'ACTIVE' },
              select: { uid: true },
            },
          },
        },
      },
    });

    // Yoklama kayıtlarını getir
    const attendances = await prisma.attendance.findMany({
      where: { sessionId: id as string },
    });

    // Yoklama map'i oluştur (studentId → attendance)
    const attendanceMap = new Map(
      attendances.map((a) => [a.studentId, a])
    );

    // Öğrenci listesini yoklama durumuyla birleştir
    const attendanceList = enrollments.map((enrollment) => {
      const attendance = attendanceMap.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        firstName: enrollment.student.user.firstName,
        lastName: enrollment.student.user.lastName,

        activeCard: enrollment.student.rfidCards[0]?.uid || null,
        status: attendance?.status || 'ABSENT',
        method: attendance?.method || null,
        timestamp: attendance?.timestamp || null,
        attendanceId: attendance?.id || null,
      };
    });

    // İstatistikler
    const stats = {
      total: attendanceList.length,
      present: attendanceList.filter((a) => a.status === 'PRESENT').length,
      absent: attendanceList.filter((a) => a.status === 'ABSENT').length,
      excused: attendanceList.filter((a) => a.status === 'EXCUSED').length,
    };

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          courseName: session.course.name,
          classroom: session.classroom.name,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          weekNumber: session.weekNumber,
        },
        stats,
        attendanceList,
      },
    });
  } catch (error) {
    next(error);
  }
};
