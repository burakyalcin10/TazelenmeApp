import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { hashPin } from '../utils/pin';
import { encryptField, hashForLookup } from '../utils/encryption';

/**
 * Seed Data — Demo/Geliştirme verileri
 * Sprint 3: tcNo artık AES-256-GCM ile şifrelenip, SHA-256 hash ile saklanıyor
 * 10 öğrenci, 2 koordinatör, 3 ders, 2 sınıf, haftalık yoklama
 */
async function main() {
  logger.info('🌱 Seed verileri yükleniyor...');

  // ── 1. Sınıflar (Classroom) ──
  const amfi1 = await prisma.classroom.create({
    data: { name: 'Amfi 1', code: 'AMFI_1', capacity: 200 },
  });
  const sinifB201 = await prisma.classroom.create({
    data: { name: 'Sınıf B-201', code: 'SINIF_B201', capacity: 40 },
  });

  logger.info(`✅ ${2} Sınıf oluşturuldu`);

  // ── 2. Admin Kullanıcı ──
  const adminTcNo = '11111111111';
  const admin = await prisma.user.create({
    data: {
      tcNoEncrypted: encryptField(adminTcNo),
      tcNoHash: hashForLookup(adminTcNo),
      pinHash: await hashPin('1234'), // Admin PIN: 1234
      role: 'ADMIN',
      firstName: 'Koordinatör',
      lastName: 'Demo',
      phone: '05001112233',
      email: 'koordinator@tazelenme.edu.tr',
    },
  });

  logger.info(`✅ Admin oluşturuldu: ${admin.firstName} ${admin.lastName}`);

  // ── 3. Öğrenciler (10 adet) ──
  const studentData = [
    { tcNo: '22222222221', firstName: 'Ahmet',   lastName: 'Yılmaz',    phone: '05301112233' },
    { tcNo: '22222222222', firstName: 'Ayşe',    lastName: 'Demir',     phone: '05302223344' },
    { tcNo: '22222222223', firstName: 'Mehmet',  lastName: 'Kaya',      phone: '05303334455' },
    { tcNo: '22222222224', firstName: 'Fatma',   lastName: 'Çelik',     phone: '05304445566' },
    { tcNo: '22222222225', firstName: 'Hasan',   lastName: 'Şahin',     phone: '05305556677' },
    { tcNo: '22222222226', firstName: 'Emine',   lastName: 'Arslan',    phone: '05306667788' },
    { tcNo: '22222222227', firstName: 'Mustafa', lastName: 'Öztürk',    phone: '05307778899' },
    { tcNo: '22222222228', firstName: 'Zeynep',  lastName: 'Aydın',     phone: '05308889900' },
    { tcNo: '22222222229', firstName: 'Ali',     lastName: 'Yıldız',    phone: '05309990011' },
    { tcNo: '22222222230', firstName: 'Hatice',  lastName: 'Erdoğan',   phone: '05300001122' },
  ];

  const students = [];
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        tcNoEncrypted: encryptField(s.tcNo),
        tcNoHash: hashForLookup(s.tcNo),
        pinHash: await hashPin('4921'), // Tüm öğrencilerin demo PIN'i: 4921
        role: 'STUDENT',
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        studentProfile: {
          create: {
            emergencyContactName: `${s.firstName} Yakını`,
            emergencyContactPhone: '05551234567',
            healthConditions: [],
            otherHealthNotes: null,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(user);
  }

  // Bazı öğrencilere sağlık verisi ekle
  await prisma.studentProfile.update({
    where: { userId: students[0].id },
    data: { healthConditions: ['DIABETES', 'HYPERTENSION'] },
  });
  await prisma.studentProfile.update({
    where: { userId: students[2].id },
    data: { healthConditions: ['HEART_DISEASE'], otherHealthNotes: 'Kalp pili var' },
  });
  await prisma.studentProfile.update({
    where: { userId: students[5].id },
    data: { healthConditions: ['PHYSICAL_ISSUE'], otherHealthNotes: 'Tekerlekli sandalye kullanıyor' },
  });

  logger.info(`✅ ${students.length} Öğrenci oluşturuldu`);

  // ── 4. RFID Kartlar ──
  const cardUids = ['A1B2C3D1', 'A1B2C3D2', 'A1B2C3D3', 'A1B2C3D4', 'A1B2C3D5',
                    'A1B2C3D6', 'A1B2C3D7', 'A1B2C3D8', 'A1B2C3D9', 'A1B2C3DA'];

  for (let i = 0; i < students.length; i++) {
    await prisma.rfidCard.create({
      data: {
        uid: cardUids[i],
        studentId: students[i].studentProfile!.id,
        status: 'ACTIVE',
      },
    });
  }

  // Bir kayıp kart senaryosu
  await prisma.rfidCard.update({
    where: { uid: 'A1B2C3D5' },
    data: { status: 'LOST', revokedAt: new Date() },
  });
  // Yeni kart ata
  await prisma.rfidCard.create({
    data: {
      uid: 'NEW_CARD_05',
      studentId: students[4].studentProfile!.id,
      status: 'ACTIVE',
    },
  });

  logger.info(`✅ RFID Kartlar oluşturuldu (1 kayıp kart senaryosu dahil)`);

  // ── 5. Dersler ──
  const course1 = await prisma.course.create({
    data: { name: 'Miras Hukuku', term: '2025-Bahar', isActive: true },
  });
  const course2 = await prisma.course.create({
    data: { name: 'Teknoloji Okuryazarlığı', term: '2025-Bahar', isActive: true },
  });
  const course3 = await prisma.course.create({
    data: { name: 'Sağlıklı Yaşam', term: '2025-Bahar', isActive: true },
  });

  logger.info(`✅ 3 Ders oluşturuldu`);

  // ── 6. Kayıtlar (Enrollment) ──
  // İlk 7 öğrenci course1'e, ilk 5 öğrenci course2'ye, tümü course3'e
  for (let i = 0; i < 7; i++) {
    await prisma.enrollment.create({
      data: { studentId: students[i].studentProfile!.id, courseId: course1.id },
    });
  }
  for (let i = 0; i < 5; i++) {
    await prisma.enrollment.create({
      data: { studentId: students[i].studentProfile!.id, courseId: course2.id },
    });
  }
  for (const s of students) {
    await prisma.enrollment.create({
      data: { studentId: s.studentProfile!.id, courseId: course3.id },
    });
  }

  logger.info(`✅ Ders kayıtları oluşturuldu`);

  // ── 7. Ders Oturumları (2 haftalık) ──
  const baseDate = new Date('2025-03-03'); // Pazartesi

  const sessions = [];
  for (let week = 1; week <= 2; week++) {
    const weekDate = new Date(baseDate);
    weekDate.setDate(weekDate.getDate() + (week - 1) * 7);

    // Pazartesi 09:00-11:00 — Miras Hukuku — Amfi 1
    const s1 = await prisma.lessonSession.create({
      data: {
        courseId: course1.id,
        classroomId: amfi1.id,
        sessionDate: new Date(weekDate),
        startTime: new Date(`${weekDate.toISOString().split('T')[0]}T09:00:00`),
        endTime: new Date(`${weekDate.toISOString().split('T')[0]}T11:00:00`),
        weekNumber: week,
      },
    });
    sessions.push(s1);

    // Çarşamba 13:00-15:00 — Teknoloji Okury. — Sınıf B-201
    const wedDate = new Date(weekDate);
    wedDate.setDate(wedDate.getDate() + 2);
    const s2 = await prisma.lessonSession.create({
      data: {
        courseId: course2.id,
        classroomId: sinifB201.id,
        sessionDate: wedDate,
        startTime: new Date(`${wedDate.toISOString().split('T')[0]}T13:00:00`),
        endTime: new Date(`${wedDate.toISOString().split('T')[0]}T15:00:00`),
        weekNumber: week,
      },
    });
    sessions.push(s2);

    // Cuma 10:00-12:00 — Sağlıklı Yaşam — Amfi 1
    const friDate = new Date(weekDate);
    friDate.setDate(friDate.getDate() + 4);
    const s3 = await prisma.lessonSession.create({
      data: {
        courseId: course3.id,
        classroomId: amfi1.id,
        sessionDate: friDate,
        startTime: new Date(`${friDate.toISOString().split('T')[0]}T10:00:00`),
        endTime: new Date(`${friDate.toISOString().split('T')[0]}T12:00:00`),
        weekNumber: week,
      },
    });
    sessions.push(s3);
  }

  logger.info(`✅ ${sessions.length} Ders oturumu oluşturuldu (2 hafta)`);

  // ── 8. Yoklama Verileri ──
  // Hafta 1: Çoğu öğrenci gelsin
  for (let i = 0; i < 6; i++) {
    await prisma.attendance.create({
      data: {
        sessionId: sessions[0].id, // Hafta 1 — Miras Hukuku
        studentId: students[i].studentProfile!.id,
        status: 'PRESENT',
        method: 'RFID',
      },
    });
  }
  // Ahmet Amca course2 hafta 1'e gelsin
  await prisma.attendance.create({
    data: {
      sessionId: sessions[1].id,
      studentId: students[0].studentProfile!.id,
      status: 'PRESENT',
      method: 'RFID',
    },
  });

  logger.info(`✅ Demo yoklama verileri oluşturuldu`);

  // ── 9. Ders Materyalleri ──
  await prisma.courseMaterial.create({
    data: {
      courseId: course1.id,
      title: '1. Hafta — Miras Hukuku Giriş',
      url: '/materials/miras-hukuku-1.pdf',
      type: 'PDF',
    },
  });
  await prisma.courseMaterial.create({
    data: {
      courseId: course2.id,
      title: 'Akıllı Telefon Kullanımı',
      url: 'https://www.youtube.com/watch?v=demo',
      type: 'VIDEO',
    },
  });

  logger.info(`✅ Ders materyalleri oluşturuldu`);

  // ── 10. Demo Bildirim ──
  await prisma.notification.create({
    data: {
      type: 'ISOLATION_RISK',
      title: 'Devamsızlık Uyarısı',
      message: `${students[8].firstName} ${students[8].lastName} son 3 haftadır hiçbir derse katılmadı.`,
      studentProfileId: students[8].studentProfile!.id,
    },
  });

  logger.info(`✅ Demo bildirim oluşturuldu`);
  logger.info('🎉 Seed tamamlandı!');
  logger.info('📋 Demo Giriş Bilgileri:');
  logger.info('   Admin  → TC: 11111111111, PIN: 1234');
  logger.info('   Öğrenci → TC: 22222222221, PIN: 4921');
}

main()
  .catch((e) => {
    logger.error(e, 'Seed hatası');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
