import { Router } from 'express';
import {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
} from '../controllers/classroom.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

/**
 * Classroom Routes
 * Base path: /api/v1/classrooms
 * Tüm endpoint'ler ADMIN yetkisi gerektirir
 */

router.post('/', authenticate, authorize('ADMIN'), createClassroom);
router.get('/', authenticate, authorize('ADMIN'), getClassrooms);
router.get('/:id', authenticate, authorize('ADMIN'), getClassroomById);
router.put('/:id', authenticate, authorize('ADMIN'), updateClassroom);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteClassroom);

export default router;
