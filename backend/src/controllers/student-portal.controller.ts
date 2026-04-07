import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Student Portal Controller — Öğrenci'nin kendi verileri
 * Görev 6.6: Öğrencinin kayıtlı dersleri, materyalleri ve devamsızlık özeti
 * KVKK: Sadece kendi verilerini görebilir
 */

// ── Öğrencinin Dersleri & Materyalleri ──────────────────────

/**
 * GET /api/v1/student/my-courses
 * Giriş yapmış öğrencinin kayıtlı dersleri + her ders için materyal listesi
 * Auth: STUDENT
 */
export const getMyCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.profileId) {
      throw new AppError('Öğrenci profili bulunamadı.', 403);
    }

    const profileId = req.user.profileId;

    // Öğrencinin kayıtlı olduğu dersleri getir
    const enrollments: any[] = await prisma.enrollment.findMany({
      where: { studentId: profileId },
      include: {
        course: {
          include: {
            materials: {
              orderBy: { uploadedAt: 'desc' },
              select: {
                id: true,
                title: true,
                type: true,
                url: true,
                fileSize: true,
                uploadedAt: true,
              },
            },
          },
        },
      },
    });

    const courses = enrollments.map((e) => ({
      courseId: e.course.id,
      courseName: e.course.name,
      term: e.course.term,
      isActive: e.course.isActive,
      enrolledAt: e.enrolledAt,
      materials: e.course.materials.map((m: any) => ({
        ...m,
        // Link ve Video için doğrudan URL göster, PDF için download endpoint'i
        downloadUrl: m.type === 'PDF' ? `/api/v1/materials/${m.id}/download` : m.url,
      })),
      materialCount: e.course.materials.length,
    }));

    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};

// ── Öğrencinin Devamsızlık Özeti ────────────────────────────

/**
 * GET /api/v1/student/my-attendance
 * Giriş yapmış öğrencinin ders bazlı devamsızlık özeti
 * Auth: STUDENT
 */
export const getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.profileId) {
      throw new AppError('Öğrenci profili bulunamadı.', 403);
    }

    const profileId = req.user.profileId;

    // Kayıtlı dersleri getir
    const enrollments: any[] = await prisma.enrollment.findMany({
      where: { studentId: profileId },
      include: {
        course: {
          include: {
            sessions: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Her ders için yoklama istatistiklerini hesapla
    const courseAttendance = await Promise.all(
      enrollments.map(async (e) => {
        const totalSessions = e.course.sessions.length;

        // Bu öğrencinin bu dersteki yoklama kayıtları
        const attendances = await prisma.attendance.findMany({
          where: {
            studentId: profileId,
            sessionId: { in: e.course.sessions.map((s: any) => s.id) },
          },
        });

        const present = attendances.filter((a) => a.status === 'PRESENT').length;
        const excused = attendances.filter((a) => a.status === 'EXCUSED').length;
        const absent = totalSessions - present - excused;
        const attendanceRate = totalSessions > 0
          ? Math.round(((present + excused) / totalSessions) * 100)
          : 0;

        return {
          courseId: e.course.id,
          courseName: e.course.name,
          term: e.course.term,
          totalSessions,
          present,
          excused,
          absent,
          attendanceRate,
          status: attendanceRate >= 70 ? 'PASSING' : 'AT_RISK',
        };
      })
    );

    res.json({
      success: true,
      data: { courseAttendance },
    });
  } catch (error) {
    next(error);
  }
};
