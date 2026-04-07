import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Enrollment Controller — Öğrenci-Ders Kaydı
 * Görev 6.2: Öğrenci-ders kaydı, toplu kayıt, listeleme, silme
 */

// ── Kayıt Oluşturma ────────────────────────────────────────

/**
 * POST /api/v1/enrollments
 * Öğrenciyi derse kaydet
 * Body: { studentId: string, courseId: string }
 * Auth: ADMIN
 */
export const createEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      throw new AppError('studentId ve courseId zorunludur.', 400);
    }

    // Öğrenci profili var mı?
    const profile: any = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!profile) {
      throw new AppError('Öğrenci profili bulunamadı.', 404);
    }

    // Ders var mı ve aktif mi?
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }
    if (!course.isActive) {
      throw new AppError('Bu ders aktif değil, kayıt yapılamaz.', 400);
    }

    // Zaten kayıtlı mı?
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing) {
      throw new AppError('Bu öğrenci bu derse zaten kayıtlı.', 409);
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId, courseId },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        course: { select: { name: true } },
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'CREATE_ENROLLMENT',
          entity: 'Enrollment',
          entityId: enrollment.id,
          details: JSON.stringify({
            studentName: `${profile.user.firstName} ${profile.user.lastName}`,
            courseName: course.name,
          }),
        },
      });
    }

    logger.info(
      { enrollmentId: enrollment.id, studentId, courseId },
      'Öğrenci derse kaydedildi'
    );

    res.status(201).json({
      success: true,
      message: `${profile.user.firstName} ${profile.user.lastName} → "${course.name}" dersine kaydedildi.`,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// ── Toplu Kayıt ─────────────────────────────────────────────

/**
 * POST /api/v1/enrollments/bulk
 * Bir derse birden fazla öğrenci kaydet
 * Body: { courseId: string, studentIds: string[] }
 * Auth: ADMIN
 */
export const bulkEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, studentIds } = req.body;

    if (!courseId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('courseId ve studentIds (dizi) zorunludur.', 400);
    }

    // Ders kontrolü
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Ders bulunamadı.', 404);
    if (!course.isActive) throw new AppError('Bu ders aktif değil.', 400);

    const results: { success: any[]; errors: any[] } = {
      success: [],
      errors: [],
    };

    for (const studentId of studentIds) {
      try {
        // Öğrenci var mı?
        const profile: any = await prisma.studentProfile.findUnique({
          where: { id: studentId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (!profile) {
          results.errors.push({ studentId, error: 'Öğrenci profili bulunamadı.' });
          continue;
        }

        // Zaten kayıtlı mı?
        const existing = await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId, courseId } },
        });

        if (existing) {
          results.errors.push({
            studentId,
            studentName: `${profile.user.firstName} ${profile.user.lastName}`,
            error: 'Zaten kayıtlı.',
          });
          continue;
        }

        const enrollment = await prisma.enrollment.create({
          data: { studentId, courseId },
        });

        results.success.push({
          enrollmentId: enrollment.id,
          studentId,
          studentName: `${profile.user.firstName} ${profile.user.lastName}`,
        });
      } catch (err: any) {
        results.errors.push({ studentId, error: err.message || 'Bilinmeyen hata' });
      }
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'BULK_ENROLLMENT',
          entity: 'Enrollment',
          details: JSON.stringify({
            courseId,
            courseName: course.name,
            successCount: results.success.length,
            errorCount: results.errors.length,
          }),
        },
      });
    }

    logger.info(
      { courseId, successCount: results.success.length, errorCount: results.errors.length },
      'Toplu ders kaydı tamamlandı'
    );

    res.status(200).json({
      success: true,
      message: `${results.success.length} öğrenci kaydedildi, ${results.errors.length} hata.`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// ── Kayıt Listesi ───────────────────────────────────────────

/**
 * GET /api/v1/enrollments
 * Kayıt listesi (filtreleme: courseId, studentId)
 * Auth: ADMIN
 */
export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '50';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (studentId) where.studentId = studentId;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          course: { select: { id: true, name: true, term: true, isActive: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.enrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        enrollments: enrollments.map((e: any) => ({
          id: e.id,
          studentId: e.studentId,
          studentName: `${e.student.user.firstName} ${e.student.user.lastName}`,
          courseId: e.courseId,
          courseName: e.course.name,
          term: e.course.term,
          enrolledAt: e.enrolledAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Kayıt Silme ─────────────────────────────────────────────

/**
 * DELETE /api/v1/enrollments/:id
 * Ders kaydını iptal et
 * Auth: ADMIN
 */
export const deleteEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const enrollment: any = await prisma.enrollment.findUnique({
      where: { id: id as string },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        course: { select: { name: true } },
      },
    });

    if (!enrollment) {
      throw new AppError('Kayıt bulunamadı.', 404);
    }

    await prisma.enrollment.delete({
      where: { id: id as string },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_ENROLLMENT',
          entity: 'Enrollment',
          entityId: id as string,
          details: JSON.stringify({
            studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
            courseName: enrollment.course.name,
          }),
        },
      });
    }

    logger.info({ enrollmentId: id }, 'Ders kaydı silindi');

    res.json({
      success: true,
      message: `Kayıt silindi: ${enrollment.student.user.firstName} ${enrollment.student.user.lastName} → "${enrollment.course.name}"`,
    });
  } catch (error) {
    next(error);
  }
};
