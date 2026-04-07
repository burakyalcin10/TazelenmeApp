import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Course Controller — Ders Yönetimi (Mini-LMS)
 * Görev 6.1: Ders oluşturma, listeleme, detay, güncelleme, silme
 */

// ── Ders Oluşturma ──────────────────────────────────────────

/**
 * POST /api/v1/courses
 * Yeni ders oluştur
 * Body: { name: string, term: string, isActive?: boolean }
 * Auth: ADMIN
 */
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, term, isActive } = req.body;

    if (!name || !term) {
      throw new AppError('Ders adı ve dönem (term) zorunludur.', 400);
    }

    const course = await prisma.course.create({
      data: {
        name,
        term,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'CREATE_COURSE',
          entity: 'Course',
          entityId: course.id,
          details: JSON.stringify({ name, term }),
        },
      });
    }

    logger.info({ courseId: course.id, name, term }, 'Yeni ders oluşturuldu');

    res.status(201).json({
      success: true,
      message: `Ders oluşturuldu: ${name}`,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// ── Ders Listesi ────────────────────────────────────────────

/**
 * GET /api/v1/courses
 * Ders listesi (filtreleme + pagination)
 * Query: term, isActive, search, page, limit
 * Auth: ADMIN
 */
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const termParam = req.query.term as string | undefined;
    const isActiveParam = req.query.isActive as string | undefined;
    const search = req.query.search as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (termParam) {
      where.term = termParam;
    }

    if (isActiveParam === 'true') {
      where.isActive = true;
    } else if (isActiveParam === 'false') {
      where.isActive = false;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              materials: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        courses: courses.map((c) => ({
          ...c,
          enrollmentCount: c._count.enrollments,
          sessionCount: c._count.sessions,
          materialCount: c._count.materials,
          _count: undefined,
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

// ── Ders Detay ──────────────────────────────────────────────

/**
 * GET /api/v1/courses/:id
 * Ders detay (kayıtlı öğrenci sayısı, oturum, materyal ile)
 * Auth: ADMIN
 */
export const getCourseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: id as string },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
        sessions: {
          include: {
            classroom: { select: { id: true, name: true, code: true } },
          },
          orderBy: { sessionDate: 'asc' },
        },
        materials: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          name: course.name,
          term: course.term,
          isActive: course.isActive,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        },
        stats: {
          enrollmentCount: course.enrollments.length,
          sessionCount: course.sessions.length,
          materialCount: course.materials.length,
        },
        enrollments: course.enrollments.map((e: any) => ({
          id: e.id,
          studentId: e.studentId,
          firstName: e.student.user.firstName,
          lastName: e.student.user.lastName,
          enrolledAt: e.enrolledAt,
        })),
        sessions: course.sessions,
        materials: course.materials,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Ders Güncelleme ─────────────────────────────────────────

/**
 * PUT /api/v1/courses/:id
 * Ders güncelle
 * Body: { name?, term?, isActive? }
 * Auth: ADMIN
 */
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, term, isActive } = req.body;

    // Ders var mı?
    const existing = await prisma.course.findUnique({
      where: { id: id as string },
    });

    if (!existing) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (term !== undefined) updateData.term = term;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.course.update({
      where: { id: id as string },
      data: updateData,
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPDATE_COURSE',
          entity: 'Course',
          entityId: id as string,
          details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
        },
      });
    }

    logger.info({ courseId: id, updatedFields: Object.keys(updateData) }, 'Ders güncellendi');

    res.json({
      success: true,
      message: `Ders güncellendi: ${updated.name}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ── Ders Silme (Soft Delete) ────────────────────────────────

/**
 * DELETE /api/v1/courses/:id
 * Dersi pasif yap (isActive = false)
 * Auth: ADMIN
 */
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: id as string },
    });

    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    if (!course.isActive) {
      throw new AppError('Ders zaten pasif durumda.', 400);
    }

    await prisma.course.update({
      where: { id: id as string },
      data: { isActive: false },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_COURSE',
          entity: 'Course',
          entityId: id as string,
          details: JSON.stringify({ name: course.name, softDelete: true }),
        },
      });
    }

    logger.info({ courseId: id, name: course.name }, 'Ders pasif yapıldı (soft delete)');

    res.json({
      success: true,
      message: `Ders pasif yapıldı: ${course.name}`,
    });
  } catch (error) {
    next(error);
  }
};
