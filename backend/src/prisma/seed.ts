import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { hashPin } from '../utils/pin';
import { encryptField, hashForLookup } from '../utils/encryption';

type HealthConditionValue =
  | 'DIABETES'
  | 'HYPERTENSION'
  | 'HEART_DISEASE'
  | 'DEMENTIA'
  | 'PHYSICAL_ISSUE'
  | 'OTHER';

type StudentSeed = {
  tcNo: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  healthConditions: HealthConditionValue[];
  otherHealthNotes?: string | null;
  isAtRisk?: boolean;
  attendanceRate: number;
};

const DEMO_TERM = '2026-Bahar';
const ADMIN_PIN = '1234';

const uploadRoot = path.resolve(__dirname, '..', '..', 'uploads');
const seedAssetRoot = path.resolve(__dirname, '..', '..', 'prisma', 'seed-assets');
const localDemoPdf = path.join(seedAssetRoot, 'toplumsal-duyarlilik.pdf');

const admins = [
  {
    tcNo: '11111111111',
    firstName: 'Meral',
    lastName: 'Koç',
    phone: '0532 410 10 10',
    email: 'meral.koc@tazelenme.edu.tr',
  },
  {
    tcNo: '11111111112',
    firstName: 'Levent',
    lastName: 'Arıkan',
    phone: '0533 420 20 20',
    email: 'levent.arikan@tazelenme.edu.tr',
  },
  {
    tcNo: '11111111113',
    firstName: 'Selin',
    lastName: 'Aydın',
    phone: '0534 430 30 30',
    email: 'selin.aydin@tazelenme.edu.tr',
  },
];

const students: StudentSeed[] = [
  {
    tcNo: '39900000001',
    firstName: 'Hüseyin',
    lastName: 'Yalçın',
    phone: '0530 111 22 01',
    address: 'Moda, Kadıköy / İstanbul',
    emergencyContactName: 'Derya Yalçın',
    emergencyContactPhone: '0555 101 20 01',
    healthConditions: ['HYPERTENSION'],
    attendanceRate: 0.94,
  },
  {
    tcNo: '39900000002',
    firstName: 'Nermin',
    lastName: 'Aksoy',
    phone: '0530 111 22 02',
    address: 'Koşuyolu, Kadıköy / İstanbul',
    emergencyContactName: 'Bora Aksoy',
    emergencyContactPhone: '0555 101 20 02',
    healthConditions: [],
    attendanceRate: 0.9,
  },
  {
    tcNo: '39900000003',
    firstName: 'Rıza',
    lastName: 'Demirci',
    phone: '0530 111 22 03',
    address: 'Acıbadem, Üsküdar / İstanbul',
    emergencyContactName: 'Serap Demirci',
    emergencyContactPhone: '0555 101 20 03',
    healthConditions: ['DIABETES'],
    attendanceRate: 0.86,
  },
  {
    tcNo: '39900000004',
    firstName: 'Feriha',
    lastName: 'Öztürk',
    phone: '0530 111 22 04',
    address: 'Feneryolu, Kadıköy / İstanbul',
    emergencyContactName: 'Gül Öztürk',
    emergencyContactPhone: '0555 101 20 04',
    healthConditions: [],
    attendanceRate: 0.82,
  },
  {
    tcNo: '39900000005',
    firstName: 'Turgut',
    lastName: 'Kara',
    phone: '0530 111 22 05',
    address: 'Göztepe, Kadıköy / İstanbul',
    emergencyContactName: 'Mert Kara',
    emergencyContactPhone: '0555 101 20 05',
    healthConditions: ['HEART_DISEASE'],
    otherHealthNotes: 'Rutin kardiyoloji kontrolü var.',
    attendanceRate: 0.78,
  },
  {
    tcNo: '39900000006',
    firstName: 'Şermin',
    lastName: 'Kılıç',
    phone: '0530 111 22 06',
    address: 'Bostancı, Kadıköy / İstanbul',
    emergencyContactName: 'Cem Kılıç',
    emergencyContactPhone: '0555 101 20 06',
    healthConditions: [],
    attendanceRate: 0.92,
  },
  {
    tcNo: '39900000007',
    firstName: 'Kazım',
    lastName: 'Çelik',
    phone: '0530 111 22 07',
    address: 'Altunizade, Üsküdar / İstanbul',
    emergencyContactName: 'Ayhan Çelik',
    emergencyContactPhone: '0555 101 20 07',
    healthConditions: ['PHYSICAL_ISSUE'],
    otherHealthNotes: 'Diz protezi nedeniyle merdivende destek gerekebilir.',
    attendanceRate: 0.74,
  },
  {
    tcNo: '39900000008',
    firstName: 'Belgin',
    lastName: 'Sarı',
    phone: '0530 111 22 08',
    address: 'Caddebostan, Kadıköy / İstanbul',
    emergencyContactName: 'Ece Sarı',
    emergencyContactPhone: '0555 101 20 08',
    healthConditions: [],
    attendanceRate: 0.88,
  },
  {
    tcNo: '39900000009',
    firstName: 'Metin',
    lastName: 'Yıldırım',
    phone: '0530 111 22 09',
    address: 'Erenköy, Kadıköy / İstanbul',
    emergencyContactName: 'Umut Yıldırım',
    emergencyContactPhone: '0555 101 20 09',
    healthConditions: ['HYPERTENSION', 'DIABETES'],
    attendanceRate: 0.68,
  },
  {
    tcNo: '39900000010',
    firstName: 'Güler',
    lastName: 'Acar',
    phone: '0530 111 22 10',
    address: 'Fikirtepe, Kadıköy / İstanbul',
    emergencyContactName: 'Deniz Acar',
    emergencyContactPhone: '0555 101 20 10',
    healthConditions: [],
    attendanceRate: 0.96,
  },
  {
    tcNo: '39900000011',
    firstName: 'Cemal',
    lastName: 'Ergin',
    phone: '0530 111 22 11',
    address: 'Bağlarbaşı, Üsküdar / İstanbul',
    emergencyContactName: 'Nilgün Ergin',
    emergencyContactPhone: '0555 101 20 11',
    healthConditions: ['OTHER'],
    otherHealthNotes: 'İşitme cihazı kullanıyor.',
    attendanceRate: 0.84,
  },
  {
    tcNo: '39900000012',
    firstName: 'Sevim',
    lastName: 'Güneş',
    phone: '0530 111 22 12',
    address: 'Küçük Çamlıca, Üsküdar / İstanbul',
    emergencyContactName: 'Özge Güneş',
    emergencyContactPhone: '0555 101 20 12',
    healthConditions: [],
    attendanceRate: 0.8,
  },
  {
    tcNo: '39900000013',
    firstName: 'Orhan',
    lastName: 'Balcı',
    phone: '0530 111 22 13',
    address: 'Suadiye, Kadıköy / İstanbul',
    emergencyContactName: 'İpek Balcı',
    emergencyContactPhone: '0555 101 20 13',
    healthConditions: [],
    attendanceRate: 0.91,
  },
  {
    tcNo: '39900000014',
    firstName: 'Aysel',
    lastName: 'Tan',
    phone: '0530 111 22 14',
    address: 'Rasimpaşa, Kadıköy / İstanbul',
    emergencyContactName: 'Alp Tan',
    emergencyContactPhone: '0555 101 20 14',
    healthConditions: ['HYPERTENSION'],
    attendanceRate: 0.76,
  },
  {
    tcNo: '39900000015',
    firstName: 'Erol',
    lastName: 'Şahin',
    phone: '0530 111 22 15',
    address: 'Selamiçeşme, Kadıköy / İstanbul',
    emergencyContactName: 'Pelin Şahin',
    emergencyContactPhone: '0555 101 20 15',
    healthConditions: [],
    attendanceRate: 0.89,
  },
  {
    tcNo: '39900000016',
    firstName: 'Leyla',
    lastName: 'Özkan',
    phone: '0530 111 22 16',
    address: 'Kuzguncuk, Üsküdar / İstanbul',
    emergencyContactName: 'Eren Özkan',
    emergencyContactPhone: '0555 101 20 16',
    healthConditions: ['DIABETES'],
    attendanceRate: 0.72,
  },
  {
    tcNo: '39900000017',
    firstName: 'Haluk',
    lastName: 'Avcı',
    phone: '0530 111 22 17',
    address: 'Kalamış, Kadıköy / İstanbul',
    emergencyContactName: 'Burcu Avcı',
    emergencyContactPhone: '0555 101 20 17',
    healthConditions: [],
    attendanceRate: 0.95,
  },
  {
    tcNo: '39900000018',
    firstName: 'Suna',
    lastName: 'Polat',
    phone: '0530 111 22 18',
    address: 'Zühtüpaşa, Kadıköy / İstanbul',
    emergencyContactName: 'Murat Polat',
    emergencyContactPhone: '0555 101 20 18',
    healthConditions: [],
    attendanceRate: 0.83,
  },
  {
    tcNo: '39900000019',
    firstName: 'Nevzat',
    lastName: 'Eren',
    phone: '0530 111 22 19',
    address: 'Bulgurlu, Üsküdar / İstanbul',
    emergencyContactName: 'Gizem Eren',
    emergencyContactPhone: '0555 101 20 19',
    healthConditions: ['HEART_DISEASE'],
    attendanceRate: 0.7,
  },
  {
    tcNo: '39900000020',
    firstName: 'Müjgan',
    lastName: 'Bozkurt',
    phone: '0530 111 22 20',
    address: 'Çengelköy, Üsküdar / İstanbul',
    emergencyContactName: 'Okan Bozkurt',
    emergencyContactPhone: '0555 101 20 20',
    healthConditions: [],
    attendanceRate: 0.93,
  },
  {
    tcNo: '39900000021',
    firstName: 'Adnan',
    lastName: 'Uçar',
    phone: '0530 111 22 21',
    address: 'Hasanpaşa, Kadıköy / İstanbul',
    emergencyContactName: 'Yeşim Uçar',
    emergencyContactPhone: '0555 101 20 21',
    healthConditions: [],
    attendanceRate: 0.79,
  },
  {
    tcNo: '39900000022',
    firstName: 'Necla',
    lastName: 'Kurt',
    phone: '0530 111 22 22',
    address: 'Libadiye, Üsküdar / İstanbul',
    emergencyContactName: 'Can Kurt',
    emergencyContactPhone: '0555 101 20 22',
    healthConditions: ['PHYSICAL_ISSUE'],
    otherHealthNotes: 'Uzun yürüyüşlerde baston kullanıyor.',
    attendanceRate: 0.67,
  },
  {
    tcNo: '39900000023',
    firstName: 'Yusuf',
    lastName: 'Türkmen',
    phone: '0530 111 22 23',
    address: 'Kozyatağı, Kadıköy / İstanbul',
    emergencyContactName: 'Mine Türkmen',
    emergencyContactPhone: '0555 101 20 23',
    healthConditions: [],
    attendanceRate: 0.87,
  },
  {
    tcNo: '39900000024',
    firstName: 'Hale',
    lastName: 'İnce',
    phone: '0530 111 22 24',
    address: 'Ünalan, Üsküdar / İstanbul',
    emergencyContactName: 'Tolga İnce',
    emergencyContactPhone: '0555 101 20 24',
    healthConditions: [],
    attendanceRate: 0.85,
  },
  {
    tcNo: '39900000025',
    firstName: 'Mahir',
    lastName: 'Tuna',
    phone: '0530 111 22 25',
    address: 'Fenerbahçe, Kadıköy / İstanbul',
    emergencyContactName: 'Aslı Tuna',
    emergencyContactPhone: '0555 101 20 25',
    healthConditions: ['HYPERTENSION'],
    attendanceRate: 0.63,
  },
  {
    tcNo: '39900000026',
    firstName: 'Nurten',
    lastName: 'Çakır',
    phone: '0530 111 22 26',
    address: 'Validebağ, Üsküdar / İstanbul',
    emergencyContactName: 'Barış Çakır',
    emergencyContactPhone: '0555 101 20 26',
    healthConditions: [],
    attendanceRate: 0.9,
  },
  {
    tcNo: '39900000027',
    firstName: 'İsmail',
    lastName: 'Köse',
    phone: '0530 111 22 27',
    address: 'Kızıltoprak, Kadıköy / İstanbul',
    emergencyContactName: 'Merve Köse',
    emergencyContactPhone: '0555 101 20 27',
    healthConditions: ['DIABETES'],
    attendanceRate: 0.77,
  },
  {
    tcNo: '39900000028',
    firstName: 'Perihan',
    lastName: 'Ekinci',
    phone: '0530 111 22 28',
    address: 'Burhaniye, Üsküdar / İstanbul',
    emergencyContactName: 'Kerem Ekinci',
    emergencyContactPhone: '0555 101 20 28',
    healthConditions: [],
    attendanceRate: 0.81,
  },
  {
    tcNo: '39900000029',
    firstName: 'Sabri',
    lastName: 'Güler',
    phone: '0530 111 22 29',
    address: 'Sahrayıcedit, Kadıköy / İstanbul',
    emergencyContactName: 'Defne Güler',
    emergencyContactPhone: '0555 101 20 29',
    healthConditions: [],
    attendanceRate: 0.73,
  },
  {
    tcNo: '39900000030',
    firstName: 'Filiz',
    lastName: 'Can',
    phone: '0530 111 22 30',
    address: 'Murat Reis, Üsküdar / İstanbul',
    emergencyContactName: 'Arda Can',
    emergencyContactPhone: '0555 101 20 30',
    healthConditions: ['OTHER'],
    otherHealthNotes: 'Göz tansiyonu takibi var.',
    attendanceRate: 0.86,
  },
  {
    tcNo: '39900000031',
    firstName: 'Tarık',
    lastName: 'Aslan',
    phone: '0530 111 22 31',
    address: 'Çiftehavuzlar, Kadıköy / İstanbul',
    emergencyContactName: 'Melis Aslan',
    emergencyContactPhone: '0555 101 20 31',
    healthConditions: [],
    attendanceRate: 0.58,
    isAtRisk: true,
  },
  {
    tcNo: '39900000032',
    firstName: 'Semra',
    lastName: 'Pektaş',
    phone: '0530 111 22 32',
    address: 'Selimiye, Üsküdar / İstanbul',
    emergencyContactName: 'Berk Pektaş',
    emergencyContactPhone: '0555 101 20 32',
    healthConditions: ['HYPERTENSION'],
    attendanceRate: 0.55,
    isAtRisk: true,
  },
  {
    tcNo: '39900000033',
    firstName: 'Kemal',
    lastName: 'Duran',
    phone: '0530 111 22 33',
    address: 'Emaar çevresi, Üsküdar / İstanbul',
    emergencyContactName: 'Elif Duran',
    emergencyContactPhone: '0555 101 20 33',
    healthConditions: ['DEMENTIA'],
    otherHealthNotes: 'Hafif unutkanlık nedeniyle yakın takip önerildi.',
    attendanceRate: 0.5,
    isAtRisk: true,
  },
  {
    tcNo: '39900000034',
    firstName: 'Rengin',
    lastName: 'Soylu',
    phone: '0530 111 22 34',
    address: 'Nakkaştepe, Üsküdar / İstanbul',
    emergencyContactName: 'Sarp Soylu',
    emergencyContactPhone: '0555 101 20 34',
    healthConditions: [],
    attendanceRate: 0.88,
  },
  {
    tcNo: '39900000035',
    firstName: 'Faruk',
    lastName: 'Bilgin',
    phone: '0530 111 22 35',
    address: 'Osmanağa, Kadıköy / İstanbul',
    emergencyContactName: 'Cansu Bilgin',
    emergencyContactPhone: '0555 101 20 35',
    healthConditions: ['HEART_DISEASE'],
    attendanceRate: 0.69,
  },
  {
    tcNo: '39900000036',
    firstName: 'Birsen',
    lastName: 'Taş',
    phone: '0530 111 22 36',
    address: 'Küplüce, Üsküdar / İstanbul',
    emergencyContactName: 'Onur Taş',
    emergencyContactPhone: '0555 101 20 36',
    healthConditions: [],
    attendanceRate: 0.91,
  },
];

const classrooms = [
  { name: 'Amfi 1', code: 'AMFI_1', capacity: 180 },
  { name: 'Yaşam Atölyesi', code: 'YASAM_ATOLYESI', capacity: 36 },
  { name: 'Dijital Laboratuvar', code: 'DIJITAL_LAB', capacity: 28 },
  { name: 'Seminer Salonu', code: 'SEMINER_SALONU', capacity: 64 },
  { name: 'Sanat Sınıfı', code: 'SANAT_SINIFI', capacity: 32 },
];

const courses = [
  {
    key: 'healthy-life',
    name: 'Sağlıklı Yaşam ve Hareket',
    term: DEMO_TERM,
    classroomCode: 'YASAM_ATOLYESI',
    weekdayOffset: 0,
    start: '09:30',
    end: '11:00',
  },
  {
    key: 'digital-literacy',
    name: 'Akıllı Telefon ve Dijital Güvenlik',
    term: DEMO_TERM,
    classroomCode: 'DIJITAL_LAB',
    weekdayOffset: 1,
    start: '10:00',
    end: '11:30',
  },
  {
    key: 'law-literacy',
    name: 'Günlük Hayatta Hukuk Okuryazarlığı',
    term: DEMO_TERM,
    classroomCode: 'SEMINER_SALONU',
    weekdayOffset: 2,
    start: '13:00',
    end: '14:30',
  },
  {
    key: 'art-history',
    name: 'Sanat Tarihi ve Müze Kültürü',
    term: DEMO_TERM,
    classroomCode: 'SANAT_SINIFI',
    weekdayOffset: 3,
    start: '11:00',
    end: '12:30',
  },
  {
    key: 'wellbeing',
    name: 'Psikoloji ve İyi Oluş',
    term: DEMO_TERM,
    classroomCode: 'SEMINER_SALONU',
    weekdayOffset: 4,
    start: '10:30',
    end: '12:00',
  },
  {
    key: 'nutrition',
    name: 'Beslenme, Uyku ve İlaç Farkındalığı',
    term: DEMO_TERM,
    classroomCode: 'YASAM_ATOLYESI',
    weekdayOffset: 1,
    start: '13:30',
    end: '15:00',
  },
  {
    key: 'memory',
    name: 'Bellek, Dikkat ve Zihin Egzersizleri',
    term: DEMO_TERM,
    classroomCode: 'AMFI_1',
    weekdayOffset: 2,
    start: '09:30',
    end: '11:00',
  },
  {
    key: 'volunteering',
    name: 'Toplumsal Katılım ve Gönüllülük',
    term: DEMO_TERM,
    classroomCode: 'SEMINER_SALONU',
    weekdayOffset: 4,
    start: '14:00',
    end: '15:30',
  },
];

function makeDate(day: string, time: string) {
  return new Date(`${day}T${time}:00.000Z`);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function deterministicScore(studentIndex: number, sessionIndex: number) {
  return ((studentIndex + 3) * 37 + (sessionIndex + 5) * 19) % 100;
}

async function upsertAdmin(admin: (typeof admins)[number]) {
  const tcNoHash = hashForLookup(admin.tcNo);
  const existing = await prisma.user.findUnique({ where: { tcNoHash } });

  const data = {
    firstName: admin.firstName,
    lastName: admin.lastName,
    phone: admin.phone,
    email: admin.email,
    role: 'ADMIN' as const,
    isActive: true,
  };

  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data });
  }

  return prisma.user.create({
    data: {
      ...data,
      tcNoHash,
      tcNoEncrypted: encryptField(admin.tcNo),
      pinHash: await hashPin(ADMIN_PIN),
    },
  });
}

async function upsertStudent(student: StudentSeed) {
  const tcNoHash = hashForLookup(student.tcNo);
  const pinHash = await hashPin(student.tcNo.slice(-4));
  const existing = await prisma.user.findUnique({
    where: { tcNoHash },
    include: { studentProfile: true },
  });

  const userData = {
    firstName: student.firstName,
    lastName: student.lastName,
    phone: student.phone,
    email: student.email || null,
    pinHash,
    role: 'STUDENT' as const,
    isActive: true,
  };

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: userData });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: existing.id },
      update: {
        address: student.address,
        emergencyContactName: student.emergencyContactName,
        emergencyContactPhone: student.emergencyContactPhone,
        healthConditions: student.healthConditions,
        otherHealthNotes: student.otherHealthNotes || null,
        isAtRisk: student.isAtRisk || false,
      },
      create: {
        userId: existing.id,
        address: student.address,
        emergencyContactName: student.emergencyContactName,
        emergencyContactPhone: student.emergencyContactPhone,
        healthConditions: student.healthConditions,
        otherHealthNotes: student.otherHealthNotes || null,
        isAtRisk: student.isAtRisk || false,
      },
    });
    return { ...existing, ...userData, studentProfile: profile };
  }

  return prisma.user.create({
    data: {
      ...userData,
      tcNoHash,
      tcNoEncrypted: encryptField(student.tcNo),
      pinHash,
      studentProfile: {
        create: {
          address: student.address,
          emergencyContactName: student.emergencyContactName,
          emergencyContactPhone: student.emergencyContactPhone,
          healthConditions: student.healthConditions,
          otherHealthNotes: student.otherHealthNotes || null,
          isAtRisk: student.isAtRisk || false,
        },
      },
    },
    include: { studentProfile: true },
  });
}

async function findOrCreateCourse(course: (typeof courses)[number]) {
  const existing = await prisma.course.findFirst({
    where: { name: course.name, term: course.term },
  });

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  }

  return prisma.course.create({
    data: { name: course.name, term: course.term, isActive: true },
  });
}

async function ensureMaterial(courseId: string, title: string, type: string, url: string, fileSize?: number | null) {
  const existing = await prisma.courseMaterial.findFirst({ where: { courseId, title } });
  const data = { type, url, fileSize: fileSize || null };

  if (existing) {
    return prisma.courseMaterial.update({ where: { id: existing.id }, data });
  }

  return prisma.courseMaterial.create({ data: { courseId, title, ...data } });
}

async function ensureLocalPdfMaterial(courseId: string) {
  if (!fs.existsSync(localDemoPdf)) {
    logger.warn({ localDemoPdf }, 'Demo PDF bulunamadı, PDF materyali atlandı.');
    return;
  }

  const uploadDir = path.join(uploadRoot, 'materials', courseId);
  fs.mkdirSync(uploadDir, { recursive: true });

  const targetFileName = 'toplumsal-duyarlilik.pdf';
  const targetPath = path.join(uploadDir, targetFileName);
  fs.copyFileSync(localDemoPdf, targetPath);

  await ensureMaterial(
    courseId,
    'Toplumsal Duyarlılık Katkı Rehberi',
    'PDF',
    `/uploads/materials/${courseId}/${targetFileName}`,
    fs.statSync(targetPath).size
  );
}

async function main() {
  logger.info('🌱 Gerçekçi demo verileri hazırlanıyor...');

  await Promise.all(admins.map(upsertAdmin));
  logger.info(`✅ ${admins.length} koordinatör hazırlandı`);

  const classroomMap = new Map<string, Awaited<ReturnType<typeof prisma.classroom.upsert>>>();
  for (const classroom of classrooms) {
    const saved = await prisma.classroom.upsert({
      where: { code: classroom.code },
      update: { name: classroom.name, capacity: classroom.capacity },
      create: classroom,
    });
    classroomMap.set(saved.code, saved);
  }
  logger.info(`✅ ${classroomMap.size} sınıf/lokasyon hazırlandı`);

  const savedStudents = [];
  for (const student of students) {
    savedStudents.push(await upsertStudent(student));
  }
  logger.info(`✅ ${savedStudents.length} kurgusal öğrenci hazırlandı`);

  const courseMap = new Map<string, Awaited<ReturnType<typeof findOrCreateCourse>>>();
  for (const course of courses) {
    courseMap.set(course.key, await findOrCreateCourse(course));
  }
  logger.info(`✅ ${courseMap.size} ders hazırlandı`);

  for (let index = 0; index < savedStudents.length; index++) {
    const student = savedStudents[index].studentProfile;
    if (!student) continue;

    const selectedCourses = courses.filter((_, courseIndex) => {
      return (index + courseIndex) % 3 !== 1 || courseIndex === index % courses.length;
    });

    for (const courseSeed of selectedCourses.slice(0, 5)) {
      const course = courseMap.get(courseSeed.key);
      if (!course) continue;

      await prisma.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: course.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: course.id,
        },
      });
    }
  }
  logger.info('✅ Ders kayıtları hazırlandı');

  const sessions = [];
  const baseMonday = new Date('2026-03-02T00:00:00.000Z');
  for (let week = 1; week <= 6; week++) {
    for (const courseSeed of courses) {
      const course = courseMap.get(courseSeed.key);
      const classroom = classroomMap.get(courseSeed.classroomCode);
      if (!course || !classroom) continue;

      const sessionDay = addDays(baseMonday, (week - 1) * 7 + courseSeed.weekdayOffset);
      const sessionDate = makeDate(dayKey(sessionDay), '00:00');
      const startTime = makeDate(dayKey(sessionDay), courseSeed.start);
      const endTime = makeDate(dayKey(sessionDay), courseSeed.end);

      const existing = await prisma.lessonSession.findFirst({
        where: {
          courseId: course.id,
          classroomId: classroom.id,
          weekNumber: week,
          sessionDate,
        },
      });

      const session =
        existing ||
        (await prisma.lessonSession.create({
          data: {
            courseId: course.id,
            classroomId: classroom.id,
            sessionDate,
            startTime,
            endTime,
            weekNumber: week,
          },
        }));

      sessions.push(session);
    }
  }
  logger.info(`✅ ${sessions.length} ders oturumu hazırlandı`);

  for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
    const session = sessions[sessionIndex];
    const enrolled = await prisma.enrollment.findMany({
      where: { courseId: session.courseId },
      include: { student: { include: { user: true } } },
    });

    for (const enrollment of enrolled) {
      const seedIndex = students.findIndex((student) => {
        return hashForLookup(student.tcNo) === enrollment.student.user.tcNoHash;
      });

      if (seedIndex === -1) {
        continue;
      }

      const studentSeed = students[seedIndex];
      const score = deterministicScore(seedIndex, sessionIndex);
      const presentLimit = Math.round(studentSeed.attendanceRate * 100);
      const status = score < presentLimit ? 'PRESENT' : score < presentLimit + 8 ? 'EXCUSED' : 'ABSENT';

      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: enrollment.studentId,
          },
        },
      });

      if (!existingAttendance) {
        await prisma.attendance.create({
          data: {
            sessionId: session.id,
            studentId: enrollment.studentId,
            status,
            method: status === 'PRESENT' ? (score % 4 === 0 ? 'MANUAL' : 'RFID') : null,
          },
        });
      }
    }
  }
  logger.info('✅ Gerçekçi yoklama dağılımı hazırlandı');

  for (let index = 0; index < savedStudents.length; index++) {
    const student = savedStudents[index].studentProfile;
    if (!student) continue;

    const uid = `TZL-2026-${String(index + 1).padStart(4, '0')}`;
    const existingCard = await prisma.rfidCard.findUnique({ where: { uid } });
    if (!existingCard) {
      await prisma.rfidCard.create({
        data: {
          uid,
          studentId: student.id,
          status: index === 12 || index === 24 ? 'LOST' : 'ACTIVE',
          revokedAt: index === 12 || index === 24 ? new Date('2026-04-10T10:00:00.000Z') : null,
        },
      });
    }

    if (index === 12 || index === 24) {
      const replacementUid = `TZL-2026-R${String(index + 1).padStart(4, '0')}`;
      const replacement = await prisma.rfidCard.findUnique({ where: { uid: replacementUid } });
      if (!replacement) {
        await prisma.rfidCard.create({
          data: {
            uid: replacementUid,
            studentId: student.id,
            status: 'ACTIVE',
          },
        });
      }
    }
  }
  logger.info('✅ RFID kart senaryoları hazırlandı');

  const healthyLife = courseMap.get('healthy-life')!;
  const digitalLiteracy = courseMap.get('digital-literacy')!;
  const artHistory = courseMap.get('art-history')!;
  const volunteering = courseMap.get('volunteering')!;
  const lawLiteracy = courseMap.get('law-literacy')!;
  const wellbeing = courseMap.get('wellbeing')!;
  const nutrition = courseMap.get('nutrition')!;
  const memory = courseMap.get('memory')!;

  await ensureMaterial(
    healthyLife.id,
    'Sağlıklı Yaş Alma Merkezi Bilgilendirmesi',
    'LINK',
    'https://hasekieah.saglik.gov.tr/TR-1151359/saglikli-yas-alma-merkezi.html'
  );
  await ensureMaterial(
    digitalLiteracy.id,
    'Dijital Ortamlarda Dikkat Edilmesi Gerekenler',
    'LINK',
    'https://www.guvenliweb.org.tr/index-orj.php/haber-detay/dijital-ortamlarda-dikkat-edilmesi-gerekenler'
  );
  await ensureMaterial(
    digitalLiteracy.id,
    'Dijital Vatandaşlık ve Güvenli İnternet Araştırması',
    'LINK',
    'https://www.guvenliweb.org.tr/dosya/73bDc.pdf'
  );
  await ensureMaterial(
    artHistory.id,
    'Kültür ve Turizm Bakanlığı Sanal Müzeler',
    'LINK',
    'https://kvmgm.ktb.gov.tr/TR-259897/sanal-muzeler.html'
  );
  await ensureMaterial(
    artHistory.id,
    'Afrodisias Sanal Turu',
    'VIDEO',
    'https://aydin.ktb.gov.tr/TR-262166/afrodisias-sanal-turu.html'
  );
  await ensureMaterial(
    lawLiteracy.id,
    'Mevzuat Bilgi Sistemi',
    'LINK',
    'https://www.mevzuat.gov.tr/'
  );
  await ensureMaterial(
    wellbeing.id,
    'Ruh Sağlığı Bilgilendirme Portalı',
    'LINK',
    'https://hsgm.saglik.gov.tr/tr/ruh-sagligi.html'
  );
  await ensureMaterial(
    nutrition.id,
    'Türkiye Beslenme Rehberi Kaynakları',
    'LINK',
    'https://hsgm.saglik.gov.tr/tr/beslenme.html'
  );
  await ensureMaterial(
    memory.id,
    'TRT Dinle - Kültür ve Hafıza İçerikleri',
    'VIDEO',
    'https://www.trtdinle.com/'
  );
  await ensureLocalPdfMaterial(volunteering.id);
  logger.info('✅ Gerçek linkler ve PDF materyali hazırlandı');

  const riskStudent = savedStudents.find((student) => student.studentProfile?.isAtRisk);
  if (riskStudent?.studentProfile) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        studentProfileId: riskStudent.studentProfile.id,
        type: 'ISOLATION_RISK',
        title: 'Katılım Takibi Gerekli',
      },
    });

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          type: 'ISOLATION_RISK',
          title: 'Katılım Takibi Gerekli',
          message: `${riskStudent.firstName} ${riskStudent.lastName} son haftalarda derslere düzensiz katılıyor. Telefonla aranması önerilir.`,
          studentProfileId: riskStudent.studentProfile.id,
        },
      });
    }
  }

  logger.info('🎉 Demo seed tamamlandı.');
  logger.info('📋 Demo girişleri:');
  logger.info('   Koordinatör -> TC: 11111111111, PIN: 1234');
  logger.info('   Öğrenci     -> TC: 39900000001, PIN: 0001');
}

main()
  .catch((error) => {
    logger.error(error, 'Seed hatası');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
