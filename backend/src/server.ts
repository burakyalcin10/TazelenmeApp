import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import authRoutes from './routes/auth.routes';

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Parsing Middleware ──
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/students', studentRoutes);
// app.use('/api/v1/attendance', attendanceRoutes);
// app.use('/api/v1/courses', courseRoutes);
// app.use('/api/v1/cards', cardRoutes);
// app.use('/api/v1/materials', materialRoutes);
// app.use('/api/v1/notifications', notificationRoutes);

// ── Error Handling ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ──
app.listen(PORT, () => {
  logger.info(`🎓 TazelenmeApp Backend listening on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
