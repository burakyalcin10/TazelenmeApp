import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export const getMyCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.profileId) {
      throw new AppError('Öğrenci profili bulunamadı.', 403);
    }

    const profileId = req.user.profileId;
    const materialSelect = {
      id: true,
      title: true,
      type: true,
      url: true,
      fileSize: true,
      uploadedAt: true,
    };

    const enrollments: any[] = await prisma.enrollment.findMany({
      where: { studentId: profileId },
      include: {
        course: {
          include: {
            materials: {
              orderBy: { uploadedAt: 'desc' },
              select: materialSelect,
            },
          },
        },
      },
    });

    const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));
    const publicMaterialCourses: any[] = await prisma.course.findMany({
      where: {
        isActive: true,
        id: { notIn: Array.from(enrolledCourseIds) },
        materials: { some: {} },
      },
      include: {
        materials: {
          orderBy: { uploadedAt: 'desc' },
          select: materialSelect,
        },
      },
      orderBy: { name: 'asc' },
    });

    const toMaterial = (m: any) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      url: m.type === 'PDF' ? null : m.url,
      fileSize: m.fileSize,
      uploadedAt: m.uploadedAt,
      downloadUrl: m.type === 'PDF' ? `/api/v1/materials/${m.id}/download` : m.url,
    });

    const enrolledCourses = enrollments.map((e) => ({
      courseId: e.course.id,
      courseName: e.course.name,
      term: e.course.term,
      isActive: e.course.isActive,
      isEnrolled: true,
      enrolledAt: e.enrolledAt,
      materials: e.course.materials.map(toMaterial),
      materialCount: e.course.materials.length,
    }));

    const publicCourses = publicMaterialCourses.map((course) => ({
      courseId: course.id,
      courseName: course.name,
      term: course.term,
      isActive: course.isActive,
      isEnrolled: false,
      enrolledAt: null,
      materials: course.materials.map(toMaterial),
      materialCount: course.materials.length,
    }));

    const courses = [...enrolledCourses, ...publicCourses].sort((a, b) =>
      a.courseName.localeCompare(b.courseName, 'tr')
    );

    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.profileId) {
      throw new AppError('Öğrenci profili bulunamadı.', 403);
    }

    const profileId = req.user.profileId;

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

    const courseAttendance = await Promise.all(
      enrollments.map(async (e) => {
        const totalSessions = e.course.sessions.length;
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
