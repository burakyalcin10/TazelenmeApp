import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Session Controller — Ders Oturumu Yönetimi
 * Görev 6.3: Ders oturumu CRUD + toplu oturum üretimi
 */

// ── Oturum Oluşturma ────────────────────────────────────────

/**
 * POST /api/v1/sessions
 * Yeni ders oturumu oluştur
 * Body: { courseId, classroomId, sessionDate, startTime, endTime, weekNumber }
 * Auth: ADMIN
 */
export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, classroomId, sessionDate, startTime, endTime, weekNumber } = req.body;

    if (!courseId || !classroomId || !sessionDate || !startTime || !endTime || weekNumber === undefined) {
      throw new AppError('courseId, classroomId, sessionDate, startTime, endTime ve weekNumber zorunludur.', 400);
    }

    // Ders var mı?
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    // Sınıf var mı?
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) {
      throw new AppError('Sınıf bulunamadı.', 404);
    }

    // Çakışma kontrolü — aynı sınıfta aynı zaman diliminde başka oturum var mı?
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);

    const conflicting = await prisma.lessonSession.findFirst({
      where: {
        classroomId,
        OR: [
          {
            startTime: { lte: startTimeDate },
            endTime: { gt: startTimeDate },
          },
          {
            startTime: { lt: endTimeDate },
            endTime: { gte: endTimeDate },
          },
          {
            startTime: { gte: startTimeDate },
            endTime: { lte: endTimeDate },
          },
        ],
      },
      include: { course: { select: { name: true } } },
    });

    if (conflicting) {
      throw new AppError(
        `Çakışma! ${classroom.name} sınıfında bu saatlerde "${(conflicting as any).course.name}" dersi zaten planlanmış.`,
        409
      );
    }

    const session = await prisma.lessonSession.create({
      data: {
        courseId,
        classroomId,
        sessionDate: new Date(sessionDate),
        startTime: startTimeDate,
        endTime: endTimeDate,
        weekNumber: parseInt(weekNumber, 10),
      },
      include: {
        course: { select: { name: true } },
        classroom: { select: { name: true } },
      },
    });

    logger.info(
      { sessionId: session.id, course: (session as any).course.name, classroom: (session as any).classroom.name },
      'Yeni ders oturumu oluşturuldu'
    );

    res.status(201).json({
      success: true,
      message: 'Ders oturumu oluşturuldu.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// ── Toplu Oturum Üretimi ────────────────────────────────────

/**
 * POST /api/v1/sessions/generate
 * Bir ders için haftalık tekrarlı oturumları toplu oluştur
 * Body: {
 *   courseId, classroomId,
 *   dayOfWeek: 0-6 (Pazar-Cumartesi),
 *   startTime: "09:00", endTime: "11:00",
 *   semesterStart: "2025-03-03", semesterEnd: "2025-06-13"
 * }
 * Auth: ADMIN
 */
export const generateSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, classroomId, dayOfWeek, startTime, endTime, semesterStart, semesterEnd } = req.body;

    if (!courseId || !classroomId || dayOfWeek === undefined || !startTime || !endTime || !semesterStart || !semesterEnd) {
      throw new AppError('courseId, classroomId, dayOfWeek, startTime, endTime, semesterStart ve semesterEnd zorunludur.', 400);
    }

    // Ders & Sınıf kontrolü
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Ders bulunamadı.', 404);

    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) throw new AppError('Sınıf bulunamadı.', 404);

    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);
    const targetDay = parseInt(dayOfWeek, 10); // 0=Pazar, 1=Pazartesi, ...

    if (targetDay < 0 || targetDay > 6) {
      throw new AppError('dayOfWeek 0-6 arası olmalıdır (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi).', 400);
    }

    // İlk hedef günü bul
    const currentDate = new Date(start);
    while (currentDate.getDay() !== targetDay) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const createdSessions = [];
    const conflicts = [];
    let weekNumber = 1;

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const sessionStartTime = new Date(`${dateStr}T${startTime}:00`);
      const sessionEndTime = new Date(`${dateStr}T${endTime}:00`);

      // Çakışma kontrolü
      const conflicting = await prisma.lessonSession.findFirst({
        where: {
          classroomId,
          OR: [
            { startTime: { lte: sessionStartTime }, endTime: { gt: sessionStartTime } },
            { startTime: { lt: sessionEndTime }, endTime: { gte: sessionEndTime } },
            { startTime: { gte: sessionStartTime }, endTime: { lte: sessionEndTime } },
          ],
        },
      });

      if (conflicting) {
        conflicts.push({ date: dateStr, weekNumber, reason: 'Çakışma var' });
      } else {
        const session = await prisma.lessonSession.create({
          data: {
            courseId,
            classroomId,
            sessionDate: new Date(dateStr),
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            weekNumber,
          },
        });
        createdSessions.push(session);
      }

      weekNumber++;
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'GENERATE_SESSIONS',
          entity: 'LessonSession',
          details: JSON.stringify({
            courseId,
            courseName: course.name,
            classroomName: classroom.name,
            totalCreated: createdSessions.length,
            conflicts: conflicts.length,
          }),
        },
      });
    }

    logger.info(
      {
        courseId,
        courseName: course.name,
        totalCreated: createdSessions.length,
        conflicts: conflicts.length,
      },
      'Toplu oturum üretimi tamamlandı'
    );

    res.status(201).json({
      success: true,
      message: `${createdSessions.length} oturum oluşturuldu${conflicts.length > 0 ? `, ${conflicts.length} çakışma atlandı` : ''}.`,
      data: {
        created: createdSessions,
        conflicts,
        summary: {
          totalCreated: createdSessions.length,
          totalConflicts: conflicts.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Oturum Listesi ──────────────────────────────────────────

/**
 * GET /api/v1/sessions
 * Oturum listesi (filtreleme + pagination)
 * Query: courseId, classroomId, startDate, endDate, page, limit
 * Auth: ADMIN
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const classroomId = req.query.classroomId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (classroomId) where.classroomId = classroomId;

    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }

    const [sessions, total] = await Promise.all([
      prisma.lessonSession.findMany({
        where,
        include: {
          course: { select: { id: true, name: true, term: true } },
          classroom: { select: { id: true, name: true, code: true } },
          _count: { select: { attendances: true } },
        },
        orderBy: { sessionDate: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.lessonSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          ...s,
          attendanceCount: s._count.attendances,
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

// ── Oturum Detay ────────────────────────────────────────────

/**
 * GET /api/v1/sessions/:id
 * Oturum detay
 * Auth: ADMIN
 */
export const getSessionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.lessonSession.findUnique({
      where: { id: id as string },
      include: {
        course: true,
        classroom: true,
        _count: { select: { attendances: true } },
      },
    });

    if (!session) {
      throw new AppError('Ders oturumu bulunamadı.', 404);
    }

    res.json({
      success: true,
      data: {
        ...session,
        attendanceCount: session._count.attendances,
        _count: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Oturum Güncelleme ───────────────────────────────────────

/**
 * PUT /api/v1/sessions/:id
 * Oturum güncelle
 * Auth: ADMIN
 */
export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { classroomId, sessionDate, startTime, endTime, weekNumber } = req.body;

    const existing = await prisma.lessonSession.findUnique({
      where: { id: id as string },
    });

    if (!existing) {
      throw new AppError('Ders oturumu bulunamadı.', 404);
    }

    const updateData: any = {};
    if (classroomId) updateData.classroomId = classroomId;
    if (sessionDate) updateData.sessionDate = new Date(sessionDate);
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (weekNumber !== undefined) updateData.weekNumber = parseInt(weekNumber, 10);

    const updated = await prisma.lessonSession.update({
      where: { id: id as string },
      data: updateData,
      include: {
        course: { select: { name: true } },
        classroom: { select: { name: true } },
      },
    });

    logger.info({ sessionId: id }, 'Ders oturumu güncellendi');

    res.json({
      success: true,
      message: 'Ders oturumu güncellendi.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ── Oturum Silme ────────────────────────────────────────────

/**
 * DELETE /api/v1/sessions/:id
 * Oturum sil
 * Auth: ADMIN
 */
export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const session = await prisma.lessonSession.findUnique({
      where: { id: id as string },
      include: { _count: { select: { attendances: true } } },
    });

    if (!session) {
      throw new AppError('Ders oturumu bulunamadı.', 404);
    }

    // Yoklama kaydı varsa uyarı ver
    if (session._count.attendances > 0) {
      throw new AppError(
        `Bu oturumda ${session._count.attendances} yoklama kaydı var. Yoklama kayıtlı oturum silinemez.`,
        400
      );
    }

    await prisma.lessonSession.delete({
      where: { id: id as string },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_SESSION',
          entity: 'LessonSession',
          entityId: id as string,
        },
      });
    }

    logger.info({ sessionId: id }, 'Ders oturumu silindi');

    res.json({
      success: true,
      message: 'Ders oturumu silindi.',
    });
  } catch (error) {
    next(error);
  }
};
