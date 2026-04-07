import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Report Controller — Raporlama
 * Görev 5.5: Dönem sonu Geçti/Kaldı otomatik hesaplama (%70 katılım kuralı)
 * Görev 5.6: Geçti/Kaldı raporu endpoint'i
 */

// Sabit katılım oranı eşiği
const PASS_THRESHOLD = 70; // %70

// ── 5.5 + 5.6: Geçti/Kaldı Raporu ──────────────────────────

/**
 * GET /api/v1/reports/pass-fail
 * Geçti/Kaldı raporu
 * Query: courseId (zorunlu), term (opsiyonel)
 * Auth: ADMIN
 */
export const getPassFailReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string;
    const term = req.query.term as string | undefined;

    if (!courseId) {
      throw new AppError('courseId zorunludur.', 400);
    }

    // Ders var mı?
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    // Term filtresi (opsiyonel, varsayılan olarak dersin term'i)
    const effectiveTerm = term || course.term;

    // Bu dersteki toplam oturum sayısı
    const totalSessions = await prisma.lessonSession.count({
      where: { courseId },
    });

    if (totalSessions === 0) {
      res.json({
        success: true,
        data: {
          course: { id: course.id, name: course.name, term: effectiveTerm },
          totalSessions: 0,
          passThreshold: PASS_THRESHOLD,
          report: [],
          summary: { totalStudents: 0, passed: 0, failed: 0 },
        },
      });
      return;
    }

    // Tüm session ID'lerini al
    const sessions = await prisma.lessonSession.findMany({
      where: { courseId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    // Bu derse kayıtlı tüm öğrencileri getir
    const enrollments: any[] = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Her öğrenci için yoklama istatistiklerini hesapla
    const report = await Promise.all(
      enrollments.map(async (enrollment) => {
        const attendances = await prisma.attendance.findMany({
          where: {
            studentId: enrollment.studentId,
            sessionId: { in: sessionIds },
          },
        });

        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const excused = attendances.filter((a) => a.status === 'EXCUSED').length;
        const absent = totalSessions - present - excused;
        const attendedCount = present + excused; // İzinli de katılım sayılır
        const attendanceRate = Math.round((attendedCount / totalSessions) * 100);
        const passed = attendanceRate >= PASS_THRESHOLD;

        return {
          studentId: enrollment.studentId,
          firstName: enrollment.student.user.firstName,
          lastName: enrollment.student.user.lastName,
          totalSessions,
          present,
          excused,
          absent,
          attendedCount,
          attendanceRate,
          result: passed ? 'PASSED' : 'FAILED',
        };
      })
    );

    // Sonuçları sırala: önce kaldı, sonra isme göre
    report.sort((a, b) => {
      if (a.result !== b.result) return a.result === 'FAILED' ? -1 : 1;
      return a.lastName.localeCompare(b.lastName, 'tr');
    });

    const passed = report.filter((r) => r.result === 'PASSED').length;
    const failed = report.filter((r) => r.result === 'FAILED').length;

    res.json({
      success: true,
      data: {
        course: { id: course.id, name: course.name, term: effectiveTerm },
        totalSessions,
        passThreshold: PASS_THRESHOLD,
        report,
        summary: {
          totalStudents: report.length,
          passed,
          failed,
          passRate: report.length > 0 ? Math.round((passed / report.length) * 100) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Yoklama Özet Raporu ─────────────────────────────────────

/**
 * GET /api/v1/reports/attendance-summary
 * Ders bazlı yoklama özet raporu (haftalık trend, ortalama katılım)
 * Query: courseId (zorunlu)
 * Auth: ADMIN
 */
export const getAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string;

    if (!courseId) {
      throw new AppError('courseId zorunludur.', 400);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    // Tüm oturumları hafta numarasına göre getir
    const sessions: any[] = await prisma.lessonSession.findMany({
      where: { courseId },
      include: {
        classroom: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { weekNumber: 'asc' },
    });

    // Kayıtlı öğrenci sayısı
    const enrollmentCount = await prisma.enrollment.count({
      where: { courseId },
    });

    // Haftalık trend
    const weeklyTrend = await Promise.all(
      sessions.map(async (session) => {
        const presentCount = await prisma.attendance.count({
          where: { sessionId: session.id, status: 'PRESENT' },
        });
        const excusedCount = await prisma.attendance.count({
          where: { sessionId: session.id, status: 'EXCUSED' },
        });

        return {
          weekNumber: session.weekNumber,
          sessionDate: session.sessionDate,
          classroom: session.classroom.name,
          totalEnrolled: enrollmentCount,
          present: presentCount,
          excused: excusedCount,
          absent: enrollmentCount - presentCount - excusedCount,
          attendanceRate: enrollmentCount > 0
            ? Math.round((presentCount / enrollmentCount) * 100)
            : 0,
        };
      })
    );

    // Genel ortalama
    const totalAttendanceRate = weeklyTrend.length > 0
      ? Math.round(weeklyTrend.reduce((sum, w) => sum + w.attendanceRate, 0) / weeklyTrend.length)
      : 0;

    res.json({
      success: true,
      data: {
        course: { id: course.id, name: course.name, term: course.term },
        enrollmentCount,
        totalSessions: sessions.length,
        averageAttendanceRate: totalAttendanceRate,
        weeklyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};
