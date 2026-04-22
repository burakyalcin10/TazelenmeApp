import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { startIsolationCheckJob } from './jobs/isolationCheck';

// Route imports
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import cardRoutes from './routes/card.routes';
import studentRoutes from './routes/student.routes';
import notificationRoutes from './routes/notification.routes';
import courseRoutes from './routes/course.routes';
import classroomRoutes from './routes/classroom.routes';
import sessionRoutes from './routes/session.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import materialRoutes from './routes/material.routes';
import reportRoutes from './routes/report.routes';
import studentPortalRoutes from './routes/student-portal.routes';

// Admin endpoints (isolation check manual trigger)
import { runIsolationCheck } from './jobs/isolationCheck';
import { authenticate, authorize } from './middlewares/auth';

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Parsing Middleware ──
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──
app.use(generalLimiter);

// ── Request Logging ──
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'TazelenmeApp API çalışıyor 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ──

// Sprint 1 — Auth
app.use('/api/v1/auth', authRoutes);

// Sprint 2 — Yoklama & Kart & Öğrenci
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/cards', cardRoutes);

// Sprint 3 — Otomasyon & Mini-LMS
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/classrooms', classroomRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/student', studentPortalRoutes);

// ── Admin — Manuel İzolasyon Tarama Tetikleme ──
app.get('/api/v1/admin/run-isolation-check', authenticate, authorize('ADMIN'), async (_req, res, next) => {
  try {
    const result = await runIsolationCheck();
    res.json({
      success: true,
      message: 'İzolasyon taraması manuel olarak tamamlandı.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ── Error Handling ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ──
app.listen(PORT, () => {
  logger.info(`🎓 TazelenmeApp Backend listening on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);

  // Cron Job'ları başlat
  startIsolationCheckJob();
});

export default app;
