import { Router } from 'express';
import {
  getEvaluationReports,
  getEvaluationReportById,
  createEvaluationReport,
  updateEvaluationReport,
  deleteEvaluationReport,
  publishEvaluationReport,
  getStudentEvaluationReports,
  getPackageEvaluationReport,
  getMyReports,
} from '../controllers/evaluationReportController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';
import { createEvaluationReportSchema, updateEvaluationReportSchema, validate } from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getEvaluationReports(req, res));
router.get('/my', authenticateClient, (req: ClientAuthRequest, res) => getMyReports(req, res));
router.get(
  '/student/:studentId/my-evaluations',
  authenticate,
  requireStaffOrAdmin,
  requireAnyPermission('view_students', 'create_report_card', 'export_report_card'),
  (req: AuthRequest, res) => getStudentEvaluationReports(req, res)
);

router.get('/student/:studentId', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getStudentEvaluationReports(req, res));
router.get('/package/:packageId', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getPackageEvaluationReport(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('view_students', 'create_report_card', 'export_report_card'), (req: AuthRequest, res) => getEvaluationReportById(req, res));

router.post(
  '/',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_report_card'),
  validate(createEvaluationReportSchema),
  (req: AuthRequest, res) => createEvaluationReport(req, res)
);
router.put(
  '/:id',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_report_card'),
  validate(updateEvaluationReportSchema),
  (req: AuthRequest, res) => updateEvaluationReport(req, res)
);
router.post(
  '/:id/publish',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_report_card'),
  (req: AuthRequest, res) => publishEvaluationReport(req, res)
);
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteEvaluationReport(req, res));

export default router;
