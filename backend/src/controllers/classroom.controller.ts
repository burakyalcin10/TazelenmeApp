import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Classroom Controller — Sınıf / lokasyon yönetimi
 */

export const createClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, capacity } = req.body;

    if (!name || !code) {
      throw new AppError('name ve code zorunludur.', 400);
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await prisma.classroom.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new AppError('Bu sınıf kodu zaten kullanımda.', 409);
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: String(name).trim(),
        code: normalizedCode,
        capacity: capacity !== undefined && capacity !== null ? parseInt(String(capacity), 10) : null,
      },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'CREATE_CLASSROOM',
          entity: 'Classroom',
          entityId: classroom.id,
          details: JSON.stringify({
            name: classroom.name,
            code: classroom.code,
            capacity: classroom.capacity,
          }),
        },
      });
    }

    logger.info({ classroomId: classroom.id, code: classroom.code }, 'Yeni sınıf oluşturuldu');

    res.status(201).json({
      success: true,
      message: `Sınıf oluşturuldu: ${classroom.name}`,
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassrooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const code = req.query.code as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase() } },
      ];
    }

    if (code) {
      where.code = code.toUpperCase();
    }

    const [classrooms, total] = await Promise.all([
      prisma.classroom.findMany({
        where,
        include: {
          _count: {
            select: { sessions: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.classroom.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        classrooms: classrooms.map((classroom) => ({
          ...classroom,
          sessionCount: classroom._count.sessions,
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

export const getClassroomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id: id as string },
      include: {
        sessions: {
          include: {
            course: {
              select: { id: true, name: true, term: true },
            },
          },
          orderBy: [{ sessionDate: 'desc' }, { startTime: 'desc' }],
          take: 20,
        },
      },
    });

    if (!classroom) {
      throw new AppError('Sınıf bulunamadı.', 404);
    }

    res.json({
      success: true,
      data: {
        classroom: {
          id: classroom.id,
          name: classroom.name,
          code: classroom.code,
          capacity: classroom.capacity,
        },
        recentSessions: classroom.sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, capacity } = req.body;

    const existing = await prisma.classroom.findUnique({
      where: { id: id as string },
    });

    if (!existing) {
      throw new AppError('Sınıf bulunamadı.', 404);
    }

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = String(name).trim();
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      const duplicate = await prisma.classroom.findFirst({
        where: {
          code: normalizedCode,
          id: { not: id as string },
        },
      });

      if (duplicate) {
        throw new AppError('Bu sınıf kodu zaten kullanımda.', 409);
      }

      updateData.code = normalizedCode;
    }

    if (capacity !== undefined) {
      updateData.capacity = capacity === null ? null : parseInt(String(capacity), 10);
    }

    const classroom = await prisma.classroom.update({
      where: { id: id as string },
      data: updateData,
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPDATE_CLASSROOM',
          entity: 'Classroom',
          entityId: classroom.id,
          details: JSON.stringify({
            updatedFields: Object.keys(updateData),
          }),
        },
      });
    }

    logger.info({ classroomId: classroom.id, updatedFields: Object.keys(updateData) }, 'Sınıf güncellendi');

    res.json({
      success: true,
      message: `Sınıf güncellendi: ${classroom.name}`,
      data: classroom,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id: id as string },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!classroom) {
      throw new AppError('Sınıf bulunamadı.', 404);
    }

    if (classroom._count.sessions > 0) {
      throw new AppError(
        `Bu sınıfa bağlı ${classroom._count.sessions} oturum var. Önce oturumları kaldırmadan sınıf silinemez.`,
        400
      );
    }

    await prisma.classroom.delete({
      where: { id: id as string },
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_CLASSROOM',
          entity: 'Classroom',
          entityId: id as string,
          details: JSON.stringify({
            name: classroom.name,
            code: classroom.code,
          }),
        },
      });
    }

    logger.info({ classroomId: id, code: classroom.code }, 'Sınıf silindi');

    res.json({
      success: true,
      message: `Sınıf silindi: ${classroom.name}`,
    });
  } catch (error) {
    next(error);
  }
};
