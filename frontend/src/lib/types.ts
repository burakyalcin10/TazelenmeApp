export type UserRole = "ADMIN" | "STUDENT";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";
export type CardStatus = "ACTIVE" | "LOST" | "REVOKED";
export type HealthCondition =
  | "DIABETES"
  | "HYPERTENSION"
  | "HEART_DISEASE"
  | "DEMENTIA"
  | "PHYSICAL_ISSUE"
  | "OTHER";
export type NotificationType = "ISOLATION_RISK" | "LOST_CARD" | "SYSTEM";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string | null;
  email?: string | null;
  studentProfile?: {
    id: string;
    isAtRisk: boolean;
    healthConditions: HealthCondition[];
  } | null;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StoredSession extends TokenBundle {
  user: AdminUser;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StudentListItem {
  id: string;
  tcNo: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  profileId?: string | null;
  isAtRisk: boolean;
  healthConditions: HealthCondition[];
  activeCard?: {
    id: string;
    uid: string;
  } | null;
  createdAt: string;
}

export interface StudentProfileDetail {
  id: string;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  healthConditions: HealthCondition[];
  otherHealthNotes?: string | null;
  isAtRisk: boolean;
}

export interface CardItem {
  id: string;
  uid: string;
  studentId: string;
  status: CardStatus;
  assignedAt: string;
  revokedAt?: string | null;
  student?: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface EnrollmentDetailItem {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  enrolledAt: string;
  course?: {
    id: string;
    name: string;
    term: string;
    isActive: boolean;
  };
}

export interface RecentAttendanceItem {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  method?: string | null;
  timestamp: string;
  session: {
    course: {
      name: string;
    };
    classroom: {
      name: string;
    };
    sessionDate: string;
    weekNumber: number;
  };
}

export interface StudentDetail {
  user: {
    id: string;
    tcNo: string | null;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
    createdAt: string;
  };
  profile: StudentProfileDetail | null;
  rfidCards: CardItem[];
  enrollments: EnrollmentDetailItem[];
  recentAttendances: RecentAttendanceItem[];
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    attendanceRate: number;
  } | null;
}

export interface SessionListItem {
  id: string;
  courseId: string;
  classroomId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  weekNumber: number;
  attendanceCount: number;
  course: {
    id: string;
    name: string;
    term: string;
  };
  classroom: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CourseListItem {
  id: string;
  name: string;
  term: string;
  isActive: boolean;
  enrollmentCount: number;
  sessionCount: number;
  materialCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentItem {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  term: string;
  enrolledAt: string;
}

export interface MaterialItem {
  id: string;
  courseId: string;
  title: string;
  url: string;
  type: "PDF" | "LINK" | "VIDEO";
  fileSize?: number | null;
  uploadedAt: string;
  course?: {
    id: string;
    name: string;
    term?: string;
  };
}

export interface ClassroomItem {
  id: string;
  name: string;
  code: string;
  capacity?: number | null;
  sessionCount?: number;
}

export interface AttendanceSummary {
  course: {
    id: string;
    name: string;
    term: string;
  };
  enrollmentCount: number;
  totalSessions: number;
  averageAttendanceRate: number;
  weeklyTrend: {
    weekNumber: number;
    sessionDate: string;
    classroom: string;
    totalEnrolled: number;
    present: number;
    excused: number;
    absent: number;
    attendanceRate: number;
  }[];
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionTaken?: string | null;
  studentProfileId?: string | null;
  studentName?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface AttendanceSessionDetail {
  session: {
    id: string;
    courseName: string;
    classroom: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    weekNumber: number;
  };
  stats: {
    total: number;
    present: number;
    absent: number;
    excused: number;
  };
  attendanceList: {
    studentId: string;
    firstName: string;
    lastName: string;
    activeCard?: string | null;
    status: AttendanceStatus;
    method?: string | null;
    timestamp?: string | null;
    attendanceId?: string | null;
  }[];
}

export interface StudentCreatePayload {
  tcNo: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthConditions: HealthCondition[];
  otherHealthNotes?: string;
}
