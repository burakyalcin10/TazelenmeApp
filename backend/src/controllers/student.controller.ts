import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { hashPin, generatePin } from '../utils/pin';
import { AppError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

/**
 * Student Controller — Öğrenci CRUD + CSV Import
 * Öğrenci oluşturma, listeleme, detay, güncelleme, soft delete, toplu import
 */

// ── 4.1: Öğrenci Oluşturma ─────────────────────────────────

/**
 * POST /api/v1/students
 * Yeni öğrenci oluştur (User + StudentProfile + otomatik PIN)
 * Body: {
 *   tcNo, firstName, lastName, phone?, email?,
 *   address?, emergencyContactName?, emergencyContactPhone?,
 *   healthConditions?: HealthCondition[], otherHealthNotes?: string
 * }
 * Auth: ADMIN
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tcNo,
      firstName,
      lastName,
      phone,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      healthConditions,
      otherHealthNotes,
    } = req.body;

    // Zorunlu alanlar
    if (!tcNo || !firstName || !lastName) {
      throw new AppError('TC Kimlik No, Ad ve Soyad zorunludur.', 400);
    }

    // TC Kimlik No format kontrolü (11 hane)
    if (!/^\d{11}$/.test(tcNo)) {
      throw new AppError('TC Kimlik No 11 haneli olmalıdır.', 400);
    }

    // TC zaten var mı?
    const existingUser = await prisma.user.findUnique({
      where: { tcNo },
    });

    if (existingUser) {
      throw new AppError('Bu TC Kimlik No ile kayıtlı bir kullanıcı zaten mevcut.', 409);
    }

    // Otomatik PIN üret
    const pin = generatePin();
    const pinHash = await hashPin(pin);

    // User + StudentProfile oluştur (transaction)
    const user = await prisma.user.create({
      data: {
        tcNo,
        pinHash,
        role: 'STUDENT',
        firstName,
        lastName,
        phone: phone || null,
        email: email || null,
        studentProfile: {
          create: {
            address: address || null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            healthConditions: healthConditions || [],
            otherHealthNotes: otherHealthNotes || null,
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'CREATE_STUDENT',
          entity: 'User',
          entityId: user.id,
          details: JSON.stringify({
            tcNo,
            firstName,
            lastName,
          }),
        },
      });
    }

    logger.info(
      { userId: user.id, firstName, lastName },
      'Yeni öğrenci oluşturuldu'
    );

    res.status(201).json({
      success: true,
      message: `Öğrenci oluşturuldu: ${firstName} ${lastName}`,
      data: {
        user: {
          id: user.id,
          tcNo: user.tcNo,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        profile: user.studentProfile,
        generatedPin: pin, // İlk oluşturmada PIN'i göster (sonra görüntülenemez)
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 4.2: Öğrenci Listesi ───────────────────────────────────

/**
 * GET /api/v1/students
 * Öğrenci listesi (filtreleme + pagination + sıralama)
 * Query: search, isAtRisk, healthCondition, page, limit, sortBy, sortOrder
 * Auth: ADMIN
 */
export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const isAtRisk = req.query.isAtRisk as string | undefined;
    const healthCondition = req.query.healthCondition as string | undefined;
    const pageParam = (req.query.page as string) || '1';
    const limitParam = (req.query.limit as string) || '20';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Filtre koşulları
    const userWhere: any = {
      role: 'STUDENT',
      isActive: true,
    };

    // İsim/soyisim/TC araması
    if (search) {
      userWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { tcNo: { contains: search } },
      ];
    }

    // StudentProfile filtreleri
    const profileWhere: any = {};

    if (isAtRisk === 'true') {
      profileWhere.isAtRisk = true;
    }

    if (healthCondition) {
      profileWhere.healthConditions = {
        has: healthCondition,
      };
    }

    if (Object.keys(profileWhere).length > 0) {
      userWhere.studentProfile = profileWhere;
    }

    // Sıralama
    const validSortFields = ['firstName', 'lastName', 'createdAt', 'tcNo'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        include: {
          studentProfile: {
            include: {
              rfidCards: {
                where: { status: 'ACTIVE' },
                select: { id: true, uid: true },
              },
            },
          },
        },
        orderBy: { [sortField]: order },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    // Yanıtı formatla
    const students = users.map((u) => ({
      id: u.id,
      tcNo: u.tcNo,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      email: u.email,
      profileId: u.studentProfile?.id,
      isAtRisk: u.studentProfile?.isAtRisk || false,
      healthConditions: u.studentProfile?.healthConditions || [],
      activeCard: u.studentProfile?.rfidCards[0] || null,
      createdAt: u.createdAt,
    }));

    res.json({
      success: true,
      data: {
        students,
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

// ── 4.3: Öğrenci Detay ─────────────────────────────────────

/**
 * GET /api/v1/students/:id
 * Öğrenci detay (profil + sağlık + kartlar + son yoklama)
 * Auth: ADMIN
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const user: any = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            rfidCards: {
              orderBy: { assignedAt: 'desc' },
            },
            enrollments: {
              include: {
                course: {
                  select: { id: true, name: true, term: true, isActive: true },
                },
              },
            },
            attendances: {
              take: 20,
              orderBy: { timestamp: 'desc' },
              include: {
                session: {
                  include: {
                    course: { select: { name: true } },
                    classroom: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    // Devamsızlık istatistikleri hesapla
    const profile = user.studentProfile;
    let attendanceStats = null;

    if (profile) {
      const totalAttendances = await prisma.attendance.count({
        where: { studentId: profile.id },
      });
      const presentCount = await prisma.attendance.count({
        where: { studentId: profile.id, status: 'PRESENT' },
      });
      const absentCount = await prisma.attendance.count({
        where: { studentId: profile.id, status: 'ABSENT' },
      });
      const excusedCount = await prisma.attendance.count({
        where: { studentId: profile.id, status: 'EXCUSED' },
      });

      attendanceStats = {
        total: totalAttendances,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount,
        attendanceRate: totalAttendances > 0
          ? Math.round((presentCount / totalAttendances) * 100)
          : 0,
      };
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          tcNo: user.tcNo,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        profile: profile
          ? {
              id: profile.id,
              address: profile.address,
              emergencyContactName: profile.emergencyContactName,
              emergencyContactPhone: profile.emergencyContactPhone,
              healthConditions: profile.healthConditions,
              otherHealthNotes: profile.otherHealthNotes,
              isAtRisk: profile.isAtRisk,
            }
          : null,
        rfidCards: profile?.rfidCards || [],
        enrollments: profile?.enrollments || [],
        recentAttendances: profile?.attendances || [],
        attendanceStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 4.4: Öğrenci Güncelleme ─────────────────────────────────

/**
 * PUT /api/v1/students/:id
 * Öğrenci bilgilerini güncelle (demografik + sağlık)
 * Auth: ADMIN
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      healthConditions,
      otherHealthNotes,
    } = req.body;

    // Kullanıcı var mı?
    const existingUser: any = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });

    if (!existingUser || existingUser.role !== 'STUDENT') {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    // User alanları güncelle
    const userUpdateData: any = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (phone !== undefined) userUpdateData.phone = phone;
    if (email !== undefined) userUpdateData.email = email;

    // User güncelle
    const updatedUser = await prisma.user.update({
      where: { id },
      data: userUpdateData,
    });

    // StudentProfile güncelle
    let updatedProfile = existingUser.studentProfile;
    if (existingUser.studentProfile) {
      const profileUpdateData: any = {};
      if (address !== undefined) profileUpdateData.address = address;
      if (emergencyContactName !== undefined) profileUpdateData.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone !== undefined) profileUpdateData.emergencyContactPhone = emergencyContactPhone;
      if (healthConditions !== undefined) profileUpdateData.healthConditions = healthConditions;
      if (otherHealthNotes !== undefined) profileUpdateData.otherHealthNotes = otherHealthNotes;

      if (Object.keys(profileUpdateData).length > 0) {
        updatedProfile = await prisma.studentProfile.update({
          where: { userId: id },
          data: profileUpdateData,
        });
      }
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'UPDATE_STUDENT',
          entity: 'User',
          entityId: id,
          details: JSON.stringify({
            updatedFields: Object.keys(req.body),
          }),
        },
      });
    }

    logger.info({ userId: id }, 'Öğrenci güncellendi');

    res.json({
      success: true,
      message: `Öğrenci güncellendi: ${updatedUser.firstName} ${updatedUser.lastName}`,
      data: {
        user: {
          id: updatedUser.id,
          tcNo: updatedUser.tcNo,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          email: updatedUser.email,
        },
        profile: updatedProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 4.5: Öğrenci Silme (Soft Delete) ────────────────────────

/**
 * DELETE /api/v1/students/:id
 * Öğrenciyi pasif yap (User.isActive = false)
 * Auth: ADMIN
 */
export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    if (!user.isActive) {
      throw new AppError('Öğrenci zaten pasif durumda.', 400);
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Aktif kartlarını da pasif yap
    if (user.id) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: id },
      });

      if (profile) {
        await prisma.rfidCard.updateMany({
          where: { studentId: profile.id, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });
      }
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'DELETE_STUDENT',
          entity: 'User',
          entityId: id,
          details: JSON.stringify({
            firstName: user.firstName,
            lastName: user.lastName,
            softDelete: true,
          }),
        },
      });
    }

    logger.info(
      { userId: id, firstName: user.firstName, lastName: user.lastName },
      'Öğrenci pasif yapıldı (soft delete)'
    );

    res.json({
      success: true,
      message: `Öğrenci pasif yapıldı: ${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    next(error);
  }
};

// ── 4.6: CSV/Excel Toplu Import ─────────────────────────────

/**
 * POST /api/v1/students/import
 * CSV dosyası ile toplu öğrenci oluşturma
 * CSV Format: tcNo,firstName,lastName,phone,email,emergencyContactName,emergencyContactPhone
 * Auth: ADMIN
 */
export const importStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError('CSV dosyası zorunludur.', 400);
    }

    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter((line: string) => line.trim() !== '');

    if (lines.length < 2) {
      throw new AppError('CSV dosyası en az 1 başlık satırı ve 1 veri satırı içermelidir.', 400);
    }

    // Başlık satırını atla
    const dataLines = lines.slice(1);
    const results: { success: any[]; errors: any[] } = {
      success: [],
      errors: [],
    };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));
      const [tcNo, firstName, lastName, phone, email, emergencyContactName, emergencyContactPhone] = columns;

      // Doğrulama
      if (!tcNo || !firstName || !lastName) {
        results.errors.push({
          line: i + 2, // +2: 1-indexed + header
          error: 'TC Kimlik No, Ad ve Soyad zorunludur.',
          data: { tcNo, firstName, lastName },
        });
        continue;
      }

      if (!/^\d{11}$/.test(tcNo)) {
        results.errors.push({
          line: i + 2,
          error: 'TC Kimlik No 11 haneli olmalıdır.',
          data: { tcNo, firstName, lastName },
        });
        continue;
      }

      try {
        // TC zaten var mı?
        const existing = await prisma.user.findUnique({ where: { tcNo } });
        if (existing) {
          results.errors.push({
            line: i + 2,
            error: 'Bu TC Kimlik No zaten kayıtlı.',
            data: { tcNo, firstName, lastName },
          });
          continue;
        }

        const pin = generatePin();
        const pinHash = await hashPin(pin);

        const user = await prisma.user.create({
          data: {
            tcNo,
            pinHash,
            role: 'STUDENT',
            firstName,
            lastName,
            phone: phone || null,
            email: email || null,
            studentProfile: {
              create: {
                emergencyContactName: emergencyContactName || null,
                emergencyContactPhone: emergencyContactPhone || null,
                healthConditions: [],
              },
            },
          },
        });

        results.success.push({
          line: i + 2,
          userId: user.id,
          tcNo,
          firstName,
          lastName,
          generatedPin: pin,
        });
      } catch (err: any) {
        results.errors.push({
          line: i + 2,
          error: err.message || 'Bilinmeyen hata',
          data: { tcNo, firstName, lastName },
        });
      }
    }

    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'IMPORT_STUDENTS',
          entity: 'User',
          details: JSON.stringify({
            totalLines: dataLines.length,
            successCount: results.success.length,
            errorCount: results.errors.length,
          }),
        },
      });
    }

    logger.info(
      {
        totalLines: dataLines.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
      },
      'CSV import tamamlandı'
    );

    res.status(200).json({
      success: true,
      message: `Import tamamlandı: ${results.success.length} başarılı, ${results.errors.length} hatalı`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
