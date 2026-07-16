import { Router } from 'express';
import {
  cancelAcademyEvent,
  createAcademyEventController,
  getAcademyEvents,
  getStudentAcademyEvents,
  joinStudentAcademyEvent,
  updateAcademyEvent,
} from '../controllers/academyEventController';
import { authenticate, requireAdmin, requireAnyPermission, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';
import { validate, createMasterclassSchema, createTournamentSchema, updateAcademyEventSchema } from '../utils/validation';

const router = Router();

router.get('/student', authenticateClient, (req: ClientAuthRequest, res) => getStudentAcademyEvents(req, res));
router.post('/:id/join', authenticateClient, (req: ClientAuthRequest, res) => joinStudentAcademyEvent(req, res));

router.get('/:type', authenticate, requireStaffOrAdmin, requireAnyPermission('manage_academy_events', 'view_students', 'schedule_classes'), (req: AuthRequest, res) => getAcademyEvents(req, res));
router.post('/masterclass', authenticate, requireAdmin, validate(createMasterclassSchema), (req: AuthRequest, res) => {
  req.params.type = 'masterclass';
  return createAcademyEventController(req, res);
});
router.post('/tournament', authenticate, requireAdmin, validate(createTournamentSchema), (req: AuthRequest, res) => {
  req.params.type = 'tournament';
  return createAcademyEventController(req, res);
});
router.put('/:type/:id', authenticate, requireAdmin, validate(updateAcademyEventSchema), (req: AuthRequest, res) => updateAcademyEvent(req, res));
router.post('/:type/:id/cancel', authenticate, requireAdmin, (req: AuthRequest, res) => cancelAcademyEvent(req, res));

export default router;
