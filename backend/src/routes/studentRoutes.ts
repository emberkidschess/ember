import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats,
  provisionStudentAccess,
  getStudentDashboard,
  freezeStudentPortal,
  unfreezeStudentPortal,
  submitHelpRequest,
} from '../controllers/studentController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';
import {
  createStudentSchema,
  updateStudentSchema,
  freezePortalSchema,
  provisionAccessSchema,
  validate,
} from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'edit_students', 'freeze_student_portal', 'generate_payment_link', 'enroll_student', 'upgrade_student_course', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getStudents(req, res));
router.get('/stats', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'edit_students', 'freeze_student_portal', 'generate_payment_link', 'enroll_student', 'upgrade_student_course', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getStudentStats(req, res));
router.get('/dashboard', authenticateClient, (req: ClientAuthRequest, res) => getStudentDashboard(req, res));
router.post('/help-request', strictLimiter, authenticateClient, (req: ClientAuthRequest, res) => submitHelpRequest(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'edit_students', 'freeze_student_portal', 'generate_payment_link', 'enroll_student', 'upgrade_student_course', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getStudentById(req, res));

router.post('/', strictLimiter, authenticate, requireStaffOrAdmin, requirePermission('edit_students'), validate(createStudentSchema), (req: AuthRequest, res) => createStudent(req, res));
router.post('/:id/provision-access', strictLimiter, authenticate, requireStaffOrAdmin, requirePermission('edit_students'), validate(provisionAccessSchema), (req: AuthRequest, res) => provisionStudentAccess(req, res));
router.post(
  '/:id/freeze',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('freeze_student_portal'),
  validate(freezePortalSchema),
  (req: AuthRequest, res) => freezeStudentPortal(req, res)
);
router.post(
  '/:id/unfreeze',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('freeze_student_portal'),
  (req: AuthRequest, res) => unfreezeStudentPortal(req, res)
);
router.put('/:id', strictLimiter, authenticate, requireStaffOrAdmin, requirePermission('edit_students'), validate(updateStudentSchema), (req: AuthRequest, res) => updateStudent(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteStudent(req, res));

export default router;
