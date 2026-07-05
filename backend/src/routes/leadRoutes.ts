import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  createPublicLead,
} from '../controllers/leadController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { createPublicLeadSchema, createLeadSchema, updateLeadSchema, validate } from '../utils/validation';

const router = Router();

router.post('/book-trial', strictLimiter, validate(createPublicLeadSchema), createPublicLead);

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('view_leads', 'edit_leads', 'generate_payment_link', 'schedule_trial', 'convert_lead_to_student'), (req: AuthRequest, res) => getLeads(req, res));
router.get('/stats', authenticate, requireStaffOrAdmin, requireAnyPermission('view_leads', 'edit_leads', 'generate_payment_link', 'schedule_trial', 'convert_lead_to_student'), (req: AuthRequest, res) => getLeadStats(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('view_leads', 'edit_leads', 'generate_payment_link', 'schedule_trial', 'convert_lead_to_student'), (req: AuthRequest, res) => getLeadById(req, res));

router.post('/', strictLimiter, authenticate, requireStaffOrAdmin, requirePermission('edit_leads'), validate(createLeadSchema), (req: AuthRequest, res) => createLead(req, res));
router.put('/:id', strictLimiter, authenticate, requireStaffOrAdmin, requirePermission('edit_leads'), validate(updateLeadSchema), (req: AuthRequest, res) => updateLead(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteLead(req, res));

export default router;
