import { Router } from 'express';
import {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getPackageStats,
  renewPackage,
  upgradePackage,
  getStudentPackages,
} from '../controllers/packageController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { createPackageSchema, updatePackageSchema, renewPackageSchema, upgradePackageSchema, validate } from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card', 'enroll_student', 'upgrade_student_course'), (req: AuthRequest, res) => getPackages(req, res));
router.get('/stats', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card', 'enroll_student', 'upgrade_student_course'), (req: AuthRequest, res) => getPackageStats(req, res));
router.get('/student/:studentId', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card', 'enroll_student', 'upgrade_student_course'), (req: AuthRequest, res) => getStudentPackages(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card', 'enroll_student', 'upgrade_student_course'), (req: AuthRequest, res) => getPackageById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, validate(createPackageSchema), (req: AuthRequest, res) => createPackage(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, validate(updatePackageSchema), (req: AuthRequest, res) => updatePackage(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deletePackage(req, res));

router.post('/:packageId/renew', strictLimiter, authenticate, requireAdmin, validate(renewPackageSchema), (req: AuthRequest, res) => renewPackage(req, res));
router.post('/:packageId/upgrade', strictLimiter, authenticate, requireAdmin, validate(upgradePackageSchema), (req: AuthRequest, res) => upgradePackage(req, res));

export default router;
