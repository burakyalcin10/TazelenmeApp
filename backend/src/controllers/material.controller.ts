import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Material Controller — Ders Materyali Yönetimi (Mini-LMS)
 * Görev 6.4, 6.5: PDF/Link upload, materyal listeleme, indirme
 */

// Upload dizini
const UPLOAD_BASE = path.join(__dirname, '..', '..', 'uploads', 'materials');

// ── Materyal Yükleme ────────────────────────────────────────

/**
 * POST /api/v1/materials
 * Materyal yükle (PDF dosya veya Link URL)
 * Body (multipart): courseId, title, type ('PDF'|'LINK'|'VIDEO'), file? (PDF ise)
 * Auth: ADMIN
 */
export const uploadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, title, type, url } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!courseId || !title || !type) {
      throw new AppError('courseId, title ve type zorunludur.', 400);
    }

    // Geçerli type kontrolü
    const validTypes = ['PDF', 'LINK', 'VIDEO'];
    if (!validTypes.includes(type)) {
      throw new AppError(`Geçersiz materyal türü. Geçerli: ${validTypes.join(', ')}`, 400);
    }

    // Ders var mı?
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Ders bulunamadı.', 404);
    }

    let materialUrl: string;
    let fileSize: number | null = null;

    if (type === 'PDF') {
      if (!file) {
        throw new AppError('PDF türünde dosya yüklemesi zorunludur.', 400);
      }
      // Dosya multer tarafından disk'e kaydedildi
      materialUrl = `/uploads/materials/${courseId}/${file.filename}`;
      fileSize = file.size;
    } else {
      // LINK veya VIDEO — URL zorunlu
      if (!url) {
        throw new AppError('LINK veya VIDEO türünde URL zorunludur.', 400);
      }
      materialUrl = url;
    }

    const material = await prisma.courseMaterial.create({
      data: {
        courseId,
        title,
        url: materialUrl,
        type,
        fileSize,
      },
      include: {
        course: { select: { name: true } },
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPLOAD_MATERIAL',
          entity: 'CourseMaterial',
          entityId: material.id,
          details: JSON.stringify({
            title,
            type,
            courseName: course.name,
            fileSize,
          }),
        },
      });
    }

    logger.info(
      { materialId: material.id, title, type, courseId },
      'Materyal yüklendi'
    );

    res.status(201).json({
      success: true,
      message: `Materyal yüklendi: ${title}`,
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ── Materyal Listesi ────────────────────────────────────────

/**
 * GET /api/v1/materials
 * Materyal listesi (filtreleme: courseId, type)
 * Auth: ADMIN
 */
export const getMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;
    const type = req.query.type as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (type && ['PDF', 'LINK', 'VIDEO'].includes(type)) where.type = type;

    const [materials, total] = await Promise.all([
      prisma.courseMaterial.findMany({
        where,
        include: {
          course: { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.courseMaterial.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        materials,
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

// ── Materyal Detay ──────────────────────────────────────────

/**
 * GET /api/v1/materials/:id
 * Materyal detay
 * Auth: ADMIN
 */
export const getMaterialById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const material = await prisma.courseMaterial.findUnique({
      where: { id: id as string },
      include: {
        course: { select: { id: true, name: true, term: true } },
      },
    });

    if (!material) {
      throw new AppError('Materyal bulunamadı.', 404);
    }

    res.json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// ── Materyal Silme ──────────────────────────────────────────

/**
 * DELETE /api/v1/materials/:id
 * Materyali sil (PDF ise dosyayı da sil)
 * Auth: ADMIN
 */
export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const material = await prisma.courseMaterial.findUnique({
      where: { id: id as string },
    });

    if (!material) {
      throw new AppError('Materyal bulunamadı.', 404);
    }

    // PDF ise dosyayı disk'ten sil
    if (material.type === 'PDF' && material.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', '..', material.url);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info({ filePath }, 'PDF dosyası silindi');
        }
      } catch (fsError) {
        logger.warn({ filePath, error: fsError }, 'PDF dosyası silinemedi');
      }
    }

    await prisma.courseMaterial.delete({
      where: { id: id as string },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_MATERIAL',
          entity: 'CourseMaterial',
          entityId: id as string,
          details: JSON.stringify({ title: material.title, type: material.type }),
        },
      });
    }

    logger.info({ materialId: id, title: material.title }, 'Materyal silindi');

    res.json({
      success: true,
      message: `Materyal silindi: ${material.title}`,
    });
  } catch (error) {
    next(error);
  }
};

// ── PDF İndirme ─────────────────────────────────────────────

/**
 * GET /api/v1/materials/:id/download
 * PDF dosyasını indir (stream response)
 * Auth: ADMIN veya STUDENT (kendi dersinin materyali ise)
 */
export const downloadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const material = await prisma.courseMaterial.findUnique({
      where: { id: id as string },
      include: { course: true },
    });

    if (!material) {
      throw new AppError('Materyal bulunamadı.', 404);
    }

    if (material.type !== 'PDF') {
      throw new AppError('Bu materyal indirilebilir bir dosya değil.', 400);
    }

    // Öğrenci ise kendi dersine kayıtlı mı kontrol et
    if (req.user?.role === 'STUDENT' && req.user.profileId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: req.user.profileId,
            courseId: material.courseId,
          },
        },
      });
      if (!enrollment) {
        throw new AppError('Bu materyale erişim yetkiniz yok.', 403);
      }
    }

    const filePath = path.join(__dirname, '..', '..', material.url);

    if (!fs.existsSync(filePath)) {
      throw new AppError('Dosya sunucuda bulunamadı.', 404);
    }

    const fileName = path.basename(material.url);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(material.title)}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
